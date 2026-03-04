import { useEffect, useState, useRef } from "react";
import mqtt from "mqtt";
import { Vehicle } from "@/components/MapContainer";

// ── MQTT Config ───────────────────────────────────────────────────────────────
const BROKER_URL    = "wss://broker.hivemq.com:8884/mqtt";
const TOPIC_GPS     = "agv/raenaldiAS/vpin/V1"; // { lat, lng } — hanya koordinat
const TOPIC_BATTERY = "agv/raenaldiAS/vpin/V2"; // angka volt (voltage divider)

// ── Constants ─────────────────────────────────────────────────────────────────
const MS_TO_KMH   = 3.6;
const MS_TO_MPH   = 2.23694;
const HISTORY_MAX = 60;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SpeedHistory {
  speedKmh:  number;
  speedMph:  number;
  speedMs:   number;
  timestamp: number;
}

// ── Helper: Jarak dua koordinat dalam meter (Haversine) ───────────────────────
const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
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

// ── Helper: Heading dari 2 koordinat (0 = Utara) ─────────────────────────────
const calcHeading = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const dLng = lng2 - lng1;
  const dLat = lat2 - lat1;
  return (Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360;
};

// ── Helper: Arah heading → teks ───────────────────────────────────────────────
export const getHeadingText = (heading: number): string => {
  if (heading >= 337.5 || heading < 22.5)  return "Utara ⬆️";
  if (heading >= 22.5  && heading < 67.5)  return "Timur Laut ↗️";
  if (heading >= 67.5  && heading < 112.5) return "Timur ➡️";
  if (heading >= 112.5 && heading < 157.5) return "Tenggara ↘️";
  if (heading >= 157.5 && heading < 202.5) return "Selatan ⬇️";
  if (heading >= 202.5 && heading < 247.5) return "Barat Daya ↙️";
  if (heading >= 247.5 && heading < 292.5) return "Barat ⬅️";
  if (heading >= 292.5 && heading < 337.5) return "Barat Laut ↖️";
  return "Utara ⬆️";
};

// ── Helper: Speed → teks ──────────────────────────────────────────────────────
export const getSpeedText = (speed: number): string => {
  if (speed <= 0) return "Berhenti 🛑";
  if (speed < 5)  return "Sangat Pelan 🐢";
  if (speed < 15) return "Pelan 🚶";
  if (speed < 30) return "Sedang 🚗";
  return "Cepat 🚀";
};

// ── Helper: Koordinat → Nama Lokasi (Reverse Geocoding) ───────────────────────
export const getLocationName = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          "Accept-Language": "id",
          "User-Agent":      "AGV-Dashboard/1.0",
        },
      }
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

// ── Main Hook ─────────────────────────────────────────────────────────────────
export const useGPSTracking = () => {
  const [vehicle,          setVehicle]          = useState<Vehicle | null>(null);
  const [isConnected,      setIsConnected]      = useState(false);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [battery,          setBattery]          = useState<number | null>(null);
  const [locationName,     setLocationName]     = useState<string>("Menunggu GPS...");

  const [speedKmh,     setSpeedKmh]     = useState<number>(0);
  const [speedMph,     setSpeedMph]     = useState<number>(0);
  const [speedMs,      setSpeedMs]      = useState<number>(0);
  const [maxSpeedKmh,  setMaxSpeedKmh]  = useState<number>(0);
  const [speedHistory, setSpeedHistory] = useState<SpeedHistory[]>([]);

  // Posisi & waktu terakhir untuk hitung kecepatan
  const prevPosRef     = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const lastGeocodeRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, {
      clientId:        `agv_${Math.random().toString(16).slice(2, 8)}`,
      clean:           true,
      connectTimeout:  8000,
      reconnectPeriod: 3000,
      keepalive:       30,
      protocolVersion: 4,
    });

    client.on("connect", () => {
      setIsConnected(true);
      client.subscribe(TOPIC_GPS,     { qos: 0 });
      client.subscribe(TOPIC_BATTERY, { qos: 0 });
    });

    client.on("message", (topic, message) => {
      try {
        // ── V1: GPS ──────────────────────────────────────────────────────────
        if (topic === TOPIC_GPS) {
          const data = JSON.parse(message.toString());

          // Guard: pastikan lat & lng valid
          if (data.lat == null || data.lng == null) return;
          if (isNaN(data.lat) || isNaN(data.lng))   return;

          const now = Date.now();

          // ── Hitung kecepatan dari delta posisi + delta waktu ──────────────
          let ms      = 0;
          let heading = 0;

          if (prevPosRef.current) {
            const dtSec = (now - prevPosRef.current.time) / 1000;
            const distM = haversineMeters(
              prevPosRef.current.lat, prevPosRef.current.lng,
              data.lat, data.lng
            );
            ms      = dtSec > 0 ? distM / dtSec : 0;
            heading = calcHeading(
              prevPosRef.current.lat, prevPosRef.current.lng,
              data.lat, data.lng
            );
          }

          prevPosRef.current = { lat: data.lat, lng: data.lng, time: now };

          const kmh = parseFloat((ms * MS_TO_KMH).toFixed(2));
          const mph = parseFloat((ms * MS_TO_MPH).toFixed(2));

          // ── Update vehicle ────────────────────────────────────────────────
          setVehicle({
            id:      1,
            lat:     data.lat,
            lng:     data.lng,
            heading,           // dihitung dari delta posisi
            speed:   kmh,      // km/h, untuk popup peta
            label:   "AGV 1",
          });

          setIsTrackingActive(true);
          setSpeedMs(ms);
          setSpeedKmh(kmh);
          setSpeedMph(mph);
          setMaxSpeedKmh(prev => Math.max(prev, kmh));
          setSpeedHistory(prev =>
            [...prev, { speedKmh: kmh, speedMph: mph, speedMs: ms, timestamp: now }]
              .slice(-HISTORY_MAX)
          );

          // ── Reverse geocoding (hanya jika pindah > ~55m) ─────────────────
          const last        = lastGeocodeRef.current;
          const shouldUpdate =
            !last ||
            Math.abs(data.lat - last.lat) > 0.0005 ||
            Math.abs(data.lng - last.lng) > 0.0005;

          if (shouldUpdate) {
            lastGeocodeRef.current = { lat: data.lat, lng: data.lng };
            setLocationName("Mencari lokasi...");
            getLocationName(data.lat, data.lng).then(setLocationName);
          }
        }

        // ── V2: Battery (Voltage Divider) ────────────────────────────────────
        if (topic === TOPIC_BATTERY) {
          const raw = message.toString().trim();
          try {
            const parsed = JSON.parse(raw);
            setBattery(typeof parsed === "number" ? parsed : parsed.battery ?? null);
          } catch {
            const val = parseFloat(raw);
            if (!isNaN(val)) setBattery(val);
          }
        }
      } catch (e) {
        console.error("❌ Format data tidak valid:", e);
      }
    });

    client.on("disconnect", () => { setIsConnected(false); setIsTrackingActive(false); });
    client.on("offline",    () => { setIsConnected(false); });
    client.on("error",      (err) => { console.error("❌ MQTT Error:", err.message); });

    return () => { client.end(); };
  }, []);

  const resetSpeedStats = () => {
    setMaxSpeedKmh(0);
    setSpeedHistory([]);
  };

  return {
    vehicle,
    isConnected,
    isTrackingActive,
    battery,
    locationName,
    speedKmh,
    speedMph,
    speedMs,
    maxSpeedKmh,
    speedHistory,
    resetSpeedStats,
  };
};