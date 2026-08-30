import { useState } from "react";
import { cn } from "@/lib/utils";

export function ScoreCard({ data, className }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!data) return null;

  const driverId = String(data.driver_id || "DRIVER").toUpperCase();
  const sessionId = String(data.session_id || "SESSION").toUpperCase();
  const compositeScore = typeof data.composite_score === "number" ? data.composite_score.toFixed(1) : "N/A";

  const dimensions = [
    {
      key: "pace",
      name: "Pace Index",
      score: data.pace_score,
      color: "#00E5FF", // DRS Cyan
      desc: "Fastest clean laps vs grid/teammate optimal",
      details: data.breakdown?.pace ? [
        { label: "Optimal Lap", val: data.breakdown.pace.optimal_lap ? `${data.breakdown.pace.optimal_lap.toFixed(3)}s` : "N/A" },
        { label: "Mean Pace", val: data.breakdown.pace.mean_lap ? `${data.breakdown.pace.mean_lap.toFixed(3)}s` : "N/A" },
        { label: "Std Deviation", val: data.breakdown.pace.std_dev ? `±${data.breakdown.pace.std_dev.toFixed(3)}s` : "N/A" }
      ] : []
    },
    {
      key: "consistency",
      name: "Consistency",
      score: data.consistency_score,
      color: "#00E676", // Neon Green
      desc: "Flying lap variance excluding neutralizations",
      details: data.breakdown?.consistency ? [
        { label: "Lap Variance", val: data.breakdown.consistency.lap_variance ? `σ² ${data.breakdown.consistency.lap_variance.toFixed(3)}` : "N/A" },
        { label: "Clean Air Laps", val: data.breakdown.consistency.clean_air_laps ?? "N/A" },
        { label: "SC Laps Excl.", val: data.breakdown?.consistency?.sc_laps ?? "0" }
      ] : []
    },
    {
      key: "racecraft",
      name: "Racecraft",
      score: data.racecraft_score,
      color: "#FFB800", // Electric Amber
      desc: "Grid-to-flag delta and track combat efficiency",
      details: data.breakdown?.racecraft ? [
        { label: "Grid Position", val: data.breakdown.racecraft.grid_position ? `P${data.breakdown.racecraft.grid_position}` : "N/A" },
        { label: "Finish Position", val: data.breakdown.racecraft.finish_position ? `P${data.breakdown.racecraft.finish_position}` : "N/A" },
        { label: "Position Delta", val: data.breakdown.racecraft.position_delta !== undefined ? `${data.breakdown.racecraft.position_delta >= 0 ? "+" : ""}${data.breakdown.racecraft.position_delta}` : "0" }
      ] : []
    },
    {
      key: "strategy",
      name: "Strategy Execution",
      score: data.strategy_score,
      color: "#D500F9", // Neon Purple
      desc: "Pit window timing and undercut conversion",
      details: data.breakdown?.strategy ? [
        { label: "Undercut Success", val: data.breakdown.strategy.undercut_success ? "YES" : "NO" },
        { label: "Pit Loss Cost", val: data.breakdown.strategy.pit_loss ? `${data.breakdown.strategy.pit_loss.toFixed(1)}s` : "N/A" }
      ] : []
    },
    {
      key: "tire",
      name: "Tyre Management",
      score: data.tire_score,
      color: "#FFD600", // Neon Yellow
      desc: "Degradation slope vs session grid median",
      details: data.breakdown?.tire ? [
        { label: "Driver Deg", val: data.breakdown.tire.deg_slope ? `${data.breakdown.tire.deg_slope.toFixed(4)} s/lap` : "N/A" },
        { label: "Grid Median Deg", val: data.breakdown.tire.grid_median_deg ? `${data.breakdown.tire.grid_median_deg.toFixed(4)} s/lap` : "N/A" }
      ] : []
    }
  ];

  const getScoreColor = (score) => {
    if (typeof score !== "number") return "text-text-muted";
    if (score >= 80) return "text-[#00E676]";
    if (score >= 60) return "text-[#00E5FF]";
    if (score >= 40) return "text-[#FFB800]";
    return "text-[#FF1801]";
  };

  return (
    <div className={cn("evidence-card border border-fw-border bg-panel/70 rounded-card p-5 flex flex-col gap-4 font-sans backdrop-blur-md", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fw-border pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
            <span className="font-mono text-[10px] text-drs-cyan tracking-widest uppercase">
              DRIVER_SCORECARD // {driverId}
            </span>
          </div>
          <span className="text-xs text-text-muted font-mono">{sessionId}</span>
        </div>

        {/* Composite Score Gauge */}
        <div className="flex items-center gap-3 bg-canvas/60 px-3.5 py-1.5 rounded-card border border-fw-border">
          <div className="flex flex-col text-right">
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Composite Index</span>
            <span className={cn("text-xl font-mono font-bold tabular-nums", getScoreColor(data.composite_score))}>
              {compositeScore}
              <span className="text-xs text-text-muted font-normal"> / 100</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5-Dimension Score Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        {dimensions.map((dim) => {
          const scoreVal = typeof dim.score === "number" ? dim.score : 0;
          const scoreDisplay = typeof dim.score === "number" ? dim.score.toFixed(1) : "N/A";
          return (
            <div
              key={dim.key}
              className="flex flex-col gap-2 p-3 rounded-card bg-canvas/40 border border-fw-border/60 hover:border-fw-border transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dim.color }} />
                  <span className="text-xs font-semibold text-text-primary tracking-wide">{dim.name}</span>
                </div>
                <span className={cn("font-mono text-xs font-bold tabular-nums", getScoreColor(dim.score))}>
                  {scoreDisplay}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-elevated overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(0, scoreVal))}%`,
                    backgroundColor: dim.color
                  }}
                />
              </div>

              <span className="text-[10px] text-text-muted font-mono leading-tight">{dim.desc}</span>

              {/* Sub-parameters */}
              {showDetails && dim.details.length > 0 && (
                <div className="mt-1 pt-2 border-t border-fw-border/40 grid grid-cols-2 gap-1.5 text-[9px] font-mono">
                  {dim.details.map((d, i) => (
                    <div key={i} className="flex justify-between gap-1 text-text-muted">
                      <span>{d.label}:</span>
                      <span className="text-text-primary font-medium">{d.val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-fw-border/40 text-[10px] font-mono">
        <span className="text-text-muted">Formula Model: FastF1 Real Ingestion Data</span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-drs-cyan hover:text-drs-cyan-hover transition-colors font-mono uppercase tracking-wider"
        >
          {showDetails ? "[- HIDE MATHEMATICAL PARAMETERS]" : "[+ SHOW MATHEMATICAL PARAMETERS]"}
        </button>
      </div>
    </div>
  );
}
