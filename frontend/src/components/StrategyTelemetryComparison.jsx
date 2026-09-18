import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Formats seconds into F1 standard lap time notation (e.g. 76.123 -> "1:16.123")
 */
function formatLapTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const remSecs = (seconds % 60).toFixed(3);
  if (mins > 0) {
    const padded = remSecs < 10 ? `0${remSecs}` : remSecs;
    return `${mins}:${padded}`;
  }
  return `${remSecs}s`;
}

/**
 * Returns compound badge styling based on F1 tyre compound name
 */
function getCompoundBadge(compound) {
  const c = String(compound || "").toUpperCase();
  if (c.includes("SOFT")) {
    return { label: "S", name: "SOFT", className: "bg-accent-danger/20 text-accent-danger border-accent-danger/40" };
  }
  if (c.includes("MEDIUM")) {
    return { label: "M", name: "MEDIUM", className: "bg-timing-yellow/20 text-timing-yellow border-timing-yellow/40" };
  }
  if (c.includes("HARD")) {
    return { label: "H", name: "HARD", className: "bg-white/20 text-white border-white/40" };
  }
  if (c.includes("INTER")) {
    return { label: "I", name: "INTER", className: "bg-timing-green/20 text-timing-green border-timing-green/40" };
  }
  if (c.includes("WET")) {
    return { label: "W", name: "WET", className: "bg-[#0070FF]/20 text-[#3671C6] border-[#0070FF]/40" };
  }
  return { label: "C", name: c || "UNKNOWN", className: "bg-surface-raised text-text-muted border-border-subtle" };
}

