import { useState } from "react";
import { cn } from "@/lib/utils";

export function LapTimeGraph({
  data,
  driverCode = "DRIVER",
  comparativeData,
  comparativeDriverCode,
  className
}) {
  const [hoveredLap, setHoveredLap] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className={cn("bg-panel border border-fw-border rounded-card p-4 text-xs font-mono text-text-muted", className)}>
        NO_LAP_TIME_DATA_AVAILABLE
      </div>
    );
  }

  const allTimes = [...data, ...(comparativeData || [])].map((d) => d.lap_time);
  const minTime = Math.min(...allTimes) - 0.5;
  const maxTime = Math.max(...allTimes) + 0.5;
  const width = 600;
  const height = 180;
  const padding = 42; // Increased padding for clearer labels

  const maxLap = Math.max(...data.map((d) => d.lap), ...(comparativeData || []).map((d) => d.lap));
  const minLap = Math.min(...data.map((d) => d.lap), ...(comparativeData || []).map((d) => d.lap));

  const getX = (lap) => padding + ((lap - minLap) / Math.max(1, maxLap - minLap)) * (width - 2 * padding);
  const getY = (time) => height - padding - ((time - minTime) / Math.max(0.1, maxTime - minTime)) * (height - 2 * padding);

  const pathA = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(d.lap)} ${getY(d.lap_time)}`).join(" ");
  const pathB = comparativeData ? comparativeData.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(d.lap)} ${getY(d.lap_time)}`).join(" ") : "";

  const fastestLapTime = Math.min(...data.map((d) => d.lap_time));

  return (
    <>
      <div className={cn("bg-panel border border-fw-border rounded-card p-4 flex flex-col gap-3 relative", className)}>
        {/* Header */}
        <div className="flex justify-between items-center text-mono-meta font-mono">
          <span className="text-text-primary font-semibold tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-drs-cyan" />
            LAP_TIME_EVOLUTION // TELEMETRY_GRAPH
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-drs-cyan font-bold">{driverCode}</span>
              {comparativeDriverCode && <span className="text-f1-red font-bold">{comparativeDriverCode}</span>}
            </div>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-[11px] font-mono text-drs-cyan hover:text-drs-cyan-hover border border-drs-cyan/30 hover:border-drs-cyan px-2 py-0.5 rounded bg-drs-cyan/5 transition-colors"
            >
              [EXPAND]
            </button>
          </div>
        </div>

        {/* Chart SVG */}
        <div className="relative w-full h-[190px]">
          <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-full overflow-visible">
            {/* Y-Axis Title */}
            <text
              x={padding - 10}
              y={padding - 18}
              textAnchor="start"
              fill="#8E9AA8"
              fontSize="10"
              fontWeight="bold"
              className="font-mono tracking-wider"
            >
              LAP TIME (s) ↑
            </text>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const yVal = minTime + (maxTime - minTime) * (1 - pct);
              const yPos = getY(yVal);
              return (
                <g key={idx}>
                  <line x1={padding} y1={yPos} x2={width - padding} y2={yPos} stroke="#1C2025" strokeDasharray="3 3" />
                  <text x={padding - 8} y={yPos + 4} textAnchor="end" fill="#8E9AA8" fontSize="11" fontWeight="600" className="font-mono">
                    {yVal.toFixed(1)}s
                  </text>
                </g>
              );
            })}

            {/* X-Axis Gridlines & Lap Number Ticks */}
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

            <path d={pathA} fill="none" stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round" />
            {pathB && <path d={pathB} fill="none" stroke="#FF1801" strokeWidth="2" strokeDasharray="4 2" />}

            {data.map((d, i) => (
              <circle
                key={i}
                cx={getX(d.lap)}
                cy={getY(d.lap_time)}
                r={hoveredLap?.lap === d.lap ? 6 : 3.5}
                fill={d.lap_time === fastestLapTime ? "#10B981" : "#00E5FF"}
                className="transition-all cursor-pointer hover:scale-125"
                onMouseEnter={() => setHoveredLap(d)}
              />
            ))}
          </svg>

          {hoveredLap && (
            <div
              className="absolute z-20 bg-canvas/95 border border-drs-cyan/50 backdrop-blur-md px-3 py-2 rounded-card text-xs font-mono text-text-primary pointer-events-none shadow-xl"
              style={{
                left: `${Math.min(85, Math.max(15, (getX(hoveredLap.lap) / width) * 100))}%`,
                top: "10px",
                transform: "translateX(-50%)"
              }}
            >
              <div className="font-bold flex items-center gap-2">
                <span>LAP {hoveredLap.lap}:</span>
                <span className="text-drs-cyan font-bold">{hoveredLap.lap_time.toFixed(3)}s</span>
                {hoveredLap.lap_time === fastestLapTime && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded font-bold">
                    PERSONAL BEST
                  </span>
                )}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5 flex items-center justify-between gap-4">
                <span>DELTA TO PB:</span>
                <span className={hoveredLap.lap_time === fastestLapTime ? "text-emerald-400 font-bold" : "text-text-primary"}>
                  {hoveredLap.lap_time === fastestLapTime ? "0.000s" : `+${(hoveredLap.lap_time - fastestLapTime).toFixed(3)}s`}
                </span>
              </div>
              {hoveredLap.compound && (
                <div className="text-[10px] text-amber-400 font-bold mt-0.5 flex items-center justify-between gap-4">
                  <span>COMPOUND:</span>
                  <span>{hoveredLap.compound}</span>
                </div>
              )}
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
                <h3 className="font-mono text-sm font-bold text-drs-cyan tracking-wider uppercase">
                  LAP_TIME_EVOLUTION // DETAILED_TELEMETRY_VIEW
                </h3>
                <span className="font-mono text-xs text-text-muted">
                  DRIVER: {driverCode} | FASTEST LAP: {fastestLapTime.toFixed(3)}s | TOTAL LAPS: {data.length}
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1 font-mono text-xs text-text-muted hover:text-text-primary border border-fw-border rounded hover:bg-elevated"
              >
                [CLOSE]
              </button>
            </div>

            {/* High-Resolution Zoomed Chart */}
            <div className="relative w-full h-[280px] bg-canvas/90 p-4 rounded-card border border-fw-border">
              <svg viewBox={`0 0 800 240`} className="w-full h-full overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const yVal = minTime + (maxTime - minTime) * (1 - pct);
                  const yPos = 20 + pct * 180;
                  return (
                    <g key={idx}>
                      <line x1={60} y1={yPos} x2={760} y2={yPos} stroke="#1C2025" strokeDasharray="3 3" />
                      <text x={50} y={yPos + 5} textAnchor="end" fill="#8E9AA8" fontSize="13" fontWeight="bold" className="font-mono">
                        {yVal.toFixed(1)}s
                      </text>
                    </g>
                  );
                })}

                <path
                  d={data.map((d, i) => `${i === 0 ? "M" : "L"} ${60 + ((d.lap - minLap) / Math.max(1, maxLap - minLap)) * 700} ${200 - ((d.lap_time - minTime) / Math.max(0.1, maxTime - minTime)) * 180}`).join(" ")}
                  fill="none"
                  stroke="#00E5FF"
                  strokeWidth="3"
                />

                {data.map((d, i) => {
                  const cx = 60 + ((d.lap - minLap) / Math.max(1, maxLap - minLap)) * 700;
                  const cy = 200 - ((d.lap_time - minTime) / Math.max(0.1, maxTime - minTime)) * 180;
                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={4.5}
                      fill={d.lap_time === fastestLapTime ? "#10B981" : "#00E5FF"}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Lap-by-Lap Data Table */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs font-bold text-text-primary uppercase tracking-wider">
                LAP_BY_LAP_TIMINGS_LOG
              </span>
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto border border-fw-border rounded-card">
                <table className="w-full font-mono text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-elevated border-b border-fw-border text-text-muted text-[11px]">
                    <tr>
                      <th className="py-2 px-3">LAP #</th>
                      <th className="py-2 px-3">LAP TIME</th>
                      <th className="py-2 px-3">DELTA TO PB</th>
                      <th className="py-2 px-3">TYRE COMPOUND</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fw-border/40">
                    {data.map((d) => {
                      const isPB = d.lap_time === fastestLapTime;
                      const deltaPB = d.lap_time - fastestLapTime;
                      return (
                        <tr key={d.lap} className={cn("hover:bg-elevated/30 transition-colors", isPB ? "bg-drs-cyan/10" : "")}>
                          <td className="py-2 px-3 font-bold text-text-primary">LAP {d.lap}</td>
                          <td className={cn("py-2 px-3 font-bold", isPB ? "text-drs-cyan font-extrabold" : "text-text-primary")}>
                            {d.lap_time.toFixed(3)}s {isPB && "★ (PB)"}
                          </td>
                          <td className="py-2 px-3 text-text-muted">
                            {isPB ? "0.000s" : `+${deltaPB.toFixed(3)}s`}
                          </td>
                          <td className="py-2 px-3 text-amber-400 font-bold">
                            {d.compound || "-"}
                          </td>
                        </tr>
                      );
                    })}
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
