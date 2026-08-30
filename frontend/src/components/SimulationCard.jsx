import { useState } from "react";
import { cn } from "@/lib/utils";

export function SimulationCard({ data, className }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!data) return null;

  const driverId = String(data.driver_id || "DRIVER").toUpperCase();
  const sessionId = String(data.session_id || "SESSION").toUpperCase();
  const actualPit = data.actual_pit_lap ?? "N/A";
  const simPit = data.simulated_pit_lap ?? "N/A";
  const compound = String(data.target_compound || "HARD").toUpperCase();
  const actualPos = data.actual_finishing_position ?? data.actual_position ?? "N/A";
  const projPos = data.projected_finishing_position ?? data.simulated_position ?? "N/A";
  const posChange = data.position_change ?? (typeof projPos === "number" && typeof actualPos === "number" ? actualPos - projPos : 0);
  
  // Net time delta
  const netGainSec = data.simulated_net_time_gain_ms !== undefined
    ? data.simulated_net_time_gain_ms / 1000
    : (data.net_time_gain_ms !== undefined ? data.net_time_gain_ms / 1000 : (data.undercut_gain || 0));
  
  const isPositiveGain = netGainSec > 0;
  const isNegativeGain = netGainSec < 0;

  const formatSecs = (sec) => {
    if (!sec || isNaN(sec)) return "N/A";
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs > 0 ? `${hrs}:` : ""}${mins.toString().padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
  };

  const actualTimeFormatted = data.actual_total_time_seconds ? formatSecs(data.actual_total_time_seconds) : "N/A";
  const projTimeFormatted = data.projected_total_time_seconds ? formatSecs(data.projected_total_time_seconds) : "N/A";

  const getPosBadgeColor = (delta) => {
    if (delta > 0) return "text-[#00E676] bg-[#00E676]/10 border-[#00E676]/30";
    if (delta < 0) return "text-[#FF1801] bg-[#FF1801]/10 border-[#FF1801]/30";
    return "text-text-muted bg-canvas/60 border-fw-border";
  };

  return (
    <div className={cn("evidence-card border border-fw-border bg-panel/70 rounded-card p-5 flex flex-col gap-4 font-sans backdrop-blur-md", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fw-border pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF1801] animate-pulse" />
            <span className="font-mono text-[10px] text-drs-cyan tracking-widest uppercase">
              WHAT_IF_SIMULATION // {driverId}
            </span>
          </div>
          <span className="text-xs text-text-muted font-mono">{sessionId}</span>
        </div>

        {/* Strategy Badge */}
        {data.recommended_strategy && (
          <div className="px-3 py-1 rounded-card bg-drs-cyan/10 border border-drs-cyan/30 text-drs-cyan font-mono text-[10px] uppercase tracking-wider font-bold">
            STRATEGY: {data.recommended_strategy}
          </div>
        )}
      </div>

      {/* Main KPI Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* 1. Pit Window Shift */}
        <div className="p-3.5 rounded-card bg-canvas/50 border border-fw-border flex flex-col justify-between">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Pit Stop Shift</span>
          <div className="flex items-baseline gap-2 my-1.5">
            <span className="text-sm font-mono text-text-muted line-through">Lap {actualPit}</span>
            <span className="text-sm text-text-muted">→</span>
            <span className="text-lg font-mono font-bold text-text-primary">
              Lap {simPit} <span className="text-xs text-drs-cyan font-normal">({compound})</span>
            </span>
          </div>
          <span className="text-[10px] text-text-muted font-mono">
            {typeof simPit === "number" && typeof actualPit === "number"
              ? `${Math.abs(actualPit - simPit)} Laps ${simPit < actualPit ? "Earlier (Undercut)" : "Later (Overcut)"}`
              : "Strategy Variation"}
          </span>
        </div>

        {/* 2. Track Position Delta */}
        <div className="p-3.5 rounded-card bg-canvas/50 border border-fw-border flex flex-col justify-between">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Track Position</span>
          <div className="flex items-baseline gap-2.5 my-1.5">
            <span className="text-2xl font-mono font-bold text-text-primary tabular-nums">
              P{projPos}
            </span>
            <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded border tabular-nums", getPosBadgeColor(posChange))}>
              {posChange > 0 ? `+${posChange} POS` : posChange < 0 ? `${posChange} POS` : "0 (UNCHANGED)"}
            </span>
          </div>
          <span className="text-[10px] text-text-muted font-mono">
            Actual Finish: P{actualPos}
          </span>
        </div>

        {/* 3. Net Race Time Delta */}
        <div className="p-3.5 rounded-card bg-canvas/50 border border-fw-border flex flex-col justify-between">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Net Time Gain / Delta</span>
          <div className="flex items-baseline gap-1 my-1.5">
            <span className={cn(
              "text-2xl font-mono font-bold tabular-nums",
              isPositiveGain ? "text-[#00E676]" : isNegativeGain ? "text-[#FF1801]" : "text-text-primary"
            )}>
              {isPositiveGain ? `+${netGainSec.toFixed(3)}s` : `${netGainSec.toFixed(3)}s`}
            </span>
          </div>
          <span className="text-[10px] text-text-muted font-mono">
            {isPositiveGain ? "Simulated Pace Advantage" : isNegativeGain ? "Simulated Net Time Deficit" : "Neutral Strategy Delta"}
          </span>
        </div>
      </div>

      {/* Detailed Diagnostics Table */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-card bg-canvas/30 border border-fw-border/60 text-xs font-mono">
        <div className="flex flex-col">
          <span className="text-[9px] text-text-muted uppercase">Actual Race Time</span>
          <span className="text-text-primary font-bold">{actualTimeFormatted}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-text-muted uppercase">Simulated Total Time</span>
          <span className="text-text-primary font-bold">{projTimeFormatted}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-text-muted uppercase">Traffic Loss Bottleneck</span>
          <span className="text-drs-cyan font-bold">{data.traffic_loss !== undefined ? `${data.traffic_loss.toFixed(3)}s` : "0.000s"}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-text-muted uppercase">Pit Lane Transit Loss</span>
          <span className="text-text-secondary font-bold">{data.pit_loss !== undefined ? `${data.pit_loss.toFixed(1)}s` : "23.3s"}</span>
        </div>
      </div>

      {/* Physics / Trace Notes */}
      {showDetails && (
        <div className="flex flex-col gap-1.5 p-3 rounded-card bg-canvas/60 border border-fw-border text-[10px] font-mono text-text-muted">
          <div className="text-text-primary font-semibold uppercase tracking-wider">Physics & Traffic Model:</div>
          <div>• Base pace & tire wear regression: Calibrated per-driver clean flying lap model.</div>
          <div>• Dirty air & traffic penalty: Dynamic bottleneck cap applied when trailing competitor within DRS/dirty air window.</div>
          <div>• Single-pit event guarantee: Seamless stint boundary consolidation.</div>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-fw-border/40 text-[10px] font-mono">
        <span className="text-text-muted">Engine: FastF1 1..N Timeline Monte Carlo / Deterministic Physics</span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-drs-cyan hover:text-drs-cyan-hover transition-colors font-mono uppercase tracking-wider"
        >
          {showDetails ? "[- HIDE SIMULATION NOTES]" : "[+ SHOW SIMULATION NOTES]"}
        </button>
      </div>
    </div>
  );
}
