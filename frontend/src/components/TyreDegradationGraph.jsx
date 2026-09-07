import { useState } from "react";
import { cn } from "@/lib/utils";

export function TyreDegradationGraph({
  data,
  driverCode = "DRIVER",
  className
}) {
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
              <span className="text-amber-400 font-bold">{latest?.compound || "HARD"}</span>
            </span>
            <span className="text-text-muted">
              LIFE: <span className="text-drs-cyan font-bold">{latest?.wear_pct !== null && latest?.wear_pct !== undefined ? `${latest.wear_pct}%` : "100%"}</span>
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
        <div className="relative w-full h-[160px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {[0, 25, 50, 75, 100].map((pct, idx) => {
              const yPos = getYWear(pct);
              return (
                <g key={idx}>
                  <line x1={padding} y1={yPos} x2={width - padding} y2={yPos} stroke="#1C2025" strokeDasharray="3 3" />
                  <text x={padding - 8} y={yPos + 4} textAnchor="end" fill="#8E9AA8" fontSize="12" fontWeight="600" className="font-mono">
                    {pct}%
                  </text>
                </g>
              );
            })}

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
              return (
                <circle
                  key={i}
                  cx={getX(d.lap)}
                  cy={getYWear(d.wear_pct)}
                  r="4"
                  fill={d.wear_pct < 40 ? "#EF4444" : d.wear_pct < 70 ? "#F59E0B" : "#10B981"}
                />
              );
            })}
          </svg>
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
                  DRIVER: {driverCode} | COMPOUND: {latest?.compound || "HARD"} | INITIAL LIFE: 100% → CURRENT: {latest?.wear_pct || 100}%
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
                      fill={d.wear_pct < 40 ? "#EF4444" : d.wear_pct < 70 ? "#F59E0B" : "#10B981"}
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
                                "px-2 py-0.5 rounded text-[11px]",
                                d.wear_pct < 40 ? "bg-red-500/20 text-red-400" : d.wear_pct < 70 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                              )}
                            >
                              {d.wear_pct}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted">--</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-text-muted font-mono">
                          {d.note ? (
                            <span className="text-[10px] text-text-muted italic">[{d.note}]</span>
                          ) : d.pace_loss_s !== null && d.pace_loss_s !== undefined ? (
                            `+${Number(d.pace_loss_s).toFixed(3)}s/lap`
                          ) : (
                            <span className="text-[10px] text-text-muted">N/A</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-amber-400 font-bold">
                          {d.compound || "HARD"}
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
