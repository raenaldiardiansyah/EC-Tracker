import MapContainer from "@/components/MapContainer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useGPSTracking, getHeadingText, getSpeedText } from "@/hooks/useGPSTracking";
import { Navigation, Battery, BatteryLow, BatteryFull, BatteryMedium, Wifi, WifiOff, MapPin, Gauge, Compass, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const getBatteryColor = (level: number): string => {
  if (level > 60) return "#16a34a";
  if (level > 30) return "#ca8a04";
  return "#dc2626";
};

const getBatteryIcon = (level: number) => {
  if (level > 60) return BatteryFull;
  if (level > 30) return BatteryMedium;
  return BatteryLow;
};

const getBatteryText = (level: number): string => {
  if (level > 60) return "Normal";
  if (level > 30) return "Sedang";
  return "Lemah!";
};

type LogType = "info" | "gps" | "battery" | "error";

interface LogEntry {
  time: string;
  message: string;
  type: LogType;
}

const Home = () => {
  const { vehicle, isConnected, isTrackingActive, battery, locationName } = useGPSTracking();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const BatteryIcon = battery !== null ? getBatteryIcon(battery) : Battery;
  const battColor = battery !== null ? getBatteryColor(battery) : "#6b7280";

  useEffect(() => {
    if (showLogs) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, showLogs]);

  useEffect(() => {
    if (!vehicle) return;
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs((prev) => [
      ...prev.slice(-100),
      {
        time,
        message: `[GPS] 📍 ${locationName} | Arah: ${getHeadingText(vehicle.heading ?? 0)} | ${getSpeedText(vehicle.speed ?? 0)}`,
        type: "gps" as LogType,
      },
    ]);
  }, [vehicle, locationName]);

  useEffect(() => {
    if (battery === null) return;
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs((prev) => [
      ...prev.slice(-100),
      {
        time,
        message: `[BATTERY] 🔋 Baterai ${getBatteryText(battery)} (${battery}%)${battery <= 20 ? " ⚠️ Segera charge!" : ""}`,
        type: "battery" as LogType,
      },
    ]);
  }, [battery]);

  useEffect(() => {
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs((prev) => [
      ...prev,
      {
        time,
        message: isConnected ? "[MQTT] ✅ Terhubung ke broker" : "[MQTT] ❌ Koneksi terputus",
        type: (isConnected ? "info" : "error") as LogType,
      },
    ]);
  }, [isConnected]);

  const getLogColor = (type: LogType): string => {
    if (type === "gps") return "text-green-400";
    if (type === "battery") return "text-yellow-400";
    if (type === "error") return "text-red-400";
    return "text-blue-400";
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">EC Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            isConnected
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? "Online" : "Offline"}
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* MAP */}
      <div className="relative flex-1 min-h-0">
        <MapContainer
          vehicles={vehicle ? [vehicle] : []}
          isTrackingActive={isTrackingActive}
        />

        {/* Overlay lokasi di atas map */}
        {vehicle && (
          <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
            <div className="bg-card/95 backdrop-blur-sm border rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-medium truncate">{locationName}</span>
            </div>
          </div>
        )}

        {/* Waiting GPS */}
        {!vehicle && (
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
            <div className="bg-card/90 backdrop-blur-sm border rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
              <Navigation className="w-4 h-4 text-muted-foreground animate-pulse" />
              <div>
                <p className="text-xs font-semibold">Menunggu GPS...</p>
                <p className="text-xs text-muted-foreground">
                  {isConnected ? "✅ MQTT terhubung" : "❌ MQTT terputus"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Peringatan baterai lemah */}
        {battery !== null && battery <= 20 && (
          <div className="absolute top-14 left-3 right-3 z-10 pointer-events-none">
            <div className="bg-red-600 text-white px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-pulse">
              <BatteryLow className="w-4 h-4 shrink-0" />
              Baterai lemah! Segera charge EC ({battery}%)
            </div>
          </div>
        )}
      </div>

      {/* Info 3 kolom */}
      {vehicle && (
        <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-card border-t shrink-0">
          <div className="flex flex-col items-center gap-1 bg-muted/40 rounded-xl p-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Lokasi</span>
            <span className="text-xs font-semibold text-center leading-tight line-clamp-2">
              {locationName}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 bg-muted/40 rounded-xl p-2">
            <Compass className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Arah</span>
            <span className="text-xs font-semibold text-center">
              {getHeadingText(vehicle.heading ?? 0)}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 bg-muted/40 rounded-xl p-2">
            <Gauge className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Kecepatan</span>
            <span className="text-xs font-semibold text-center">
              {getSpeedText(vehicle.speed ?? 0)}
            </span>
          </div>
        </div>
      )}

      {/* Baterai bar */}
      <div className="px-3 py-2 bg-card border-t shrink-0">
        <div className="flex items-center gap-3">
          <BatteryIcon className="w-5 h-5 shrink-0" style={{ color: battColor }} />
          <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                width: battery !== null ? `${battery}%` : "0%",
                background: battColor,
              }}
            />
          </div>
          <span className="text-xs font-bold shrink-0" style={{ color: battColor }}>
            {battery !== null ? `${battery}%` : "--"}
          </span>
        </div>
      </div>

      {/* Serial Monitor collapsible */}
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
            {showLogs
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronUp className="w-4 h-4" />
            }
          </div>
        </button>

        {showLogs && (
          <div className="h-40 overflow-y-auto px-3 pb-3 font-mono text-xs bg-black/90 space-y-1">
            {logs.length === 0 && (
              <p className="text-gray-500 pt-2">Menunggu data...</p>
            )}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 leading-relaxed">
                <span className="text-gray-500 shrink-0">{log.time}</span>
                <span className={getLogColor(log.type)}>
                  {log.message}
                </span>
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