export function StrategyTelemetryComparison({ comparison, mode = "whatif", className }) {
  const [hoveredLap, setHoveredLap] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!comparison || (!comparison.actual && !comparison.simulated)) {
    return null;
  }

  const {
    scenario_label = "",
    driver_name = "Driver",
    actual = {},
    simulated = {}
  } = comparison;

  // 1. Extract and normalize lap times for both series
  const { combinedLaps, minLap, maxLap, minTime, maxTime, actualPitLaps, simulatedPitLaps } = useMemo(() => {
    const rawActual = actual.lap_times || [];
    const rawSim = simulated.lap_times || [];

    const actMap = new Map();
    rawActual.forEach((item, idx) => {
      if (typeof item === "object" && item !== null) {
        const lapNum = item.lap_number ?? (idx + 1);
        const time = item.lap_time ?? item.time;
        if (time && !isNaN(time)) {
          actMap.set(lapNum, {
            lap: lapNum,
            time: Number(time),
            compound: item.compound || (actual.compounds ? actual.compounds[0] : "HARD"),
            isPitLap: Boolean(item.is_pit_lap)
          });
        }
      } else if (typeof item === "number" && !isNaN(item)) {
        actMap.set(idx + 1, {
          lap: idx + 1,
          time: item,
          compound: actual.compounds ? actual.compounds[0] : "HARD",
          isPitLap: false
        });
      }
    });

    const simMap = new Map();
    rawSim.forEach((item, idx) => {
      if (typeof item === "object" && item !== null) {
        const lapNum = item.lap_number ?? (idx + 1);
        const time = item.lap_time ?? item.time;
        if (time && !isNaN(time)) {
          simMap.set(lapNum, {
            lap: lapNum,
            time: Number(time),
            compound: item.compound || (simulated.compounds ? simulated.compounds[0] : "HARD"),
            isPitLap: Boolean(item.is_pit_lap)
          });
        }
      } else if (typeof item === "number" && !isNaN(item)) {
        simMap.set(idx + 1, {
          lap: idx + 1,
          time: item,
          compound: simulated.compounds ? simulated.compounds[0] : "HARD",
          isPitLap: false
        });
      }
    });

    const allLapNums = Array.from(new Set([...actMap.keys(), ...simMap.keys()])).sort((a, b) => a - b);
    const validTimes = [];

    const combined = allLapNums.map((lap) => {
      const actEntry = actMap.get(lap);
      const simEntry = simMap.get(lap);
      const actTime = actEntry ? actEntry.time : null;
      const simTime = simEntry ? simEntry.time : null;

      if (actTime) validTimes.push(actTime);
      if (simTime) validTimes.push(simTime);

      return {
        lap,
        actualTime: actTime,
        actualCompound: actEntry?.compound,
        actualPit: actEntry?.isPitLap,
        simulatedTime: simTime,
        simulatedCompound: simEntry?.compound,
        simulatedPit: simEntry?.isPitLap,
        delta: actTime && simTime ? Number((actTime - simTime).toFixed(3)) : null
      };
    });

    const actPits = actual.pit_laps || [];
    const simPits = simulated.pit_laps || [];

    // Filter out extreme outlier laps (e.g. pit-lane in/out laps +15s or Safety Car laps) for scaling window
    const sortedTimes = [...validTimes].sort((a, b) => a - b);
    const median = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length / 2)] : 85;
    const reasonableTimes = validTimes.filter((t) => t < median * 1.35);

    const minT = reasonableTimes.length > 0 ? Math.min(...reasonableTimes) - 0.5 : (median - 2);
    const maxT = reasonableTimes.length > 0 ? Math.max(...reasonableTimes) + 1.0 : (median + 5);

    return {
      combinedLaps: combined,
      minLap: allLapNums.length > 0 ? allLapNums[0] : 1,
      maxLap: allLapNums.length > 0 ? allLapNums[allLapNums.length - 1] : 70,
      minTime: minT,
      maxTime: maxT,
      actualPitLaps: actPits,
      simulatedPitLaps: simPits
    };
  }, [actual, simulated]);

  // SVG dimensions
  const svgWidth = 760;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;

  const getX = (lap) => {
    if (maxLap === minLap) return padLeft;
    return padLeft + ((lap - minLap) / (maxLap - minLap)) * (svgWidth - padLeft - padRight);
  };

  const getY = (time) => {
    if (!time || isNaN(time)) return svgHeight - padBottom;
    const clamped = Math.max(minTime, Math.min(maxTime, time));
    return padTop + ((maxTime - clamped) / (maxTime - minTime)) * (svgHeight - padTop - padBottom);
  };

  // Build SVG path strings
  const actualPath = useMemo(() => {
    const pts = combinedLaps.filter((l) => l.actualTime !== null);
    if (pts.length === 0) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.lap).toFixed(1)} ${getY(p.actualTime).toFixed(1)}`).join(" ");
  }, [combinedLaps, minLap, maxLap, minTime, maxTime]);

  const simulatedPath = useMemo(() => {
    const pts = combinedLaps.filter((l) => l.simulatedTime !== null);
    if (pts.length === 0) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.lap).toFixed(1)} ${getY(p.simulatedTime).toFixed(1)}`).join(" ");
  }, [combinedLaps, minLap, maxLap, minTime, maxTime]);

  // Hovered lap data
  const currentHover = useMemo(() => {
    if (hoveredLap === null) return null;
    return combinedLaps.find((l) => l.lap === hoveredLap) || null;
  }, [hoveredLap, combinedLaps]);

  // Key Side-by-Side Numbers
  const actPos = actual.finish_position ? `P${actual.finish_position}` : "—";
  const simPos = simulated.finish_position ? `P${simulated.finish_position}` : "—";
  const posChange = simulated.position_change ?? 0;
  const posChangeStr = posChange > 0 ? `+${posChange}` : `${posChange}`;

  const actTimeTotal = actual.total_time_seconds ? `${actual.total_time_seconds.toFixed(2)}s` : "—";
  const simTimeTotal = simulated.total_time_seconds ? `${simulated.total_time_seconds.toFixed(2)}s` : "—";

  const netDelta = simulated.net_time_delta_s ?? 0;
  const netDeltaSign = netDelta >= 0 ? "+" : "";

  const actPitsStr = actualPitLaps.length > 0 ? actualPitLaps.map((l) => `Lap ${l}`).join(", ") : "None";
  const simPitsStr = simulatedPitLaps.length > 0 ? simulatedPitLaps.map((l) => `Lap ${l}`).join(", ") : "None";

  const actCompounds = Array.isArray(actual.compounds) ? actual.compounds.join(" ➔ ") : actual.compounds || "HARD";
  const simCompounds = Array.isArray(simulated.compounds) ? simulated.compounds.join(" ➔ ") : simulated.compounds || "HARD";

  const actTraffic = actual.traffic_loss_s !== undefined ? `${actual.traffic_loss_s}s` : "—";
  const simTraffic = simulated.traffic_loss_s !== undefined ? `${simulated.traffic_loss_s}s` : "—";

  return (
    <div className={cn("space-y-4 font-sans", className)}>
      {/* SECTION BANNER & SCENARIO IDENTIFIER */}
      <div className="rounded border border-border-medium bg-surface-base p-4 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent-primary" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase bg-accent-primary text-text-primary rounded-sm">
              {mode === "analysis" ? "Suggested Strategy Comparison" : "Counterfactual Telemetry"}
            </span>
            <span className="text-xs font-mono font-bold text-text-primary truncate">
              {scenario_label || `Pit Stop Timing Simulation • ${driver_name}`}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 text-text-primary font-bold">
              <span className="w-3 h-0.5 bg-white inline-block" />
              Actual Strategy
            </span>
            <span className="inline-flex items-center gap-1.5 text-accent-primary font-bold">
              <span className="w-3 h-0.5 bg-accent-primary border-t-2 border-dashed border-accent-primary inline-block" />
              Simulated Strategy
            </span>
          </div>
        </div>

        {/* 2-SERIES SVG LAP-TIME EVOLUTION CHART */}
        <div className="relative w-full bg-surface-raised border border-border-subtle rounded p-3 pt-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mb-2 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
              Lap-by-Lap Stint Pace Progression
            </span>
            <span className="type-tabular text-[10px]">
              Range: Laps {minLap}–{maxLap} • Scale: {minTime.toFixed(1)}s–{maxTime.toFixed(1)}s
            </span>
          </div>

          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-[200px] select-none overflow-visible"
              onMouseLeave={() => setHoveredLap(null)}
            >
              {/* Grid Lines (Horizontal Pace Levels) */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const yVal = padTop + pct * (svgHeight - padTop - padBottom);
                const tVal = maxTime - pct * (maxTime - minTime);
                return (
                  <g key={pct}>
                    <line
                      x1={padLeft}
                      y1={yVal}
                      x2={svgWidth - padRight}
                      y2={yVal}
                      stroke="var(--border-subtle, rgba(255,255,255,0.06))"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padLeft - 6}
                      y={yVal + 3}
                      textAnchor="end"
                      className="text-[9px] font-mono fill-text-muted select-none"
                    >
                      {formatLapTime(tVal)}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Grid Lines & Lap Markers */}
              {[10, 20, 30, 40, 50, 60, 70].filter((l) => l >= minLap && l <= maxLap).map((lap) => {
                const xVal = getX(lap);
                return (
                  <g key={lap}>
                    <line
                      x1={xVal}
                      y1={padTop}
                      x2={xVal}
                      y2={svgHeight - padBottom}
                      stroke="var(--border-subtle, rgba(255,255,255,0.04))"
                      strokeWidth="1"
                    />
                    <text
                      x={xVal}
                      y={svgHeight - padBottom + 14}
                      textAnchor="middle"
                      className="text-[9px] font-mono fill-text-muted select-none"
                    >
                      L{lap}
                    </text>
                  </g>
                );
              })}

              {/* Actual Pit Stop Markers (Vertical Dashed White Lines) */}
              {actualPitLaps.map((pLap) => {
                const xVal = getX(pLap);
                return (
                  <g key={`act-pit-${pLap}`}>
                    <line
                      x1={xVal}
                      y1={padTop}
                      x2={xVal}
                      y2={svgHeight - padBottom}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.6"
                    />
                    <rect
                      x={xVal - 24}
                      y={padTop - 16}
                      width={48}
                      height={14}
                      rx="2"
                      fill="#1E2024"
                      stroke="#FFFFFF"
                      strokeWidth="0.8"
                    />
                    <text
                      x={xVal}
                      y={padTop - 6}
                      textAnchor="middle"
                      className="text-[8px] font-mono font-bold fill-white"
                    >
                      ACT L{pLap}
                    </text>
                  </g>
                );
              })}

              {/* Simulated Pit Stop Markers (Vertical Dashed Red Lines) */}
              {simulatedPitLaps.map((pLap) => {
                const xVal = getX(pLap);
                return (
                  <g key={`sim-pit-${pLap}`}>
                    <line
                      x1={xVal}
                      y1={padTop}
                      x2={xVal}
                      y2={svgHeight - padBottom}
                      stroke="var(--accent-primary, #E10600)"
                      strokeWidth="1.8"
                      strokeDasharray="3 3"
                    />
                    <rect
                      x={xVal - 24}
                      y={padTop - 16}
                      width={48}
                      height={14}
                      rx="2"
                      fill="#1E2024"
                      stroke="var(--accent-primary, #E10600)"
                      strokeWidth="1"
                    />
                    <text
                      x={xVal}
                      y={padTop - 6}
                      textAnchor="middle"
                      className="text-[8px] font-mono font-bold fill-accent-primary"
                    >
                      SIM L{pLap}
                    </text>
                  </g>
                );
              })}

              {/* SERIES 1: Actual Race Pace (Solid White Line) */}
              {actualPath && (
                <path
                  d={actualPath}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
              )}

              {/* SERIES 2: Simulated Strategy Pace (Dashed Red Line) */}
              {simulatedPath && (
                <path
                  d={simulatedPath}
                  fill="none"
                  stroke="var(--accent-primary, #E10600)"
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Pit Stop Dots */}
              {combinedLaps.map((l) => {
                const isActPit = actualPitLaps.includes(l.lap);
                const isSimPit = simulatedPitLaps.includes(l.lap);
                if (!isActPit && !isSimPit) return null;

                const x = getX(l.lap);
                return (
                  <g key={`pit-dot-${l.lap}`}>
                    {isActPit && l.actualTime && (
                      <circle
                        cx={x}
                        cy={getY(l.actualTime)}
                        r="4.5"
                        fill="#FFFFFF"
                        stroke="#141517"
                        strokeWidth="1.5"
                      />
                    )}
                    {isSimPit && l.simulatedTime && (
                      <circle
                        cx={x}
                        cy={getY(l.simulatedTime)}
                        r="5"
                        fill="var(--accent-primary, #E10600)"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    )}
                  </g>
                );
              })}

              {/* Interactive Hover Crosshair & Dots */}
              {currentHover && (
                <g>
                  <line
                    x1={getX(currentHover.lap)}
                    y1={padTop}
                    x2={getX(currentHover.lap)}
                    y2={svgHeight - padBottom}
                    stroke="var(--border-focus, #E10600)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  {currentHover.actualTime && (
                    <circle
                      cx={getX(currentHover.lap)}
                      cy={getY(currentHover.actualTime)}
                      r="4.5"
                      fill="#FFFFFF"
                      stroke="#141517"
                      strokeWidth="1.5"
                    />
                  )}
                  {currentHover.simulatedTime && (
                    <circle
                      cx={getX(currentHover.lap)}
                      cy={getY(currentHover.simulatedTime)}
                      r="5"
                      fill="var(--accent-primary, #E10600)"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              )}

              {/* Invisible Hover Rectangles along X-axis */}
              {combinedLaps.map((l) => {
                const x = getX(l.lap);
                const step = (svgWidth - padLeft - padRight) / Math.max(1, maxLap - minLap);
                return (
                  <rect
                    key={`hover-col-${l.lap}`}
                    x={x - step / 2}
                    y={padTop}
                    width={step}
                    height={svgHeight - padTop - padBottom}
                    fill="transparent"
                    onMouseEnter={() => setHoveredLap(l.lap)}
                    className="cursor-crosshair"
                  />
                );
              })}
            </svg>
          </div>

          {/* Interactive Tooltip Card */}
          <div className="mt-2 min-h-[36px] flex items-center justify-between px-2 py-1.5 bg-surface-base border border-border-subtle rounded text-xs font-mono">
            {currentHover ? (
              <div className="flex flex-wrap items-center gap-3 w-full justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary">Lap {currentHover.lap}</span>
                  {currentHover.actualCompound && (
                    <span className={cn("px-1.5 py-0.2 text-[9px] rounded font-bold border", getCompoundBadge(currentHover.actualCompound).className)}>
                      {getCompoundBadge(currentHover.actualCompound).label}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 type-tabular">
                  <span>
                    <strong className="text-text-muted">Actual: </strong>
                    <span className="text-text-primary font-bold">{formatLapTime(currentHover.actualTime)}</span>
                  </span>

                  <span>
                    <strong className="text-accent-primary">Simulated: </strong>
                    <span className="text-accent-primary font-bold">{formatLapTime(currentHover.simulatedTime)}</span>
                  </span>

                  {currentHover.delta !== null && (
                    <span className={cn("font-bold", currentHover.delta > 0 ? "text-timing-green" : currentHover.delta < 0 ? "text-accent-danger" : "text-text-muted")}>
                      Δ {currentHover.delta > 0 ? `+${currentHover.delta.toFixed(3)}s` : `${currentHover.delta.toFixed(3)}s`}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-text-muted text-[11px] italic">
                Hover over the graph to inspect lap-by-lap timing deltas and tyre stint transitions.
              </span>
            )}
          </div>
        </div>

        {/* COMPACT SIDE-BY-SIDE STRATEGY COMPARISON TABLE */}
        <div className="mt-4 pt-3 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">
              Strategy Key Numbers Comparison
            </span>
            <span className="text-[10px] font-mono text-accent-primary">
              Physics Tradeoff Baseline
            </span>
          </div>

          <div className="overflow-x-auto rounded border border-border-subtle">
            <table className="w-full text-left text-xs font-mono type-tabular">
              <thead className="bg-surface-raised border-b border-border-subtle text-[10px] text-text-muted uppercase">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Metric / Dimension</th>
                  <th className="py-2.5 px-3 font-semibold text-text-primary">Actual Strategy (Baseline)</th>
                  <th className="py-2.5 px-3 font-semibold text-accent-primary">Simulated Counterfactual</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Net Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 bg-surface-base">
                {/* Finish Position */}
                <tr>
                  <td className="py-2.5 px-3 text-text-muted font-medium">Finishing Position</td>
                  <td className="py-2.5 px-3 font-bold text-text-primary">{actPos}</td>
                  <td className="py-2.5 px-3 font-bold text-accent-primary">{simPos}</td>
                  <td className={cn(
                    "py-2.5 px-3 font-bold text-right",
                    posChange > 0 ? "text-timing-green" : posChange < 0 ? "text-accent-danger" : "text-text-muted"
                  )}>
                    {posChangeStr} places
                  </td>
                </tr>

                {/* Total Race Time */}
                <tr>
                  <td className="py-2.5 px-3 text-text-muted font-medium">Total Race Duration</td>
                  <td className="py-2.5 px-3 font-medium text-text-primary">{actTimeTotal}</td>
                  <td className="py-2.5 px-3 font-medium text-accent-primary">{simTimeTotal}</td>
                  <td className={cn(
                    "py-2.5 px-3 font-bold text-right",
                    netDelta >= 0 ? "text-timing-green" : "text-accent-danger"
                  )}>
                    {netDeltaSign}{netDelta.toFixed(2)}s
                  </td>
                </tr>

                {/* Pit Stop Timing */}
                <tr>
                  <td className="py-2.5 px-3 text-text-muted font-medium">Primary Pit Stop</td>
                  <td className="py-2.5 px-3 text-text-secondary">{actPitsStr}</td>
                  <td className="py-2.5 px-3 text-accent-primary font-bold">{simPitsStr}</td>
                  <td className="py-2.5 px-3 text-right text-text-muted">
                    {simulatedPitLaps[0] && actualPitLaps[0] ? (
                      simulatedPitLaps[0] < actualPitLaps[0]
                        ? `${actualPitLaps[0] - simulatedPitLaps[0]} laps earlier`
                        : simulatedPitLaps[0] > actualPitLaps[0]
                        ? `${simulatedPitLaps[0] - actualPitLaps[0]} laps later`
                        : "Identical lap"
                    ) : "—"}
                  </td>
                </tr>

                {/* Tyre Compounds */}
                <tr>
                  <td className="py-2.5 px-3 text-text-muted font-medium">Tyre Strategy</td>
                  <td className="py-2.5 px-3 font-medium text-text-secondary">{actCompounds}</td>
                  <td className="py-2.5 px-3 font-bold text-accent-primary">{simCompounds}</td>
                  <td className="py-2.5 px-3 text-right text-text-muted">
                    {actCompounds === simCompounds ? "Same compounds" : "Alternative compound"}
                  </td>
                </tr>

                {/* Traffic Bottleneck Loss */}
                <tr>
                  <td className="py-2.5 px-3 text-text-muted font-medium">Traffic Loss Delta</td>
                  <td className="py-2.5 px-3 text-text-secondary">{actTraffic}</td>
                  <td className="py-2.5 px-3 text-accent-primary">{simTraffic}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-text-muted">
                    {simulated.traffic_loss_s !== undefined ? `${simulated.traffic_loss_s}s traffic penalty` : "—"}
                  </td>
                </tr>

                {/* Undercut Delta */}
                {simulated.undercut_gain_s !== undefined && (
                  <tr>
                    <td className="py-2.5 px-3 text-text-muted font-medium">Undercut Advantage</td>
                    <td className="py-2.5 px-3 text-text-secondary">0.00s</td>
                    <td className="py-2.5 px-3 text-accent-primary">{simulated.undercut_gain_s}s</td>
                    <td className={cn(
                      "py-2.5 px-3 font-bold text-right",
                      simulated.undercut_gain_s >= 0 ? "text-timing-green" : "text-accent-danger"
                    )}>
                      {simulated.undercut_gain_s >= 0 ? `+${simulated.undercut_gain_s}s` : `${simulated.undercut_gain_s}s`}
                    </td>
                  </tr>
                )}

                {/* Net Strategy Outcome */}
                <tr className="bg-surface-raised/60">
                  <td className="py-2.5 px-3 font-bold text-text-primary">Net Counterfactual Advantage</td>
                  <td className="py-2.5 px-3 font-medium text-text-muted">Baseline</td>
                  <td className={cn(
                    "py-2.5 px-3 font-bold",
                    netDelta >= 0 ? "text-timing-green" : "text-accent-danger"
                  )}>
                    {netDeltaSign}{netDelta.toFixed(2)}s
                  </td>
                  <td className={cn(
                    "py-2.5 px-3 font-bold text-right",
                    netDelta >= 0 ? "text-timing-green" : "text-accent-danger"
                  )}>
                    {netDelta >= 0 ? "Net Advantage" : "Net Loss"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Scoped Telemetry Protocol Disclaimer */}
          <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-text-muted px-1">
            <span>
              🔒 <strong>Scoped Telemetry Guarantee:</strong> Modeled exclusively on stint timelines, tyre degradation slopes, and pit loss.
            </span>
            <span className="hidden sm:inline">
              High-frequency throttle/brake traces excluded per simulation protocol.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
