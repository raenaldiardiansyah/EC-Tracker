/**
 * MQTT SIMULATOR — TESTING ONLY
 * Hapus file ini setelah ESP32 siap.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import mqtt, { MqttClient } from "mqtt";
import { ThemeToggle } from "@/components/ThemeToggle";
import MapContainer from "@/components/MapContainer";
import type { Vehicle } from "@/components/MapContainer";
import {
  Navigation, Wifi, WifiOff, Radio, TriangleAlert,
  Play, Square, Gauge, Battery, BatteryFull, BatteryLow, BatteryMedium,
  MapPin, ChevronDown, ChevronUp,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURASI — harus sama dengan useGPSTracking.ts
// ─────────────────────────────────────────────────────────────────────────────
const BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";
const TOPIC_GPS  = "agv/raenaldiAS/vpin/V1";
const TOPIC_BATT = "agv/raenaldiAS/vpin/V2";
const TICK_MS    = 1000; // 1Hz — seperti GPS module NEO-6M

// ─────────────────────────────────────────────────────────────────────────────
// RUTE — area Telkom University Bandung
// ─────────────────────────────────────────────────────────────────────────────
const ROUTE = [
  { lat: -6.9735, lng: 107.6301 },
  { lat: -6.9728, lng: 107.6312 },
  { lat: -6.9720, lng: 107.6325 },
  { lat: -6.9715, lng: 107.6340 },
  { lat: -6.9722, lng: 107.6355 },
  { lat: -6.9735, lng: 107.6360 },
  { lat: -6.9748, lng: 107.6352 },
  { lat: -6.9755, lng: 107.6338 },
  { lat: -6.9750, lng: 107.6320 },
  { lat: -6.9742, lng: 107.6308 },
];

const MS_TO_KMH = 3.6;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type LogType    = "info" | "gps" | "battery" | "error" | "system";
type MqttStatus = "connecting" | "connected" | "error";

interface LogEntry {
  time:    string;
  message: string;
  type:    LogType;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
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

const calcHeading = (lat1: number, lng1: number, lat2: number, lng2: number): number =>
  (Math.atan2(lng2 - lng1, lat2 - lat1) * 180 / Math.PI + 360) % 360;

const getLocationName = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "id", "User-Agent": "AGV-Simulator/1.0" } }
    );
    const d = await res.json();
    return (
      d.address?.building      ||
      d.address?.amenity       ||
      d.address?.tourism       ||
      d.address?.leisure       ||
      d.address?.road          ||
      d.address?.neighbourhood ||
      d.address?.suburb        ||
      d.address?.city          ||
      d.display_name?.split(",")[0] ||
      "Lokasi tidak diketahui"
    );
  } catch { return "Gagal mendapat lokasi"; }
};

const getBatteryIcon  = (v: number) => v > 11 ? BatteryFull : v > 10 ? BatteryMedium : BatteryLow;
const getBatteryColor = (v: number) => v > 11 ? "#16a34a" : v > 10 ? "#ca8a04" : "#dc2626";
const getBatteryText  = (v: number) => v > 11 ? "Normal" : v > 10 ? "Lemah" : "Kritis!";

const getLogColor = (type: LogType): string => {
  if (type === "gps")     return "text-green-400";
  if (type === "battery") return "text-yellow-400";
  if (type === "error")   return "text-red-400";
  if (type === "system")  return "text-cyan-400";
  return "text-blue-400";
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const MQTTSimulator = () => {
  const [mqttStatus,    setMqttStatus]    = useState<MqttStatus>("connecting");
  const [isRunning,     setIsRunning]     = useState(false);
  const [simSpeed,      setSimSpeed]      = useState(2);
  const [battery,       setBattery]       = useState(12.3);
  const [publishCount,  setPublishCount]  = useState(0);
  const [locationName,  setLocationName]  = useState("Menunggu GPS...");
  const [vehicle,       setVehicle]       = useState<Vehicle | null>(null);
  const [logs,          setLogs]          = useState<LogEntry[]>([]);
  const [showLogs,      setShowLogs]      = useState(true);
  const [activeTab,     setActiveTab]     = useState<"map" | "control">("map");

  const clientRef   = useRef<MqttClient | null>(null);
  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeRef    = useRef({ idx: 0, progress: 0 });
  const prevPosRef  = useRef({ lat: ROUTE[0].lat, lng: ROUTE[0].lng, time: Date.now() });
  const geocodeRef  = useRef<{ lat: number; lng: number } | null>(null);
  const logEndRef   = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogType) => {
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs(prev => [...prev.slice(-150), { time, message, type }]);
  }, []);

  useEffect(() => {
    if (showLogs) logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, showLogs]);

  // ── Koneksi MQTT ──────────────────────────────────────────────────────────
  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, {
      clientId:        `agv_sim_${Math.random().toString(16).slice(2, 8)}`,
      clean:           true,
      connectTimeout:  8000,
      reconnectPeriod: 3000,
      keepalive:       30,
      protocolVersion: 4,
    });

    client.on("connect",   ()    => { setMqttStatus("connected");  addLog("[MQTT] Terhubung ke broker.hivemq.com", "system"); });
    client.on("error",     (err) => { setMqttStatus("error");      addLog(`[MQTT] Error: ${err.message}`, "error"); });
    client.on("offline",   ()    => { setMqttStatus("error");      addLog("[MQTT] Offline...", "error"); });
    client.on("reconnect", ()    => { setMqttStatus("connecting"); addLog("[MQTT] Reconnecting...", "info"); });

    clientRef.current = client;
    return () => { client.end(); clientRef.current = null; };
  }, [addLog]);

  // ── Publish ───────────────────────────────────────────────────────────────
  const publish = useCallback((topic: string, payload: string, type: LogType) => {
    const client = clientRef.current;
    if (!client?.connected) return;
    client.publish(topic, payload, { qos: 0, retain: false }, (err) => {
      if (!err) {
        setPublishCount(c => c + 1);
        // Log GPS pakai nama lokasi, bukan angka
        if (type === "gps") return; // log GPS ditangani di tick (pakai locationName)
        addLog(`[${topic === TOPIC_BATT ? "V2" : "V1"}] ${payload}`, type);
      } else {
        addLog(`[ERROR] ${err.message}`, "error");
      }
    });
  }, [addLog]);

  // ── Tick simulasi ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }

    tickRef.current = setInterval(() => {
      const { idx, progress } = routeRef.current;
      const curr    = ROUTE[idx];
      const next    = ROUTE[(idx + 1) % ROUTE.length];
      const segDist = haversineMeters(curr.lat, curr.lng, next.lat, next.lng);
      const step    = simSpeed / (segDist || 1);
      const newProg = progress + step;

      let newIdx = idx, finalProg = newProg;
      if (newProg >= 1) { newIdx = (idx + 1) % ROUTE.length; finalProg = 0; }
      routeRef.current = { idx: newIdx, progress: finalProg };

      const from    = ROUTE[newIdx];
      const to      = ROUTE[(newIdx + 1) % ROUTE.length];
      const newLat  = lerp(from.lat, to.lat, finalProg);
      const newLng  = lerp(from.lng, to.lng, finalProg);

      // Hitung heading dari perpindahan
      const heading = calcHeading(prevPosRef.current.lat, prevPosRef.current.lng, newLat, newLng);
      const speedKmh = parseFloat((simSpeed * MS_TO_KMH).toFixed(1));

      prevPosRef.current = { lat: newLat, lng: newLng, time: Date.now() };

      // Update vehicle untuk peta
      setVehicle({
        id:      1,
        lat:     newLat,
        lng:     newLng,
        heading,
        speed:   speedKmh,
        label:   "AGV 1 (SIM)",
      });

      // Reverse geocoding → tampilkan nama di log, bukan angka
      const lastGeo   = geocodeRef.current;
      const shouldGeo = !lastGeo ||
        Math.abs(newLat - lastGeo.lat) > 0.0005 ||
        Math.abs(newLng - lastGeo.lng) > 0.0005;

      if (shouldGeo) {
        geocodeRef.current = { lat: newLat, lng: newLng };
        setLocationName("Mencari lokasi...");
        getLocationName(newLat, newLng).then(name => {
          setLocationName(name);
          // Log pakai nama lokasi — bukan koordinat angka
          addLog(`[GPS] ${name} | ${speedKmh} km/h | ${heading.toFixed(0)}°`, "gps");
        });
      } else {
        // Log tetap pakai nama yang sudah ada
        addLog(`[GPS] ${locationName} | ${speedKmh} km/h`, "gps");
      }

      // Publish V1 ke MQTT
      const gpsPayload = JSON.stringify({
        lat: parseFloat(newLat.toFixed(7)),
        lng: parseFloat(newLng.toFixed(7)),
      });
      publish(TOPIC_GPS, gpsPayload, "gps");

      // Publish V2 setiap ~5 detik
      if (Math.random() < 0.2) {
        setBattery(b => {
          const next = parseFloat(Math.max(9, b - 0.005).toFixed(3));
          publish(TOPIC_BATT, String(next), "battery");
          addLog(`[BATT] ${next} V — ${getBatteryText(next)}`, "battery");
          return next;
        });
      }
    }, TICK_MS);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [isRunning, simSpeed, publish, addLog, locationName]);

  const BattIcon  = getBatteryIcon(battery);
  const battColor = getBatteryColor(battery);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">MQTT Simulator</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">testing only</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            mqttStatus === "connected"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : mqttStatus === "connecting"
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {mqttStatus === "connected"  ? <><Wifi    className="w-3 h-3" /> Online</> :
             mqttStatus === "connecting" ? <><Wifi    className="w-3 h-3 animate-pulse" /> Connecting...</> :
                                          <><WifiOff className="w-3 h-3" /> Error</>}
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 shrink-0">
        <TriangleAlert className="w-3 h-3 text-yellow-500 shrink-0" />
        <span className="text-xs text-yellow-600 dark:text-yellow-400">
          Hapus file ini setelah ESP32 siap. Buka dashboard di tab lain untuk cek hasil.
        </span>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-card border-b shrink-0">
        <button
          onClick={() => setActiveTab("map")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "map"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Peta AGV
        </button>
        <button
          onClick={() => setActiveTab("control")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "control"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Gauge className="w-4 h-4" />
          Kontrol
          {publishCount > 0 && (
            <span className="text-xs bg-cyan-500 text-slate-900 font-bold px-1.5 py-0.5 rounded-full">
              {publishCount}
            </span>
          )}
        </button>
      </div>

      {/* Konten tab */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* TAB PETA */}
        {activeTab === "map" && (
          <div className="relative h-full">
            <MapContainer
              vehicles={vehicle ? [vehicle] : []}
              isTrackingActive={isRunning}
            />

            {/* Lokasi overlay */}
            {vehicle && (
              <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
                <div className="bg-card/95 backdrop-blur-sm border rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-medium truncate">{locationName}</span>
                </div>
              </div>
            )}

            {/* Menunggu */}
            {!vehicle && (
              <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                <div className="bg-card/90 backdrop-blur-sm border rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-muted-foreground animate-pulse" />
                  <div>
                    <p className="text-xs font-semibold">Tekan Start Publish</p>
                    <p className="text-xs text-muted-foreground">
                      {mqttStatus === "connected" ? "Broker terhubung ✓" : "Menunggu broker..."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB KONTROL */}
        {activeTab === "control" && (
          <div className="h-full overflow-y-auto px-4 py-4 space-y-3">

            {/* Start / Stop */}
            <button
              onClick={() => setIsRunning(r => !r)}
              disabled={mqttStatus !== "connected"}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                mqttStatus !== "connected"
                  ? "opacity-40 cursor-not-allowed bg-muted text-muted-foreground"
                  : isRunning
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                  : "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
              }`}
            >
              {isRunning
                ? <><Square className="w-4 h-4" /> Stop Publish</>
                : <><Play   className="w-4 h-4" /> Start Publish</>
              }
            </button>

            {mqttStatus !== "connected" && (
              <p className="text-xs text-center text-muted-foreground">
                Menunggu koneksi ke broker...
              </p>
            )}

            {/* Slider kecepatan */}
            <div className="bg-card border rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-semibold">Kecepatan AGV</span>
                </div>
                <span className="text-xs font-bold text-cyan-500">
                  {simSpeed} m/s · {(simSpeed * MS_TO_KMH).toFixed(1)} km/h
                </span>
              </div>
              <input
                type="range" min="0" max="10" step="0.5" value={simSpeed}
                onChange={e => setSimSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>🛑 0</span><span>🐢 2</span><span>🚗 5</span><span>🚀 10</span>
              </div>
            </div>

            {/* Info 3 kolom */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1 bg-muted/40 rounded-xl p-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Lokasi</span>
                <span className="text-xs font-semibold text-center leading-tight line-clamp-2">
                  {locationName}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-muted/40 rounded-xl p-2">
                <BattIcon className="w-4 h-4" style={{ color: battColor }} />
                <span className="text-xs text-muted-foreground">Baterai</span>
                <span className="text-xs font-bold" style={{ color: battColor }}>
                  {battery.toFixed(2)} V
                </span>
                <span className="text-xs" style={{ color: battColor }}>
                  {getBatteryText(battery)}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-muted/40 rounded-xl p-2">
                <Radio className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Published</span>
                <span className="text-xs font-bold text-primary">{publishCount}x</span>
              </div>
            </div>

            {/* Topic info */}
            <div className="bg-card border rounded-xl px-4 py-3 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Topic MQTT
              </span>
              <div className="font-mono text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">V1</span>
                  <span className="text-muted-foreground truncate">{TOPIC_GPS}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">V2</span>
                  <span className="text-muted-foreground truncate">{TOPIC_BATT}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Baterai bar */}
      <div className="px-3 py-2 bg-card border-t shrink-0">
        <div className="flex items-center gap-3">
          <BattIcon className="w-5 h-5 shrink-0" style={{ color: battColor }} />
          <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(((battery - 9) / (12.6 - 9)) * 100, 100)}%`,
                background: battColor,
              }}
            />
          </div>
          <span className="text-xs font-bold shrink-0" style={{ color: battColor }}>
            {battery.toFixed(2)} V
          </span>
        </div>
      </div>

      {/* Serial Monitor */}
      <div className="bg-card border-t shrink-0">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold font-mono"
        >
          <span>Serial Monitor</span>
          <div className="flex items-center gap-2">
            {showLogs && (
              <button
                onClick={(e) => { e.stopPropagation(); setLogs([]); }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2"
              >
                Clear
              </button>
            )}
            <span className="text-xs text-muted-foreground">{logs.length} baris</span>
            {showLogs ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>

        {showLogs && (
          <div className="h-40 overflow-y-auto px-3 pb-3 font-mono text-xs bg-black/90 space-y-1">
            {logs.length === 0 && <p className="text-gray-500 pt-2">Menunggu data...</p>}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 leading-relaxed">
                <span className="text-gray-500 shrink-0">{log.time}</span>
                <span className={getLogColor(log.type)}>{log.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MQTTSimulator;