import MapContainer from "@/components/MapContainer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useGPSTracking, getHeadingText, getSpeedText } from "@/hooks/useGPSTracking";
import { SpeedPanel } from "@/components/ui/speedpanel";
import {
  Navigation, Battery, BatteryLow, BatteryFull, BatteryMedium,
  Wifi, WifiOff, MapPin, Gauge, Compass, ChevronDown, ChevronUp,
  AlertTriangle, Activity,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";


const getBatteryColor = (pct: number): string => {
  if (pct > 50) return "#22d3ee";
  if (pct > 20) return "#f59e0b";
  return "#ef4444";
};

const getBatteryIcon = (pct: number) => {
  if (pct > 50) return BatteryFull;
  if (pct > 20) return BatteryMedium;
  return BatteryLow;
};

const getBatteryText = (pct: number): string => {
  if (pct > 50) return "Normal";
  if (pct > 20) return "Sedang";
  return "Kritis!";
};


type LogType = "info" | "gps" | "battery" | "error" | "votol";
interface LogEntry { time: string; message: string; type: LogType; }


const Home = () => {
  const {
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
    power,
  } = useGPSTracking();

  const battColor   = battery !== null ? getBatteryColor(battery) : "#475569";
  const BatteryIcon = battery !== null ? getBatteryIcon(battery)  : Battery;

  const [logs,      setLogs]      = useState<LogEntry[]>([]);
  const [showLogs,  setShowLogs]  = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "speed">("map");
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showLogs) logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, showLogs]);

  useEffect(() => {
    if (!vehicle) return;
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs(prev => [...prev.slice(-100), {
      time,
      message: `[GPS] ${locationName} | ${getHeadingText(vehicle.heading ?? 0)} | ${getSpeedText(vehicle.speed ?? 0)} | ${speedKmh} km/h`,
      type: "gps",
    }]);
  }, [vehicle, locationName, speedKmh]);

  useEffect(() => {
    if (battery === null) return;
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs(prev => [...prev.slice(-100), {
      time,
      message: `[BATT] ${battery}% — ${getBatteryText(battery)}${battery <= 20 ? " ⚠ Segera charge!" : ""}`,
      type: "battery",
    }]);
  }, [battery]);

  useEffect(() => {
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs(prev => [...prev, {
      time,
      message: isConnected ? "[MQTT] Terhubung ke broker.emqx.io" : "[MQTT] Koneksi terputus",
      type: isConnected ? "info" : "error",
    }]);
  }, [isConnected]);

  useEffect(() => {
    if (!power) return;
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs(prev => [...prev.slice(-100), {
      time,
      message: `[V3] ${power.mode} | ${Math.round(power.watt)}W | ${power.voltage.toFixed(1)}V × ${power.current.toFixed(1)}A`,      type: "votol",
    }]);
  }, [power]);

  const getLogColor = (type: LogType) => {
    if (type === "gps")     return "text-emerald-400";
    if (type === "battery") return "text-amber-400";
    if (type === "error")   return "text-red-400";
    if (type === "votol")   return "text-orange-400";
    return "text-cyan-400";
  };

  return (
    <div className="flex flex-col h-screen bg-[#080c14] overflow-hidden" style={{ fontFamily: "'DM Mono', 'IBM Plex Mono', monospace" }}>

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0d1220] border-b border-cyan-900/40 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-end gap-0.5 h-4">
            {[3,5,4,6,3,5].map((h, i) => (
              <div key={i} className="w-0.5 rounded-sm bg-cyan-500"
                style={{ height: `${h * 2}px`, opacity: isConnected ? 1 : 0.3 }} />
            ))}
          </div>
          <span className="font-bold text-xs tracking-widest text-cyan-300 uppercase">EC Tracker</span>
          <span className="text-[9px] text-slate-600 tracking-widest hidden sm:block">EC-01</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm border tracking-wider ${
            isConnected
              ? "bg-cyan-950/60 border-cyan-700/50 text-cyan-400"
              : "bg-red-950/60  border-red-700/50  text-red-400"
          }`}>
            {isConnected
              ? <><Wifi className="w-2.5 h-2.5" /> ONLINE</>
              : <><WifiOff className="w-2.5 h-2.5" /> OFFLINE</>
            }
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* ── BATTERY WARNING ──────────────────────────────────────────────────── */}
      {battery !== null && battery <= 20 && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/80 border-b border-red-700/60 shrink-0 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
          <span className="text-[10px] font-bold text-red-300 tracking-wider uppercase truncate">
            Baterai Kritis — {battery}% — Segera Charge!
          </span>
        </div>
      )}

      {/* ── TABS ─────────────────────────────────────────────────────────────── */}
      <div className="flex bg-[#0d1220] border-b border-cyan-900/40 shrink-0">
        {(["map", "speed"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold tracking-widest uppercase transition-all border-b-2 ${
              activeTab === tab
                ? tab === "map"
                  ? "border-cyan-500 text-cyan-400 bg-cyan-950/30"
                  : "border-amber-400 text-amber-400 bg-amber-950/20"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab === "map"
              ? <><MapPin className="w-3 h-3" /> Peta</>
              : <>
                  <Gauge className="w-3 h-3" /> Speed
                  {speedKmh > 0 && (
                    <span className="text-[9px] bg-amber-500 text-slate-900 font-black px-1 py-0.5 rounded-sm">
                      {speedKmh}
                    </span>
                  )}
                </>
            }
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {activeTab === "map" && (
          <div className="relative h-full">
            <MapContainer
              vehicles={vehicle ? [vehicle] : []}
              isTrackingActive={isTrackingActive}
            />

            {vehicle && (
              <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
                <div className="bg-[#0d1220]/95 backdrop-blur-sm border border-cyan-900/60 rounded-sm px-3 py-2 shadow-xl flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span className="text-xs font-bold text-cyan-200 tracking-wide truncate">{locationName}</span>
                  <span className="ml-auto text-[10px] text-slate-500 shrink-0">
                    {vehicle.lat.toFixed(5)}, {vehicle.lng.toFixed(5)}
                  </span>
                </div>
              </div>
            )}

            {battery !== null && battery <= 20 && vehicle && (
              <div className="absolute top-14 left-3 right-3 z-10 pointer-events-none">
                <div className="bg-red-600/90 backdrop-blur-sm border border-red-500/60 rounded-sm px-3 py-2 shadow-xl flex items-center gap-2">
                  <BatteryLow className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="text-[11px] font-bold text-white tracking-wide">
                    Baterai Kritis! ({battery}%)
                  </span>
                </div>
              </div>
            )}

            {!vehicle && (
              <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                <div className="bg-[#0d1220]/90 backdrop-blur-sm border border-cyan-900/40 rounded-sm px-3 py-2 shadow-lg flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-cyan-300 tracking-wide">Menunggu GPS...</p>
                    <p className="text-[10px] text-slate-500">
                      {isConnected ? "MQTT ✓ terhubung" : "MQTT ✗ terputus"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "speed" && (
          <div className="h-full overflow-y-auto flex justify-center px-4 py-4">
            <SpeedPanel
              speedKmh={speedKmh}
              speedMph={speedMph}
              speedMs={speedMs}
              maxSpeedKmh={maxSpeedKmh}
              speedHistory={speedHistory}
              heading={vehicle?.heading}
              isConnected={isConnected}
              isTrackingActive={isTrackingActive}
              onResetStats={resetSpeedStats}
              power={power}
            />
          </div>
        )}
      </div>

      {/* ── INFO STRIP ───────────────────────────────────────────────────────── */}
      {activeTab === "map" && (
        <div className="grid grid-cols-3 gap-px bg-cyan-900/20 border-t border-cyan-900/40 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#0d1220] px-2.5 py-1.5">
            <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] text-slate-600 uppercase tracking-widest">Lokasi</p>
              <p className="text-[10px] font-bold text-cyan-200 truncate">
                {vehicle ? locationName : "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-[#0d1220] px-2.5 py-1.5 border-x border-cyan-900/30">
            <Compass className="w-3 h-3 text-violet-400 shrink-0" />
            <div>
              <p className="text-[8px] text-slate-600 uppercase tracking-widest">Arah</p>
              <p className="text-[10px] font-bold text-violet-300">
                {vehicle ? getHeadingText(vehicle.heading ?? 0) : "-"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("speed")}
            className="flex items-center gap-1.5 bg-[#0d1220] px-2.5 py-1.5 hover:bg-amber-950/20 transition-colors"
          >
            <Gauge className="w-3 h-3 text-amber-400 shrink-0" />
            <div>
              <p className="text-[8px] text-slate-600 uppercase tracking-widest">Speed</p>
              <p className="text-[10px] font-bold text-amber-300">
                {vehicle ? `${speedKmh} km/h` : "-"}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* ── BATTERY BAR ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-1.5 bg-[#0d1220] border-t border-cyan-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <BatteryIcon className="w-3.5 h-3.5 shrink-0" style={{ color: battColor }} />
          <div className="flex-1 bg-slate-800 h-1.5 overflow-hidden">
            <div
              className="h-1.5 transition-all duration-700"
              style={{
                width: battery !== null ? `${battery}%` : "0%",
                background: battColor,
                boxShadow: battery !== null && battery > 20 ? `0 0 6px ${battColor}80` : "none",
              }}
            />
          </div>
          <span className="text-[10px] font-bold shrink-0" style={{ color: battColor }}>
            {battery !== null ? `${battery}%` : "--"}
          </span>
        </div>
      </div>

      {/* ── SERIAL MONITOR ───────────────────────────────────────────────────── */}
      <div className="bg-[#0d1220] border-t border-cyan-900/40 shrink-0">
        {/* ✅ Changed outer <button> to <div> to fix button-in-button nesting */}
        <div
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase text-slate-500 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            {isTrackingActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
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
        </div>

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

export default Home;