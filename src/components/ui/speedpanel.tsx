import { useState } from "react";
import { getSpeedText, getHeadingText } from "@/hooks/useGPSTracking";
import type { SpeedHistory } from "@/hooks/useGPSTracking";

type SpeedUnit = "kmh" | "mph" | "ms";

interface SpeedPanelProps {
  speedKmh: number;
  speedMph: number;
  speedMs: number;
  maxSpeedKmh: number;
  speedHistory: SpeedHistory[];
  heading?: number;
  isConnected: boolean;
  isTrackingActive: boolean;
  onResetStats?: () => void;
}

function SpeedChart({ history, unit, maxSpeed }: {
  history: SpeedHistory[];
  unit: SpeedUnit;
  maxSpeed: number;
}) {
  if (history.length < 2) return (
    <div className="h-10 flex items-center justify-center">
      <span className="text-xs font-mono" style={{ color: "#1e3a5f", letterSpacing: 2 }}>MENUNGGU DATA...</span>
    </div>
  );
  const W = 320, H = 44;
  const values = history.map(h => unit === "mph" ? h.speedMph : unit === "ms" ? h.speedMs : h.speedKmh);
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - Math.min((v / maxSpeed) * H, H);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="spCg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${points} ${W},${H}`} fill="url(#spCg)" />
      <polyline points={points} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function SpeedPanel({
  speedKmh, speedMph, speedMs, maxSpeedKmh,
  speedHistory, heading, isConnected, isTrackingActive, onResetStats,
}: SpeedPanelProps) {
  const [unit, setUnit] = useState<SpeedUnit>("kmh");

  const currentSpeed = unit === "mph" ? speedMph : unit === "ms" ? speedMs : speedKmh;
  const maxGauge = unit === "mph" ? 80 : unit === "ms" ? 22 : 120;
  const unitLabel = unit === "kmh" ? "km/h" : unit === "mph" ? "mph" : "m/s";
  const isMoving = speedMs > 0.5;
  const frac = Math.min(currentSpeed, maxGauge) / maxGauge;
  const color = frac < 0.4 ? "#06b6d4" : frac < 0.75 ? "#f59e0b" : "#ef4444";

  const maxDisplay = unit === "mph"
    ? (maxSpeedKmh / 1.60934).toFixed(1)
    : unit === "ms"
    ? (maxSpeedKmh / 3.6).toFixed(2)
    : maxSpeedKmh.toFixed(1);

  const avg = speedHistory.length
    ? speedHistory.reduce((a, h) => a + (unit === "mph" ? h.speedMph : unit === "ms" ? h.speedMs : h.speedKmh), 0) / speedHistory.length
    : 0;

  const ticks = [0, 20, 40, 60, 80, 100, 120];
  const ticksDisplay = unit === "mph"
    ? [0, 13, 25, 37, 50, 62, 75]
    : unit === "ms"
    ? [0, 3, 6, 9, 12, 15, 18]
    : ticks;

  return (
    <div style={{ background: "#0a0f1e", border: "1px solid #1a2840", borderRadius: 20, padding: 20, width: "100%", maxWidth: 380, boxSizing: "border-box" as const }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", display: "inline-block",
            background: isTrackingActive ? "#06b6d4" : isConnected ? "#fbbf24" : "#334155",
            boxShadow: isTrackingActive ? "0 0 8px #06b6d4" : "none",
          }} />
          <span style={{ color: "#475569", fontSize: 11, fontFamily: "monospace", letterSpacing: 3, fontWeight: "bold" }}>AGV VELOCITY</span>
        </div>
        {/* Unit toggle */}
        <div style={{ display: "flex", background: "#0d1e35", borderRadius: 8, padding: 2, gap: 2 }}>
          {(["kmh", "mph", "ms"] as SpeedUnit[]).map(u => (
            <button key={u} onClick={() => setUnit(u)} style={{
              padding: "2px 8px", borderRadius: 6, fontSize: 10, fontFamily: "monospace",
              border: "none", cursor: "pointer", transition: "all 0.2s",
              background: unit === u ? "#06b6d4" : "transparent",
              color: unit === u ? "#0a0f1e" : "#334155",
              fontWeight: unit === u ? "bold" : "normal",
            }}>
              {u === "kmh" ? "km/h" : u === "mph" ? "mph" : "m/s"}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{
          fontSize: 10, fontFamily: "monospace", padding: "2px 10px", borderRadius: 99,
          border: `1px solid ${isConnected ? "#166534" : "#7f1d1d"}`,
          background: isConnected ? "rgba(21,128,61,0.12)" : "rgba(127,29,29,0.12)",
          color: isConnected ? "#4ade80" : "#f87171",
        }}>
          {isConnected ? "● MQTT TERHUBUNG" : "○ TERPUTUS"}
        </span>
        <span style={{ fontSize: 10, fontFamily: "monospace", color: isMoving ? color : "#334155" }}>
          {getSpeedText(speedKmh)}
        </span>
      </div>

      {/* Big number */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <span style={{
          color, fontSize: 72, fontFamily: "'Courier New', monospace", fontWeight: "bold",
          textShadow: `0 0 30px ${color}88`, transition: "color 0.3s, text-shadow 0.3s",
          lineHeight: 1,
        }}>
          {Math.round(currentSpeed)}
        </span>
        <span style={{ color: "#1e4060", fontSize: 14, fontFamily: "monospace", marginLeft: 8 }}>
          {unitLabel}
        </span>
      </div>

      {/* Main progress bar */}
      <div style={{ position: "relative", height: 24, background: "#0d1e35", borderRadius: 12, overflow: "hidden", border: "1px solid #1a2840", marginBottom: 6 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${frac * 100}%`,
          background: `linear-gradient(90deg, #06b6d4, ${color})`,
          borderRadius: 12,
          transition: "width 0.35s ease, background 0.3s",
          boxShadow: `0 0 16px ${color}88`,
        }} />
        {/* Tick dividers */}
        {ticks.map(v => (
          <div key={v} style={{ position: "absolute", left: `${(v / 120) * 100}%`, top: 0, bottom: 0, width: 1, background: "#0a1525", zIndex: 1 }} />
        ))}
        {/* Speed text inside bar */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: frac > 0.15 ? "#0a0f1e" : "#1e4060", fontWeight: "bold", letterSpacing: 1 }}>
            {(frac * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Tick labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        {ticksDisplay.map(v => (
          <span key={v} style={{ color: "#0d2840", fontSize: 8, fontFamily: "monospace" }}>{v}</span>
        ))}
      </div>

      {/* Secondary bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {/* Max speed bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: "#1a3050", fontSize: 9, fontFamily: "monospace", letterSpacing: 1 }}>KECEPATAN MAKS</span>
            <span style={{ color: "#06b6d4", fontSize: 9, fontFamily: "monospace", fontWeight: "bold" }}>{maxDisplay} {unitLabel}</span>
          </div>
          <div style={{ height: 5, background: "#0d1e35", borderRadius: 4 }}>
            <div style={{
              height: 5, width: `${Math.min((parseFloat(maxDisplay) / maxGauge) * 100, 100)}%`,
              background: "#06b6d4", borderRadius: 4, transition: "width 0.4s",
              boxShadow: "0 0 8px #06b6d4",
            }} />
          </div>
        </div>
        {/* Avg speed bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: "#1a3050", fontSize: 9, fontFamily: "monospace", letterSpacing: 1 }}>RATA-RATA</span>
            <span style={{ color: "#818cf8", fontSize: 9, fontFamily: "monospace", fontWeight: "bold" }}>{avg.toFixed(1)} {unitLabel}</span>
          </div>
          <div style={{ height: 5, background: "#0d1e35", borderRadius: 4 }}>
            <div style={{
              height: 5, width: `${Math.min((avg / maxGauge) * 100, 100)}%`,
              background: "#818cf8", borderRadius: 4, transition: "width 0.4s",
              boxShadow: "0 0 8px #818cf888",
            }} />
          </div>
        </div>
        {/* Safe zone indicator */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: "#1a3050", fontSize: 9, fontFamily: "monospace", letterSpacing: 1 }}>ZONA AMAN</span>
            <span style={{ color: "#10b981", fontSize: 9, fontFamily: "monospace" }}>&lt; {unit === "mph" ? "25" : unit === "ms" ? "8" : "40"} {unitLabel}</span>
          </div>
          <div style={{ height: 5, background: "#0d1e35", borderRadius: 4 }}>
            <div style={{ height: 5, width: "33%", background: "#10b981", borderRadius: 4, boxShadow: "0 0 8px #10b98188" }} />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { label: "MAKS", value: maxDisplay + " " + unitLabel, color: "#06b6d4" },
          { label: "RATA²", value: avg.toFixed(1) + " " + unitLabel, color: "#818cf8" },
          { label: "ARAH", value: heading !== undefined ? getHeadingText(heading).split(" ")[0] : "—", color: "#94a3b8" },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px", background: "#0d1e35", borderRadius: 10, border: "1px solid #1a2840" }}>
            <span style={{ fontSize: 8, color: "#1e4060", fontFamily: "monospace", letterSpacing: 1 }}>{s.label}</span>
            <span style={{ fontSize: 11, fontWeight: "bold", fontFamily: "monospace", color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* History chart */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 9, color: "#1e3a5f", fontFamily: "monospace", letterSpacing: 2, marginBottom: 4, margin: "0 0 6px 0" }}>RIWAYAT 60 DETIK</p>
        <SpeedChart history={speedHistory} unit={unit} maxSpeed={maxGauge} />
      </div>

      {/* Status text */}
      <div style={{ textAlign: "center", marginBottom: 12, fontSize: 11, fontFamily: "monospace", letterSpacing: 2, color }}>
        {speedKmh <= 0 ? "■ BERHENTI" : speedKmh < 15 ? "▶ PELAN" : speedKmh < 50 ? "▶▶ SEDANG" : "▶▶▶ CEPAT"}
      </div>

      {/* Reset button */}
      {onResetStats && (
        <button onClick={onResetStats} style={{
          width: "100%", padding: "8px", background: "#0d1e35",
          border: "1px solid #1a2840", borderRadius: 12, color: "#334155",
          fontFamily: "monospace", fontSize: 10, letterSpacing: 2, cursor: "pointer",
          transition: "all 0.2s",
        }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = "#94a3b8"; (e.target as HTMLButtonElement).style.borderColor = "#334155"; }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = "#334155"; (e.target as HTMLButtonElement).style.borderColor = "#1a2840"; }}
        >
          ↺ RESET STATISTIK
        </button>
      )}
    </div>
  );
}

export default SpeedPanel;