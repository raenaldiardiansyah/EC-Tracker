/**
 * MQTT SIMULATOR — TESTING ONLY
 * Hapus file ini setelah ESP32 siap.
 * Payload baterai: {"voltage":"50.34","percent":65,"cell_v":"3.356","status":"BAIK"}
 * Payload ACS758 V3: {"current":"15.30"}
 */

import { useState, useEffect, useRef, useCallback } from "react";
import mqtt, { MqttClient } from "mqtt";
import { ThemeToggle } from "@/components/ThemeToggle";
import MapContainer from "@/components/MapContainer";
import type { Vehicle } from "@/components/MapContainer";
import {
  Navigation, Wifi, WifiOff, Radio, TriangleAlert,
  Play, Square, Gauge, Battery, BatteryFull, BatteryLow, BatteryMedium,
  MapPin, ChevronDown, ChevronUp, Activity, Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURASI
// ─────────────────────────────────────────────────────────────────────────────
const BROKER_URL  = "wss://broker.emqx.io:8084/mqtt";
const TOPIC_GPS   = "EC/ElectricCar/vpin/V1";
const TOPIC_BATT  = "EC/ElectricCar/vpin/V2";
const TOPIC_ACS   = "EC/ElectricCar/vpin/V3"; // ← ACS758 150A
const TICK_MS     = 1000;

// ─────────────────────────────────────────────────────────────────────────────
// BATERAI LiFePO4 48V 15S
// ─────────────────────────────────────────────────────────────────────────────
const VBATT_MAX = 54.75;
const VBATT_MIN = 42.00;
const CELLS     = 15;

const voltToPercent = (v: number): number => {
  if (v >= VBATT_MAX) return 100;
  if (v <= VBATT_MIN) return 0;
  return Math.round((v - VBATT_MIN) / (VBATT_MAX - VBATT_MIN) * 100);
};

const voltToStatus = (v: number): string => {
  if (v >= 53.00) return "PENUH";
  if (v >= 48.00) return "BAIK";
  if (v >= 45.00) return "SEDANG";
  if (v >= 42.00) return "RENDAH";
  return "KRITIS";
};

// ─────────────────────────────────────────────────────────────────────────────
// RUTE — Telkom University Bandung
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
// ACS758 — simulasi arus berdasarkan kecepatan
// ─────────────────────────────────────────────────────────────────────────────
const simCurrent = (speedMs: number): number => {
  let current = 1.5;
  if (speedMs <= 0)     current = 1.5;
  else if (speedMs < 2) current = 5  + speedMs * 3;
  else if (speedMs < 6) current = 15 + speedMs * 4;
  else                  current = 40 + speedMs * 5;

  // noise realistis
  current = parseFloat((current + (Math.random() - 0.5) * 2).toFixed(1));
  return Math.max(0, current);
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type LogType    = "info" | "gps" | "battery" | "error" | "system" | "acs";
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
      { headers: { "Accept-Language": "id", "User-Agent": "EC-Simulator/1.0" } }
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

const getBatteryIcon  = (pct: number) => pct > 50 ? BatteryFull : pct > 20 ? BatteryMedium : BatteryLow;
const getBatteryColor = (pct: number) => pct > 50 ? "#22d3ee"  : pct > 20 ? "#f59e0b"     : "#ef4444";
const getBatteryText  = (pct: number) => pct > 50 ? "Normal"   : pct > 20 ? "Sedang"      : "Kritis!";

const getLogColor = (type: LogType): string => {
  if (type === "gps")     return "text-emerald-400";
  if (type === "battery") return "text-amber-400";
  if (type === "error")   return "text-red-400";
  if (type === "system")  return "text-cyan-400";
  if (type === "acs")     return "text-orange-400";
  return "text-blue-400";
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const MQTTSimulator = () => {
  const [mqttStatus,   setMqttStatus]   = useState<MqttStatus>("connecting");
  const [isRunning,    setIsRunning]    = useState(false);
  const [simSpeed,     setSimSpeed]     = useState(2);

  const [battVolt,     setBattVolt]     = useState(50.40);
  const battPct   = voltToPercent(battVolt);
  const battColor = getBatteryColor(battPct);
  const BattIcon  = getBatteryIcon(battPct);

  // arus terakhir untuk ditampilkan di UI
  const [lastCurrent,  setLastCurrent]  = useState(0);

  const [publishCount, setPublishCount] = useState(0);
  const [locationName, setLocationName] = useState("Menunggu GPS...");
  const [vehicle,      setVehicle]      = useState<Vehicle | null>(null);
  const [logs,         setLogs]         = useState<LogEntry[]>([]);
  const [showLogs,     setShowLogs]     = useState(true);
  const [activeTab,    setActiveTab]    = useState<"map" | "control">("map");

  const clientRef  = useRef<MqttClient | null>(null);
  const tickRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeRef   = useRef({ idx: 0, progress: 0 });
  const prevPosRef = useRef({ lat: ROUTE[0].lat, lng: ROUTE[0].lng, time: Date.now() });
  const geocodeRef = useRef<{ lat: number; lng: number } | null>(null);
  const logEndRef  = useRef<HTMLDivElement>(null);

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
      clientId:        `ec_sim_${Math.random().toString(16).slice(2, 8)}`,
      clean:           true,
      connectTimeout:  8000,
      reconnectPeriod: 3000,
      keepalive:       30,
      protocolVersion: 4,
    });

    client.on("connect",   ()    => { setMqttStatus("connected");  addLog("[MQTT] Terhubung ke broker.emqx.io", "system"); });
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
        const label = topic === TOPIC_BATT ? "V2" : topic === TOPIC_ACS ? "V3" : "V1";
        addLog(`[${label}] ${payload}`, type);
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

      const from   = ROUTE[newIdx];
      const to     = ROUTE[(newIdx + 1) % ROUTE.length];
      const newLat = lerp(from.lat, to.lat, finalProg);
      const newLng = lerp(from.lng, to.lng, finalProg);

      const heading  = calcHeading(prevPosRef.current.lat, prevPosRef.current.lng, newLat, newLng);
      const speedKmh = parseFloat((simSpeed * MS_TO_KMH).toFixed(1));
      const speedMs  = simSpeed;

      prevPosRef.current = { lat: newLat, lng: newLng, time: Date.now() };
      setVehicle({ id: 1, lat: newLat, lng: newLng, heading, speed: speedKmh, label: "EC SIM" });

      // Reverse geocoding
      const lastGeo   = geocodeRef.current;
      const shouldGeo = !lastGeo ||
        Math.abs(newLat - lastGeo.lat) > 0.0005 ||
        Math.abs(newLng - lastGeo.lng) > 0.0005;

      if (shouldGeo) {
        geocodeRef.current = { lat: newLat, lng: newLng };
        setLocationName("Mencari lokasi...");
        getLocationName(newLat, newLng).then(name => {
          setLocationName(name);
          addLog(`[GPS] ${name} | ${speedKmh} km/h | ${heading.toFixed(0)}°`, "gps");
        });
      } else {
        addLog(`[GPS] ${locationName} | ${speedKmh} km/h`, "gps");
      }

      // Publish V1 — GPS
      publish(TOPIC_GPS, JSON.stringify({
        lat:    parseFloat(newLat.toFixed(7)),
        lng:    parseFloat(newLng.toFixed(7)),
        speed:  parseFloat(speedMs.toFixed(3)),
        course: parseFloat(heading.toFixed(2)),
      }), "gps");

      // Publish V2 — Baterai setiap ~5 detik (20% chance per tick)
      if (Math.random() < 0.2) {
        setBattVolt(prev => {
          const newVolt = parseFloat(Math.max(VBATT_MIN, prev - 0.02).toFixed(3));
          const pct     = voltToPercent(newVolt);
          const cellV   = parseFloat((newVolt / CELLS).toFixed(3));
          const status  = voltToStatus(newVolt);

          publish(TOPIC_BATT, JSON.stringify({
            voltage: newVolt.toFixed(2),
            percent: pct,
            cell_v:  cellV.toFixed(3),
            status,
          }), "battery");
          addLog(`[BATT] ${newVolt.toFixed(2)}V | ${pct}% | ${status}${pct <= 20 ? " ⚠" : ""}`, "battery");
          return newVolt;
        });
      }

      // Publish V3 — ACS758 (setiap tick, hanya current)
      const current = simCurrent(speedMs);
      setLastCurrent(current);

      publish(TOPIC_ACS, JSON.stringify({
        current: current.toFixed(2),
      }), "acs");
      addLog(`[V3] ACS758 | ${current.toFixed(1)} A`, "acs");

    }, TICK_MS);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [isRunning, simSpeed, publish, addLog, locationName]);

  return (
    <div className="flex flex-col h-screen bg-[#080c14] overflow-hidden" style={{ fontFamily: "'DM Mono', 'IBM Plex Mono', monospace" }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0d1220] border-b border-cyan-900/40 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-cyan-500" />
          <span className="font-bold text-xs tracking-widest text-cyan-300 uppercase">MQTT Simulator</span>
          <span className="text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded-sm tracking-wider">testing only</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm border tracking-wider ${
            mqttStatus === "connected"
              ? "bg-cyan-950/60 border-cyan-700/50 text-cyan-400"
              : mqttStatus === "connecting"
              ? "bg-yellow-950/60 border-yellow-700/50 text-yellow-400"
              : "bg-red-950/60 border-red-700/50 text-red-400"
          }`}>
            {mqttStatus === "connected"  ? <><Wifi    className="w-2.5 h-2.5" /> ONLINE</>      :
             mqttStatus === "connecting" ? <><Wifi    className="w-2.5 h-2.5 animate-pulse" /> CONNECTING...</> :
                                          <><WifiOff className="w-2.5 h-2.5" /> ERROR</>}
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* ── WARNING ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-950/40 border-b border-yellow-700/30 shrink-0">
        <TriangleAlert className="w-3 h-3 text-yellow-500 shrink-0" />
        <span className="text-[10px] text-yellow-500/80 tracking-wide">
          Hapus file ini setelah ESP32 siap. Buka dashboard di tab lain untuk cek hasil.
        </span>
      </div>

      {/* ── TABS ───────────────────────────────────────────────────────────── */}
      <div className="flex bg-[#0d1220] border-b border-cyan-900/40 shrink-0">
        <button
          onClick={() => setActiveTab("map")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold tracking-widest uppercase transition-all border-b-2 ${
            activeTab === "map"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/30"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <MapPin className="w-3 h-3" /> Peta
        </button>
        <button
          onClick={() => setActiveTab("control")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold tracking-widest uppercase transition-all border-b-2 ${
            activeTab === "control"
              ? "border-amber-400 text-amber-400 bg-amber-950/20"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <Gauge className="w-3 h-3" /> Kontrol
          {publishCount > 0 && (
            <span className="text-[9px] bg-amber-500 text-slate-900 font-black px-1.5 py-0.5 rounded-sm">
              {publishCount}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB CONTENT ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {activeTab === "map" && (
          <div className="relative h-full">
            <MapContainer vehicles={vehicle ? [vehicle] : []} isTrackingActive={isRunning} />
            {vehicle && (
              <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
                <div className="bg-[#0d1220]/95 backdrop-blur-sm border border-cyan-900/60 rounded-sm px-3 py-2 shadow-xl flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span className="text-xs font-bold text-cyan-200 tracking-wide truncate">{locationName}</span>
                </div>
              </div>
            )}
            {!vehicle && (
              <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                <div className="bg-[#0d1220]/90 backdrop-blur-sm border border-cyan-900/40 rounded-sm px-3 py-2 shadow-lg flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-cyan-300 tracking-wide">Tekan Start Publish</p>
                    <p className="text-[10px] text-slate-500">
                      {mqttStatus === "connected" ? "Broker terhubung ✓" : "Menunggu broker..."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "control" && (
          <div className="h-full overflow-y-auto px-4 py-4 space-y-3">

            {/* Start / Stop */}
            <button
              onClick={() => setIsRunning(r => !r)}
              disabled={mqttStatus !== "connected"}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-sm font-bold text-sm tracking-widest uppercase transition-all ${
                mqttStatus !== "connected"
                  ? "opacity-40 cursor-not-allowed bg-slate-800 text-slate-500"
                  : isRunning
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                  : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-500/20"
              }`}
            >
              {isRunning
                ? <><Square className="w-4 h-4" /> Stop Publish</>
                : <><Play   className="w-4 h-4" /> Start Publish</>
              }
            </button>

            {mqttStatus !== "connected" && (
              <p className="text-[10px] text-center text-slate-600 tracking-wider">
                Menunggu koneksi ke broker...
              </p>
            )}

            {/* Slider kecepatan */}
            <div className="bg-[#0d1220] border border-cyan-900/40 rounded-sm px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-slate-300 tracking-widest uppercase">Kecepatan</span>
                </div>
                <span className="text-xs font-bold text-amber-400">
                  {simSpeed} m/s · {(simSpeed * MS_TO_KMH).toFixed(1)} km/h
                </span>
              </div>
              <input
                type="range" min="0" max="10" step="0.5" value={simSpeed}
                onChange={e => setSimSpeed(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>🛑 0</span><span>🐢 2</span><span>🚗 5</span><span>🚀 10</span>
              </div>
            </div>

            {/* Info 4 kolom */}
            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center gap-1 bg-[#0d1220] border border-cyan-900/30 rounded-sm p-2">
                <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-[8px] text-slate-600 uppercase tracking-widest">Lokasi</span>
                <span className="text-[9px] font-bold text-cyan-200 text-center leading-tight line-clamp-2">
                  {locationName}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-[#0d1220] border border-cyan-900/30 rounded-sm p-2">
                <BattIcon className="w-3.5 h-3.5" style={{ color: battColor }} />
                <span className="text-[8px] text-slate-600 uppercase tracking-widest">Baterai</span>
                <span className="text-[9px] font-bold" style={{ color: battColor }}>{battPct}%</span>
                <span className="text-[8px]" style={{ color: battColor }}>{battVolt.toFixed(1)}V</span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-[#0d1220] border border-orange-900/30 rounded-sm p-2">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[8px] text-slate-600 uppercase tracking-widest">ACS758</span>
                <span className="text-[9px] font-bold text-orange-400">
                  {isRunning ? `${lastCurrent.toFixed(1)} A` : "-- A"}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-[#0d1220] border border-cyan-900/30 rounded-sm p-2">
                <Radio className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-[8px] text-slate-600 uppercase tracking-widest">Publish</span>
                <span className="text-[9px] font-bold text-cyan-400">{publishCount}x</span>
              </div>
            </div>

            {/* Topic info */}
            <div className="bg-[#0d1220] border border-cyan-900/40 rounded-sm px-4 py-3 space-y-2">
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Topic MQTT</span>
              <div className="font-mono text-[10px] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-500 font-bold">V1</span>
                  <span className="text-slate-500 truncate">{TOPIC_GPS}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">V2</span>
                  <span className="text-slate-500 truncate">{TOPIC_BATT}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-500 font-bold">V3</span>
                  <span className="text-slate-500 truncate">{TOPIC_ACS}</span>
                </div>
              </div>
              {/* Contoh payload V3 */}
              <div className="mt-1 bg-black/40 rounded-sm px-2 py-1.5 font-mono text-[9px] text-slate-500 leading-relaxed">
                <span className="text-slate-600">// payload V3 (ACS758 150A):</span><br/>
                <span className="text-orange-500">
                  {`{"current":"${lastCurrent.toFixed(2)}"}`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BATTERY BAR ────────────────────────────────────────────────────── */}
      <div className="px-3 py-1.5 bg-[#0d1220] border-t border-cyan-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <BattIcon className="w-3.5 h-3.5 shrink-0" style={{ color: battColor }} />
          <div className="flex-1 bg-slate-800 h-1.5 overflow-hidden">
            <div
              className="h-1.5 transition-all duration-700"
              style={{
                width:     `${battPct}%`,
                background: battColor,
                boxShadow:  battPct > 20 ? `0 0 6px ${battColor}80` : "none",
              }}
            />
          </div>
          <span className="text-[10px] font-bold shrink-0" style={{ color: battColor }}>
            {battPct}%
          </span>
        </div>
      </div>

      {/* ── SERIAL MONITOR ─────────────────────────────────────────────────── */}
      <div className="bg-[#0d1220] border-t border-cyan-900/40 shrink-0">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase text-slate-500 hover:text-cyan-300 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            <span>Serial Monitor</span>
          </div>
          <div className="flex items-center gap-2">
            {showLogs && (
              <button
                onClick={e => { e.stopPropagation(); setLogs([]); }}
                className="text-[9px] text-slate-600 hover:text-red-400 transition-colors normal-case font-normal"
              >
                Clear
              </button>
            )}
            <span className="text-[9px] text-slate-700">{logs.length} lines</span>
            {showLogs ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </div>
        </button>

        {showLogs && (
          <div className="h-36 overflow-y-auto px-3 pb-3 text-[10px] bg-[#040608] space-y-0.5 border-t border-cyan-900/20">
            {logs.length === 0 && (
              <p className="text-slate-600 pt-2 tracking-wider">// awaiting data...</p>
            )}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 leading-relaxed font-mono">
                <span className="text-slate-600 shrink-0 select-none">{log.time}</span>
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