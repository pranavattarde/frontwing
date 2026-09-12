import { useState } from "react";
import { cn } from "@/lib/utils";

export const getTyreWearColor = (pct) => {
  if (pct === null || pct === undefined) return "#8E9AA8";
  if (pct <= 30) return "#10B981"; // Low degradation (0-30%): Emerald Green
  if (pct <= 70) return "#F59E0B"; // Moderate degradation (31-70%): Amber/Yellow
  return "#EF4444";               // High degradation (>70%): Red
};

export function TyreDegradationGraph({
  data,
  driverCode = "DRIVER",
  className
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className={cn("bg-panel border border-fw-border rounded-card p-4 text-xs font-mono text-text-muted", className)}>
        NO_TYRE_DEGRADATION_DATA
      </div>
    );
  }

  const width = 600;
  const height = 160;
  const padding = 42; // Increased padding for clearer labels

  // Filter valid wear data points
  const validData = data.filter((d) => d && d.lap !== undefined && d.wear_pct !== null && d.wear_pct !== undefined);
  const minLap = validData.length > 0 ? Math.min(...validData.map((d) => d.lap)) : 1;
  const maxLap = validData.length > 0 ? Math.max(...validData.map((d) => d.lap)) : 1;
  const getX = (lap) => padding + ((lap - minLap) / Math.max(1, maxLap - minLap)) * (width - 2 * padding);
  const getYWear = (pct) => height - padding - (Math.max(0, Math.min(100, pct)) / 100) * (height - 2 * padding);

  // Group paths per stint so wear curve resets cleanly without cross-stint lines
  const stintGroups = {};
  data.forEach((d) => {
    const sId = d.stint || 1;
    if (!stintGroups[sId]) stintGroups[sId] = [];
    stintGroups[sId].push(d);
  });

  const latest = data[data.length - 1];

  return (
    <>
      <div className={cn("bg-panel border border-fw-border rounded-card p-4 flex flex-col gap-3 relative", className)}>
        {/* Header */}
        <div className="flex justify-between items-center text-mono-meta font-mono">
          <span className="text-text-primary font-semibold tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            TYRE_DEGRADATION // STINT_WEAR_CURVE
          </span>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-text-muted">
              {String(driverCode || "DRIVER").toUpperCase()} COMPOUND:{" "}
              <span className="text-amber-400 font-bold">{latest?.compound || "N/A"}</span>
            </span>
            <span className="text-text-muted">
              DEG: <span className="text-amber-400 font-bold">{latest?.wear_pct !== null && latest?.wear_pct !== undefined ? `${latest.wear_pct}%` : "—"}</span>
            </span>
            <span className="text-text-muted">
              LIFE: <span className="text-drs-cyan font-bold">{latest?.wear_pct !== null && latest?.wear_pct !== undefined ? `${(100 - latest.wear_pct).toFixed(1).replace(/\.0$/, "")}%` : "—"}</span>
            </span>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-[11px] font-mono text-amber-400 hover:text-amber-300 border border-amber-400/30 hover:border-amber-400 px-2 py-0.5 rounded bg-amber-400/5 transition-colors"
            >
              [EXPAND]
            </button>
          </div>
        </div>

        {/* Chart SVG */}
        <div className="relative w-full h-[180px]">
          <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-full overflow-visible">
            {/* Y-Axis Title */}
            <text
              x={padding - 10}
              y={padding - 18}
              textAnchor="start"
              fill="#8E9AA8"
              fontSize="9"
              fontWeight="bold"
              className="font-mono tracking-wider"
            >
              ESTIMATED WEAR (%) / PACE LOSS (s) ↑
            </text>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {[0, 25, 50, 75, 100].map((pct, idx) => {
              const yPos = getYWear(pct);
              return (
                <g key={idx}>
                  <line x1={padding} y1={yPos} x2={width - padding} y2={yPos} stroke="#1C2025" strokeDasharray="3 3" />
                  <text x={padding - 8} y={yPos + 4} textAnchor="end" fill="#8E9AA8" fontSize="11" fontWeight="600" className="font-mono">
                    {pct}%
                  </text>
                </g>
              );
            })}

            {/* X-Axis Lap Ticks */}
            {(() => {
              const lapSpan = Math.max(1, maxLap - minLap);
              const step = lapSpan <= 10 ? 1 : lapSpan <= 25 ? 2 : lapSpan <= 50 ? 5 : 10;
              const ticks = [];
              for (let l = minLap; l <= maxLap; l += step) {
                ticks.push(l);
              }
              if (!ticks.includes(maxLap)) ticks.push(maxLap);

              return ticks.map((l) => {
                const xPos = getX(l);
                return (
                  <g key={`x-tick-${l}`}>
                    <line x1={xPos} y1={height - padding} x2={xPos} y2={height - padding + 4} stroke="#2D3748" strokeWidth="1" />
                    <text x={xPos} y={height - padding + 16} textAnchor="middle" fill="#8E9AA8" fontSize="10" fontWeight="600" className="font-mono">
                      L{l}
                    </text>
                  </g>
                );
              });
            })()}

            {/* X-Axis Title */}
            <text
              x={width / 2}
              y={height - padding + 30}
              textAnchor="middle"
              fill="#8E9AA8"
              fontSize="10"
              fontWeight="bold"
              className="font-mono tracking-wider"
            >
              LAP NUMBER →
            </text>

            {/* Render per-stint wear curves */}
            {Object.entries(stintGroups).map(([stintId, stintPts]) => {
              const validStintPts = stintPts.filter((d) => d.wear_pct !== null && d.wear_pct !== undefined);
              if (validStintPts.length === 0) return null;
              const pathD = validStintPts.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(d.lap)} ${getYWear(d.wear_pct)}`).join(" ");
              return (
                <path
                  key={stintId}
                  d={pathD}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              );
            })}

            {data.map((d, i) => {
              if (d.wear_pct === null || d.wear_pct === undefined) return null;
              const isHovered = hoveredPoint?.lap === d.lap;
              return (
                <circle
                  key={i}
                  cx={getX(d.lap)}
                  cy={getYWear(d.wear_pct)}
                  r={isHovered ? 6 : 4}
                  fill={getTyreWearColor(d.wear_pct)}
                  stroke={isHovered ? "#FFFFFF" : "rgba(0,0,0,0.5)"}
                  strokeWidth={isHovered ? 2 : 0.5}
                  filter={isHovered ? "drop-shadow(0 0 6px rgba(245, 158, 11, 0.9))" : undefined}
                  className="cursor-pointer transition-[r,stroke-width] duration-150 ease-out"
                  onMouseEnter={() => setHoveredPoint(d)}
                />
              );
            })}
          </svg>

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute z-20 bg-canvas/95 border border-amber-400/50 backdrop-blur-md px-3 py-2 rounded-card text-xs font-mono text-text-primary pointer-events-none shadow-xl"
              style={{
                left: `${Math.min(85, Math.max(15, (getX(hoveredPoint.lap) / width) * 100))}%`,
                top: "10px",
                transform: "translateX(-50%)"
              }}
            >
              <div className="font-bold flex items-center justify-between gap-4 border-b border-fw-border pb-1">
                <span>LAP {hoveredPoint.lap}</span>
                <span className="text-amber-400 font-bold">STINT {hoveredPoint.stint || 1}</span>
              </div>
              <div className="text-[10px] mt-1 flex items-center justify-between gap-4">
                <span className="text-text-muted">TYRE DEG:</span>
                <span className="font-bold text-amber-400 font-mono">
                  {hoveredPoint.wear_pct !== null && hoveredPoint.wear_pct !== undefined ? `${hoveredPoint.wear_pct}%` : "—"}
                </span>
              </div>
              <div className="text-[10px] mt-0.5 flex items-center justify-between gap-4">
                <span className="text-text-muted">TYRE LIFE:</span>
                <span
                  className={cn(
                    "font-bold font-mono",
                    hoveredPoint.wear_pct === null || hoveredPoint.wear_pct === undefined
                      ? "text-text-muted"
                      : (100 - hoveredPoint.wear_pct) > 60
                      ? "text-emerald-400"
                      : (100 - hoveredPoint.wear_pct) > 30
                      ? "text-amber-400"
                      : "text-red-400"
                  )}
                >
                  {hoveredPoint.wear_pct !== null && hoveredPoint.wear_pct !== undefined
                    ? `${(100 - hoveredPoint.wear_pct).toFixed(1).replace(/\.0$/, "")}%`
                    : "—"}
                </span>
              </div>
              {hoveredPoint.compound && (
                <div className="text-[10px] mt-0.5 flex items-center justify-between gap-4">
                  <span className="text-text-muted">COMPOUND:</span>
                  <span className="text-amber-300 font-semibold">{hoveredPoint.compound}</span>
                </div>
              )}
              <div className="text-[10px] mt-0.5 flex items-center justify-between gap-4">
                <span className="text-text-muted">PACE LOSS:</span>
                <span className="text-text-primary font-mono font-semibold">
                  {hoveredPoint.note ? (
                    <span className="italic text-text-muted">[{hoveredPoint.note}]</span>
                  ) : hoveredPoint.pace_loss_s !== null && hoveredPoint.pace_loss_s !== undefined ? (
                    `+${Number(hoveredPoint.pace_loss_s).toFixed(3)}s/lap`
                  ) : (
                    "N/A"
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-panel border border-fw-border rounded-card p-6 max-w-4xl w-full max-h-[90vh] flex flex-col gap-6 shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center border-b border-fw-border pb-3">
              <div>
                <h3 className="font-mono text-sm font-bold text-amber-400 tracking-wider uppercase">
                  TYRE_DEGRADATION // DETAILED_STINT_WEAR_ANALYSIS
                </h3>
                <span className="font-mono text-xs text-text-muted">
                  DRIVER: {driverCode} | COMPOUND: {latest?.compound || "N/A"} | INITIAL LIFE: 100% → CURRENT: {latest?.wear_pct || 100}%
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1 font-mono text-xs text-text-muted hover:text-text-primary border border-fw-border rounded hover:bg-elevated"
              >
                [CLOSE]
              </button>
            </div>

            {/* High-Resolution Zoomed Wear Chart */}
            <div className="relative w-full h-[260px] bg-canvas/90 p-4 rounded-card border border-fw-border">
              <svg viewBox={`0 0 800 220`} className="w-full h-full overflow-visible">
                {[0, 25, 50, 75, 100].map((pct, idx) => {
                  const yPos = 20 + ((100 - pct) / 100) * 160;
                  return (
                    <g key={idx}>
                      <line x1={60} y1={yPos} x2={760} y2={yPos} stroke="#1C2025" strokeDasharray="3 3" />
                      <text x={50} y={yPos + 5} textAnchor="end" fill="#8E9AA8" fontSize="13" fontWeight="bold" className="font-mono">
                        {pct}%
                      </text>
                    </g>
                  );
                })}

                {Object.entries(stintGroups).map(([stintId, stintPts]) => {
                  const validStintPts = stintPts.filter((d) => d.wear_pct !== null && d.wear_pct !== undefined);
                  if (validStintPts.length === 0) return null;
                  const pathD = validStintPts.map((d, i) => `${i === 0 ? "M" : "L"} ${60 + ((d.lap - minLap) / Math.max(1, maxLap - minLap)) * 700} ${20 + ((100 - d.wear_pct) / 100) * 160}`).join(" ");
                  return (
                    <path
                      key={stintId}
                      d={pathD}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="3"
                    />
                  );
                })}

                {data.map((d, i) => {
                  if (d.wear_pct === null || d.wear_pct === undefined) return null;
                  const cx = 60 + ((d.lap - minLap) / Math.max(1, maxLap - minLap)) * 700;
                  const cy = 20 + ((100 - d.wear_pct) / 100) * 160;
                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={getTyreWearColor(d.wear_pct)}
                      stroke="rgba(0,0,0,0.4)"
                      strokeWidth={0.5}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Degradation Log Table */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs font-bold text-text-primary uppercase tracking-wider">
                STINT_DEGRADATION_METRICS_LOG
              </span>
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto border border-fw-border rounded-card">
                <table className="w-full font-mono text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-elevated border-b border-fw-border text-text-muted text-[11px]">
                    <tr>
                      <th className="py-2 px-3">LAP #</th>
                      <th className="py-2 px-3">STINT</th>
                      <th className="py-2 px-3">TYRE DEGRADATION %</th>
                      <th className="py-2 px-3">TYRE LIFE %</th>
                      <th className="py-2 px-3">ESTIMATED PACE LOSS</th>
                      <th className="py-2 px-3">COMPOUND STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fw-border/40">
                    {data.map((d) => (
                      <tr key={d.lap} className="hover:bg-elevated/30 transition-colors">
                        <td className="py-2 px-3 font-bold text-text-primary">LAP {d.lap}</td>
                        <td className="py-2 px-3 font-mono text-text-secondary text-[11px]">
                          STINT {d.stint || 1}
                        </td>
                        <td className="py-2 px-3 font-bold">
                          {d.wear_pct !== null && d.wear_pct !== undefined ? (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-mono",
                                d.wear_pct > 70 ? "bg-red-500/20 text-red-400" : d.wear_pct > 30 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                              )}
                            >
                              {d.wear_pct}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-muted font-mono">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-bold">
                          {d.wear_pct !== null && d.wear_pct !== undefined ? (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-mono",
                                (100 - d.wear_pct) > 60 ? "bg-emerald-500/20 text-emerald-400" : (100 - d.wear_pct) > 30 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                              )}
                            >
                              {(100 - d.wear_pct).toFixed(1).replace(/\.0$/, "")}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-muted font-mono">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-text-muted font-mono">
                          {d.note ? (
                            <span className="text-[10px] text-text-muted italic">[{d.note}]</span>
                          ) : d.pace_loss_s !== null && d.pace_loss_s !== undefined ? (
                            `+${Number(d.pace_loss_s).toFixed(3)}s/lap`
                          ) : (
                            <span className="text-[10px] text-text-muted">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-amber-400 font-bold">
                          {d.compound || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
