import { useEffect, useState, useRef, useCallback } from "react";
import { mqttClient, TOPICS } from "@/lib/MqttClient";
import { Vehicle } from "@/components/MapContainer";

const MS_TO_KMH     = 3.6;
const MS_TO_MPH     = 2.23694;
const HISTORY_MAX   = 60;
const MIN_DIST_M    = 3.0;
const MIN_DIST_HEAD = 1.5;

export interface SpeedHistory {
  speedKmh:  number;
  speedMph:  number;
  speedMs:   number;
  timestamp: number;
}

export interface MqttStatus {
  connected:    boolean;
  reconnecting: boolean;
  error:        string | null;
  attempts:     number;
}

// ── ACS758 150A + Voltage Divider → V3 ───────────────────────────────────
export interface PowerData {
  current: number;  // A  — dari ACS758 150A (V3)
  voltage: number;  // V  — dari voltage divider (V2)
  watt:    number;  // W  — voltage × current
  mode:    string;  // IDLE | RENDAH | SEDANG | TINGGI | MAKS
}

const determinePowerMode = (current: number): string => {
  if (current <= 0.3)                    return "IDLE";
  if (current >  0.3 && current <  10)  return "RENDAH";
  if (current >= 10  && current <  50)  return "SEDANG";
  if (current >= 50  && current <  100) return "TINGGI";
  return "MAKS";
};
// ─────────────────────────────────────────────────────────────────────────

const haversineMeters = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R    = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calcBearing = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1    = toRad(lat1);
  const φ2    = toRad(lat2);
  const dλ    = toRad(lng2 - lng1);
  const x     = Math.sin(dλ) * Math.cos(φ2);
  const y     = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
};

const smoothHeading = (prev: number, next: number, alpha = 0.7): number => {
  let diff = next - prev;
  if (diff >  180) diff -= 360;
  if (diff < -180) diff += 360;
  return (prev + alpha * diff + 360) % 360;
};

export const getHeadingText = (h: number): string => {
  if (h >= 337.5 || h < 22.5) return "Utara ";
  if (h < 67.5)                return "Timur Laut ";
  if (h < 112.5)               return "Timur ";
  if (h < 157.5)               return "Tenggara ";
  if (h < 202.5)               return "Selatan ";
  if (h < 247.5)               return "Barat Daya ";
  if (h < 292.5)               return "Barat ";
  return                              "Barat Laut ";
};

export const getSpeedText = (speed: number): string => {
  if (speed <= 0)  return "Berhenti ";
  if (speed < 20)  return "Sangat Pelan ";
  if (speed < 40)  return "Pelan ";
  if (speed < 60)  return "Sedang ";
  if (speed < 100) return "Kencang ";
  return "Sangat Kencang ";
};

export const getLocationName = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "id", "User-Agent": "EC-Dashboard/1.0" } }
    );
    if (!res.ok) return "Gagal mendapat lokasi";
    const data = await res.json();
    return (
      data.address?.building      ||
      data.address?.amenity       ||
      data.address?.tourism       ||
      data.address?.leisure       ||
      data.address?.road          ||
      data.address?.neighbourhood ||
      data.address?.suburb        ||
      data.address?.city          ||
      data.display_name?.split(",")[0] ||
      "Lokasi tidak diketahui"
    );
  } catch {
    return "Gagal mendapat lokasi";
  }
};

