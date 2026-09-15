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
    if (delta > 0) return "text-timing-green bg-timing-green/10 border-timing-green/30";
    if (delta < 0) return "text-accent-danger bg-accent-danger/10 border-accent-danger/30";
    return "text-text-muted bg-surface-base border-border-subtle";
  };

  return (
    <div className={cn("border border-border-subtle bg-surface-base rounded p-5 flex flex-col gap-4 font-sans shadow-sm", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            <span className="font-mono text-xs text-accent-primary font-bold tracking-widest uppercase">
              WHAT_IF_SIMULATION // {driverId}
            </span>
          </div>
          <span className="text-xs text-text-muted font-mono">{sessionId}</span>
        </div>

        {/* Strategy Badge */}
        {data.recommended_strategy && (
          <div className="px-3 py-1 rounded bg-surface-raised border border-border-subtle text-text-primary font-mono text-[11px] uppercase tracking-wider font-bold">
            STRATEGY: {data.recommended_strategy}
          </div>
        )}
      </div>

      {/* Main KPI Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* 1. Pit Window Shift */}
        <div className="p-3.5 rounded bg-surface-raised border border-border-subtle flex flex-col justify-between">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Pit Stop Shift</span>
          <div className="flex items-baseline gap-2 my-1.5 type-tabular">
            <span className="text-sm font-mono text-text-muted line-through">Lap {actualPit}</span>
            <span className="text-sm text-text-muted">→</span>
            <span className="text-lg font-mono font-bold text-text-primary">
              Lap {simPit} <span className="text-xs text-timing-yellow font-normal">({compound})</span>
            </span>
          </div>
          <span className="text-[10px] text-text-muted font-mono">
            {typeof simPit === "number" && typeof actualPit === "number"
              ? `${Math.abs(actualPit - simPit)} Laps ${simPit < actualPit ? "Earlier (Undercut)" : "Later (Overcut)"}`
              : "Strategy Variation"}
          </span>
        </div>

        {/* 2. Track Position Delta */}
        <div className="p-3.5 rounded bg-surface-raised border border-border-subtle flex flex-col justify-between">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Track Position</span>
          <div className="flex items-baseline gap-2.5 my-1.5 type-tabular">
            <span className="text-2xl font-mono font-bold text-text-primary">
              P{projPos}
            </span>
            <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded border", getPosBadgeColor(posChange))}>
              {posChange > 0 ? `+${posChange} POS` : posChange < 0 ? `${posChange} POS` : "0 (UNCHANGED)"}
            </span>
          </div>
          <span className="text-[10px] text-text-muted font-mono type-tabular">
            Actual Finish: P{actualPos}
          </span>
        </div>

        {/* 3. Net Race Time Delta */}
        <div className="p-3.5 rounded bg-surface-raised border border-border-subtle flex flex-col justify-between">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Net Time Gain / Delta</span>
          <div className="flex items-baseline gap-1 my-1.5 type-tabular">
            <span className={cn(
              "text-2xl font-mono font-bold",
              isPositiveGain ? "text-timing-green" : isNegativeGain ? "text-accent-danger" : "text-text-primary"
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded bg-surface-raised border border-border-subtle text-xs font-mono type-tabular">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted uppercase">Actual Race Time</span>
          <span className="text-text-primary font-bold">{actualTimeFormatted}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted uppercase">Simulated Total Time</span>
          <span className="text-text-primary font-bold">{projTimeFormatted}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted uppercase">Traffic Loss Bottleneck</span>
          <span className="text-timing-yellow font-bold">{data.traffic_loss !== undefined ? `${data.traffic_loss.toFixed(3)}s` : "0.000s"}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted uppercase">Pit Lane Transit Loss</span>
          <span className="text-text-secondary font-bold">{data.pit_loss !== undefined ? `${data.pit_loss.toFixed(1)}s` : "23.3s"}</span>
        </div>
      </div>

      {/* Physics / Trace Notes */}
      {showDetails && (
        <div className="flex flex-col gap-1.5 p-3 rounded bg-surface-raised border border-border-subtle text-[11px] font-mono text-text-muted">
          <div className="text-text-primary font-bold uppercase tracking-wider">Physics & Traffic Model:</div>
          <div>• Base pace & tire wear regression: Calibrated per-driver clean flying lap model.</div>
          <div>• Dirty air & traffic penalty: Dynamic bottleneck cap applied when trailing competitor within DRS/dirty air window.</div>
          <div>• Single-pit event guarantee: Seamless stint boundary consolidation.</div>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs font-mono">
        <span className="text-text-muted">Engine: FastF1 1..N Timeline Monte Carlo / Deterministic Physics</span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-accent-primary hover:underline transition-colors font-mono uppercase tracking-wider font-bold"
        >
          {showDetails ? "[- HIDE SIMULATION NOTES]" : "[+ SHOW SIMULATION NOTES]"}
        </button>
      </div>
    </div>
  );
}
