import { useMemo } from "react";

interface SpeedGaugeProps {
  speed: number;
  maxSpeed?: number;
  unit?: string;
  size?: number;
  isMoving?: boolean;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, end);
  const largeArc = end - start <= 180 ? "0" : "1";
  return "M " + s.x + " " + s.y + " A " + r + " " + r + " 0 " + largeArc + " 1 " + e.x + " " + e.y;
}

export function SpeedGauge({ speed, maxSpeed = 120, unit = "km/h", size = 280, isMoving = false }: SpeedGaugeProps) {
  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.33;
  const needleR = size * 0.37;
  const START = -135, END = 135, TOTAL = 270;

  const clamped = Math.min(Math.max(speed, 0), maxSpeed);
  const frac = clamped / maxSpeed;
  const needleAngle = START + frac * TOTAL;
  const color = frac < 0.4 ? "#22d3ee" : frac < 0.75 ? "#f59e0b" : "#ef4444";

  const zones = useMemo(() => [
    { from: 0, to: 0.4, color: "#22d3ee" },
    { from: 0.4, to: 0.75, color: "#f59e0b" },
    { from: 0.75, to: 1.0, color: "#ef4444" },
  ], []);

  const ticks = useMemo(() => {
    const major: number[] = [];
    const minor: number[] = [];
    const count = 8;
    const step = maxSpeed / count;
    for (let i = 0; i <= count * 2; i++) {
      const v = (i * step) / 2;
      if (i % 2 === 0) major.push(Math.round(v));
      else minor.push(v);
    }
    return { major, minor };
  }, [maxSpeed]);

  const ts = (n: string) => "rotate(" + n + "deg)";

  return (
    <svg width={size} height={size} viewBox={"0 0 " + size + " " + size}>
      <defs>
        <filter id="sg-glow">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="sg-needle" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.1"/>
          <stop offset="100%" stopColor={color}/>
        </linearGradient>
        <radialGradient id="sg-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e293b"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={outerR+4} fill="url(#sg-bg)"/>
      <circle cx={cx} cy={cy} r={outerR+4} fill="none" stroke="#1e3a5f" strokeWidth="1.5"/>
      <path d={describeArc(cx,cy,outerR,START,END)} fill="none" stroke="#0f1f35" strokeWidth={size*0.072} strokeLinecap="round"/>

      {zones.map((z,i) => (
        <path key={i} d={describeArc(cx,cy,outerR, START+z.from*TOTAL, START+z.to*TOTAL)}
          fill="none" stroke={z.color} strokeWidth={size*0.022} strokeOpacity={0.2} strokeLinecap="butt"/>
      ))}

      {frac > 0 && (
        <path d={describeArc(cx,cy,outerR,START,needleAngle)} fill="none" stroke={color}
          strokeWidth={size*0.048} strokeLinecap="round" filter="url(#sg-glow)"
          style={{transition:"all 0.35s ease"}}/>
      )}

      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#1e3a5f" strokeWidth="1"/>

      {ticks.major.map((v) => {
        const a = START + (v/maxSpeed)*TOTAL;
        const o = polarToCartesian(cx,cy,outerR-size*0.008,a);
        const inn = polarToCartesian(cx,cy,outerR-size*0.068,a);
        const lbl = polarToCartesian(cx,cy,outerR-size*0.13,a);
        return (
          <g key={v}>
            <line x1={o.x} y1={o.y} x2={inn.x} y2={inn.y} stroke="#475569" strokeWidth="1.5"/>
            <text x={lbl.x} y={lbl.y} textAnchor="middle" dominantBaseline="central"
              fill="#475569" fontSize={size*0.042} fontFamily="monospace">{v}</text>
          </g>
        );
      })}

      {ticks.minor.map((v,i) => {
        const a = START + (v/maxSpeed)*TOTAL;
        const o = polarToCartesian(cx,cy,outerR-size*0.008,a);
        const inn = polarToCartesian(cx,cy,outerR-size*0.042,a);
        return <line key={i} x1={o.x} y1={o.y} x2={inn.x} y2={inn.y} stroke="#1e3a5f" strokeWidth="1"/>;
      })}

      <g style={{
        transform: "rotate(" + (needleAngle+90) + "deg)",
        transformOrigin: cx + "px " + cy + "px",
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)"
      }}>
        <line x1={cx} y1={cy+size*0.055} x2={cx} y2={cy-needleR}
          stroke="url(#sg-needle)" strokeWidth={size*0.014} strokeLinecap="round"/>
      </g>

      <circle cx={cx} cy={cy} r={size*0.032} fill={color} filter="url(#sg-glow)"/>
      <circle cx={cx} cy={cy} r={size*0.016} fill="#0f172a"/>

      <text x={cx} y={cy+size*0.13} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size*0.19} fontFamily="'Courier New',monospace" fontWeight="bold"
        filter="url(#sg-glow)" style={{transition:"fill 0.3s"}}>
        {Math.round(speed)}
      </text>

      <text x={cx} y={cy+size*0.28} textAnchor="middle" dominantBaseline="central"
        fill="#475569" fontSize={size*0.065} fontFamily="monospace" letterSpacing="3">
        {unit.toUpperCase()}
      </text>

      {isMoving && (
        <circle cx={cx+size*0.22} cy={cy-size*0.22} r={size*0.024} fill="#22d3ee" filter="url(#sg-glow)">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite"/>
        </circle>
      )}
    </svg>
  );
}

export default SpeedGauge;