export const useGPSTracking = () => {
  const [vehicle,          setVehicle]          = useState<Vehicle | null>(null);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [battery,          setBattery]          = useState<number | null>(null);
  const [locationName,     setLocationName]     = useState("Menunggu GPS...");
  const [speedKmh,         setSpeedKmh]         = useState(0);
  const [speedMph,         setSpeedMph]         = useState(0);
  const [speedMs,          setSpeedMs]          = useState(0);
  const [maxSpeedKmh,      setMaxSpeedKmh]      = useState(0);
  const [speedHistory,     setSpeedHistory]     = useState<SpeedHistory[]>([]);
  const [power,            setPower]            = useState<PowerData | null>(null);
  const [mqttStatus,       setMqttStatus]       = useState<MqttStatus>({
    connected:    mqttClient.connected,
    reconnecting: false,
    error:        null,
    attempts:     0,
  });

  const prevPosRef     = useRef<{ lat: number; lng: number; time: number; heading: number } | null>(null);
  const lastGeocodeRef = useRef<{ lat: number; lng: number } | null>(null);
  const mountedRef     = useRef(true);
  const voltageRef     = useRef<number>(0); // ← simpan voltage dari V2 untuk hitung watt

  useEffect(() => {
    mountedRef.current = true;

    const onConnect = () => {
      if (!mountedRef.current) return;
      setMqttStatus({ connected: true, reconnecting: false, error: null, attempts: 0 });
    };

    const onReconnect = () => {
      if (!mountedRef.current) return;
      setMqttStatus(prev => ({
        ...prev,
        connected:    false,
        reconnecting: true,
        attempts:     prev.attempts + 1,
      }));
    };

    const onOffline = () => {
      if (!mountedRef.current) return;
      setMqttStatus(prev => ({ ...prev, connected: false }));
      setIsTrackingActive(false);
    };

    const onClose = () => {
      if (!mountedRef.current) return;
      setMqttStatus(prev => ({ ...prev, connected: false }));
      setIsTrackingActive(false);
    };

    const onError = (err: Error) => {
      if (!mountedRef.current) return;
      console.error("❌ MQTT Error:", err.message);
      setMqttStatus(prev => ({ ...prev, error: err.message }));
    };

    const onMessage = (topic: string, message: Buffer) => {
      if (!mountedRef.current) return;
      try {

        // ── GPS → V1 ─────────────────────────────────────────
        if (topic === TOPICS.GPS) {
          const data = JSON.parse(message.toString());
          if (data.lat == null || data.lng == null) return;
          if (isNaN(data.lat) || isNaN(data.lng))   return;

          const now  = Date.now();
          const prev = prevPosRef.current;
          let ms     = 0;
          let heading = prev?.heading ?? 0;

          if (data.speed != null && !isNaN(data.speed)) {
            ms = Math.max(0, parseFloat(data.speed));
          } else if (prev) {
            const dtSec = (now - prev.time) / 1000;
            const distM = haversineMeters(prev.lat, prev.lng, data.lat, data.lng);
            if (distM >= MIN_DIST_M && dtSec > 0 && dtSec < 5) {
              ms = distM / dtSec;
            }
          }

          if (data.course != null && !isNaN(data.course) && data.course > 0) {
            heading = smoothHeading(heading, parseFloat(data.course), 0.7);
          } else if (prev && ms > 0.3) {
            const distM = haversineMeters(prev.lat, prev.lng, data.lat, data.lng);
            if (distM >= MIN_DIST_HEAD) {
              const rawBearing = calcBearing(prev.lat, prev.lng, data.lat, data.lng);
              heading = smoothHeading(heading, rawBearing, 0.7);
            }
          }

          prevPosRef.current = { lat: data.lat, lng: data.lng, time: now, heading };

          const kmh = parseFloat((ms * MS_TO_KMH).toFixed(2));
          const mph = parseFloat((ms * MS_TO_MPH).toFixed(2));

          setVehicle({ id: 1, lat: data.lat, lng: data.lng, heading, speed: kmh, label: "Electric Car" });
          setIsTrackingActive(true);
          setSpeedMs(ms);
          setSpeedKmh(kmh);
          setSpeedMph(mph);
          setMaxSpeedKmh(prev => Math.max(prev, kmh));
          setSpeedHistory(prev =>
            [...prev, { speedKmh: kmh, speedMph: mph, speedMs: ms, timestamp: now }]
              .slice(-HISTORY_MAX)
          );

          const last = lastGeocodeRef.current;
          if (!last || Math.abs(data.lat - last.lat) > 0.001 || Math.abs(data.lng - last.lng) > 0.0005) {
            lastGeocodeRef.current = { lat: data.lat, lng: data.lng };
            setLocationName("Mencari lokasi...");
            getLocationName(data.lat, data.lng).then(name => {
              if (mountedRef.current) setLocationName(name);
            });
          }
        }

        // ── Baterai → V2 ─────────────────────────────────────
        // payload: {"voltage":"50.34","percent":65,"cell_v":"3.356","status":"BAIK"}
        if (topic === TOPICS.BATTERY) {
          const raw = message.toString().trim();
          try {
            const parsed = JSON.parse(raw);
            setBattery(typeof parsed === "number" ? parsed : parsed.percent ?? null);

            // ← simpan voltage ke ref untuk hitung watt di V3
            const v = parseFloat(parsed.voltage);
            if (!isNaN(v) && v > 0) voltageRef.current = v;

          } catch {
            const val = parseFloat(raw);
            if (!isNaN(val)) setBattery(val);
          }
        }

        // ── ACS758 150A → V3 ─────────────────────────────────
        // payload: {"current":"15.30"}
        if (topic === TOPICS.VOTOL) {
          try {
            const parsed  = JSON.parse(message.toString().trim());
            const current = parseFloat(parsed.current) || 0;
            const voltage = voltageRef.current;                          // dari V2
            const watt    = parseFloat((voltage * current).toFixed(1)); // P = V × I
            const mode    = determinePowerMode(current);
            setPower({ current, voltage, watt, mode });
          } catch {
            console.error("❌ Format data ACS758 tidak valid");
          }
        }

      } catch (e) {
        console.error("❌ Format data tidak valid:", e);
      }
    };

    mqttClient.on("connect",   onConnect);
    mqttClient.on("reconnect", onReconnect);
    mqttClient.on("offline",   onOffline);
    mqttClient.on("close",     onClose);
    mqttClient.on("error",     onError);
    mqttClient.on("message",   onMessage);

    return () => {
      mountedRef.current = false;
      mqttClient.off("connect",   onConnect);
      mqttClient.off("reconnect", onReconnect);
      mqttClient.off("offline",   onOffline);
      mqttClient.off("close",     onClose);
      mqttClient.off("error",     onError);
      mqttClient.off("message",   onMessage);
    };
  }, []);

  const manualReconnect = useCallback(() => {
    mqttClient.reconnect();
  }, []);

  const resetSpeedStats = useCallback(() => {
    setMaxSpeedKmh(0);
    setSpeedHistory([]);
  }, []);

  return {
    vehicle,
    isConnected:     mqttStatus.connected,
    mqttStatus,
    isTrackingActive,
    battery,
    locationName,
    speedKmh,
    speedMph,
    speedMs,
    maxSpeedKmh,
    speedHistory,
    resetSpeedStats,
    manualReconnect,
    power, // { current, voltage, watt, mode }
  };
};