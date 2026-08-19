import { cn } from "@/lib/utils";
export function TyreDegradationGraph({
  data,
  driverCode = "DRIVER",
  className
}) {
  if (!data || data.length === 0) {
    return <div className={cn("bg-panel border border-fw-border rounded-card p-4 text-xs font-mono text-text-muted", className)}>
        NO_TYRE_DEGRADATION_DATA
      </div>;
  }
  const width = 600;
  const height = 160;
  const padding = 35;
  const minLap = Math.min(...data.map((d) => d.lap));
  const maxLap = Math.max(...data.map((d) => d.lap));
  const getX = (lap) => padding + (lap - minLap) / Math.max(1, maxLap - minLap) * (width - 2 * padding);
  const getYWear = (pct) => height - padding - pct / 100 * (height - 2 * padding);
  const wearPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(d.lap)} ${getYWear(d.wear_pct)}`).join(" ");
  const latest = data[data.length - 1];
  return <div className={cn("bg-panel border border-fw-border rounded-card p-4 flex flex-col gap-3", className)}><div className="flex justify-between items-center text-mono-meta font-mono"><span className="text-text-primary font-semibold tracking-wider flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400" />
          TYRE_DEGRADATION // STINT_WEAR_CURVE
        </span><div className="flex items-center gap-3 text-[10px]"><span className="text-text-muted">{driverCode.toUpperCase()} COMPOUND: <span className="text-amber-400 font-bold">{latest?.compound || "MEDIUM"}</span></span><span className="text-text-muted">LIFE: <span className="text-drs-cyan font-bold">{latest?.wear_pct || 75}%</span></span></div></div><div className="relative w-full h-[160px]"><svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">{[0, 25, 50, 75, 100].map((pct, idx) => {
    const yPos = getYWear(pct);
    return <g key={idx}><line x1={padding} y1={yPos} x2={width - padding} y2={yPos} stroke="#1C2025" strokeDasharray="3 3" /><text x={padding - 6} y={yPos + 3} textAnchor="end" fill="#5C6470" fontSize="9" className="font-mono">{pct}%
                </text></g>;
  })}<path d={wearPath} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />{data.map((d, i) => <circle
    key={i}
    cx={getX(d.lap)}
    cy={getYWear(d.wear_pct)}
    r="3.5"
    fill={d.wear_pct < 40 ? "#EF4444" : d.wear_pct < 70 ? "#F59E0B" : "#10B981"}
  />)}</svg></div></div>;
}
