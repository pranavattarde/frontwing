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
      <div className={cn("bg-surface-base border border-border-subtle rounded p-4 text-xs font-mono text-text-muted", className)}>
        No lap time data available
      </div>
    );
  }

  const allTimes = [...data, ...(comparativeData || [])].map((d) => d.lap_time);
  const minTime = Math.min(...allTimes) - 0.5;
  const maxTime = Math.max(...allTimes) + 0.5;
  const width = 600;
  const height = 180;
  const padding = 42;

  const maxLap = Math.max(...data.map((d) => d.lap), ...(comparativeData || []).map((d) => d.lap));
  const minLap = Math.min(...data.map((d) => d.lap), ...(comparativeData || []).map((d) => d.lap));

  const getX = (lap) => padding + ((lap - minLap) / Math.max(1, maxLap - minLap)) * (width - 2 * padding);
  const getY = (time) => height - padding - ((time - minTime) / Math.max(0.1, maxTime - minTime)) * (height - 2 * padding);

  const pathA = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(d.lap)} ${getY(d.lap_time)}`).join(" ");
  const pathB = comparativeData ? comparativeData.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(d.lap)} ${getY(d.lap_time)}`).join(" ") : "";

  const fastestLapTime = Math.min(...data.map((d) => d.lap_time));

  return (
    <>
      <div className={cn("bg-surface-base border border-border-subtle rounded p-4 flex flex-col gap-3 relative", className)}>
        {/* Header */}
        <div className="flex justify-between items-center font-mono text-xs">
          <span className="text-text-primary font-bold tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            Lap Time Evolution • Telemetry Graph
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-accent-primary font-bold">{driverCode}</span>
              {comparativeDriverCode && <span className="text-timing-yellow font-bold">{comparativeDriverCode}</span>}
            </div>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-[11px] font-mono text-accent-primary hover:text-accent-primary-hover border border-accent-primary/30 hover:border-accent-primary px-2 py-0.5 rounded bg-accent-primary/5 hover:bg-accent-primary/10 transition-colors font-semibold"
            >
              [Expand]
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
              Lap Time (s) ↑
            </text>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const yVal = minTime + (maxTime - minTime) * (1 - pct);
              const yPos = getY(yVal);
              return (
                <g key={idx}>
                  <line x1={padding} y1={yPos} x2={width - padding} y2={yPos} stroke="#1C2025" strokeDasharray="3 3" />
                  <text x={padding - 8} y={yPos + 4} textAnchor="end" fill="#8E9AA8" fontSize="11" fontWeight="600" className="font-mono type-tabular">
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
                    <text x={xPos} y={height - padding + 16} textAnchor="middle" fill="#8E9AA8" fontSize="10" fontWeight="600" className="font-mono type-tabular">
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
              Lap Number →
            </text>

            <path d={pathA} fill="none" stroke="#E10600" strokeWidth="2.5" strokeLinecap="round" />
            {pathB && <path d={pathB} fill="none" stroke="#FFD600" strokeWidth="2" strokeDasharray="4 2" />}

            {data.map((d, i) => {
              const isHovered = hoveredLap?.lap === d.lap;
              const isPB = d.lap_time === fastestLapTime;
              return (
                <circle
                  key={i}
                  cx={getX(d.lap)}
                  cy={getY(d.lap_time)}
                  r={isHovered ? 6.5 : 3.5}
                  fill={isPB ? "#00D26A" : "#E10600"}
                  stroke={isHovered ? "#FFFFFF" : "rgba(0,0,0,0.5)"}
                  strokeWidth={isHovered ? 2 : 0.5}
                  filter={isHovered ? (isPB ? "drop-shadow(0 0 6px rgba(0,210,106,0.9))" : "drop-shadow(0 0 6px rgba(225,6,0,0.9))") : undefined}
                  className="cursor-pointer transition-[r,stroke-width] duration-150 ease-out"
                  onMouseEnter={() => setHoveredLap(d)}
                />
              );
            })}
          </svg>

          {hoveredLap && (
            <div
              className="absolute z-20 bg-surface-elevated/95 border border-border-strong backdrop-blur-md px-3 py-2 rounded text-xs font-mono text-text-primary pointer-events-none shadow-xl"
              style={{
                left: `${Math.min(85, Math.max(15, (getX(hoveredLap.lap) / width) * 100))}%`,
                top: "10px",
                transform: "translateX(-50%)"
              }}
            >
              <div className="font-bold border-b border-border-subtle pb-1 mb-1 flex items-center justify-between gap-4">
                <span>Lap {hoveredLap.lap}</span>
                {hoveredLap.lap_time === fastestLapTime && (
                  <span className="text-timing-green font-bold text-[10px]">★ Personal Best</span>
                )}
              </div>
              <div className="flex justify-between gap-4 type-tabular">
                <span className="text-text-muted">Time:</span>
                <span className="font-bold text-text-primary">{hoveredLap.lap_time.toFixed(3)}s</span>
              </div>
              {hoveredLap.compound && (
                <div className="flex justify-between gap-4">
                  <span className="text-text-muted">Tyre:</span>
                  <span className="font-bold text-timing-yellow uppercase">{hoveredLap.compound}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full Modal Deep Dive */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-base border border-border-strong rounded w-full max-w-4xl p-6 flex flex-col gap-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-subtle pb-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs font-bold text-accent-primary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                  Detailed Lap Time Telemetry • Full Trace
                </span>
                <h3 className="text-lg font-heading font-bold text-text-primary">
                  {driverCode} Lap Time Telemetry Distribution
                </h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-text-muted hover:text-text-primary font-mono text-xs px-2 py-1 rounded bg-surface-raised border border-border-subtle"
              >
                [Close]
              </button>
            </div>

            {/* Enlarged Chart SVG */}
            <div className="w-full h-[240px]">
              <svg viewBox="0 0 800 240" className="w-full h-full overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const yVal = minTime + (maxTime - minTime) * (1 - pct);
                  const yPos = 200 - pct * 180;
                  return (
                    <g key={idx}>
                      <line x1={60} y1={yPos} x2={760} y2={yPos} stroke="#1C2025" strokeDasharray="3 3" />
                      <text x={50} y={yPos + 5} textAnchor="end" fill="#8E9AA8" fontSize="13" fontWeight="bold" className="font-mono type-tabular">
                        {yVal.toFixed(1)}s
                      </text>
                    </g>
                  );
                })}

                <path
                  d={data.map((d, i) => `${i === 0 ? "M" : "L"} ${60 + ((d.lap - minLap) / Math.max(1, maxLap - minLap)) * 700} ${200 - ((d.lap_time - minTime) / Math.max(0.1, maxTime - minTime)) * 180}`).join(" ")}
                  fill="none"
                  stroke="#E10600"
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
                      fill={d.lap_time === fastestLapTime ? "#00D26A" : "#E10600"}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Lap-by-Lap Data Table */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs font-bold text-text-primary uppercase tracking-wider">
                Lap-by-Lap Timings Log
              </span>
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto border border-border-subtle rounded">
                <table className="w-full font-mono text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-surface-raised border-b border-border-subtle text-text-muted text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Lap #</th>
                      <th className="py-2 px-3">Lap Time</th>
                      <th className="py-2 px-3">Delta to PB</th>
                      <th className="py-2 px-3">Tyre Compound</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {data.map((d) => {
                      const isPB = d.lap_time === fastestLapTime;
                      const deltaPB = d.lap_time - fastestLapTime;
                      return (
                        <tr key={d.lap} className={cn("hover:bg-surface-raised transition-colors type-tabular", isPB ? "bg-accent-primary/10" : "")}>
                          <td className="py-2 px-3 font-bold text-text-primary">Lap {d.lap}</td>
                          <td className={cn("py-2 px-3 font-bold", isPB ? "text-timing-green font-extrabold" : "text-text-primary")}>
                            {d.lap_time.toFixed(3)}s {isPB && "★ (PB)"}
                          </td>
                          <td className="py-2 px-3 text-text-muted">
                            {isPB ? "0.000s" : `+${deltaPB.toFixed(3)}s`}
                          </td>
                          <td className="py-2 px-3 text-timing-yellow font-bold">
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
