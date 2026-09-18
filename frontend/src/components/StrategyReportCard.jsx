import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { StrategyTelemetryComparison } from "./StrategyTelemetryComparison";

export function StrategyReportCard({ report, driverName, grandPrix, season, latencyMs }) {
  if (!report) return null;

  const {
    what_happened = {},
    strategy_cost_analysis = {},
    suggested_alternative = {},
    suggested_alternative_narrative = ""
  } = report;

  const getCompoundColor = (compound) => {
    const c = String(compound || "").toUpperCase();
    if (c.includes("SOFT")) return "bg-accent-danger/15 text-accent-danger border-accent-danger/30";
    if (c.includes("MEDIUM")) return "bg-timing-yellow/15 text-timing-yellow border-timing-yellow/30";
    if (c.includes("HARD")) return "bg-white/10 text-white border-white/30";
    if (c.includes("INTER")) return "bg-timing-green/15 text-timing-green border-timing-green/30";
    if (c.includes("WET")) return "bg-[#0070FF]/15 text-[#3671C6] border-[#0070FF]/30";
    return "bg-surface-raised text-text-muted border-border-subtle";
  };

  const getScoreColor = (val) => {
    if (val >= 80) return "text-timing-green";
    if (val >= 60) return "text-text-primary";
    if (val >= 40) return "text-timing-yellow";
    return "text-accent-danger";
  };

  const getScoreBg = (val) => {
    if (val >= 80) return "bg-timing-green";
    if (val >= 60) return "bg-accent-primary";
    if (val >= 40) return "bg-timing-yellow";
    return "bg-accent-danger";
  };

  const posDelta = what_happened.position_delta ?? 0;
  const posDeltaStr = posDelta > 0 ? `+${posDelta}` : `${posDelta}`;
  const netDelta = suggested_alternative.net_time_delta_s ?? 0;
  const netDeltaSign = netDelta >= 0 ? "+" : "";

  return (
    <div className="space-y-6">
      {/* SECTION 1: HEADER & EXECUTIVE VERDICT */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded border border-border-subtle bg-surface-base p-5 relative overflow-hidden shadow-sm"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-accent-primary" />
        
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase bg-accent-primary text-text-primary rounded-sm">
              Strategy Debrief
            </span>
            <span className="text-xs font-mono text-text-muted">
              {season} {grandPrix} • {driverName}
            </span>
          </div>
          {latencyMs && (
            <span className="text-xs font-mono text-text-muted type-tabular">
              Computed in {latencyMs}ms
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 type-tabular">
          <div className="p-3 bg-surface-raised border border-border-subtle rounded">
            <span className="text-[10px] font-mono text-text-muted block mb-1">Grid Position</span>
            <span className="text-xl font-bold font-mono text-text-primary">
              {what_happened.grid_position ? `P${what_happened.grid_position}` : "—"}
            </span>
          </div>
          <div className="p-3 bg-surface-raised border border-border-subtle rounded">
            <span className="text-[10px] font-mono text-text-muted block mb-1">Finish Position</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-text-primary">
                {what_happened.finish_position ? `P${what_happened.finish_position}` : "—"}
              </span>
              <span className={cn(
                "text-xs font-mono font-bold",
                posDelta > 0 ? "text-timing-green" : posDelta < 0 ? "text-accent-danger" : "text-text-muted"
              )}>
                ({posDeltaStr})
              </span>
            </div>
          </div>
          <div className="p-3 bg-surface-raised border border-border-subtle rounded">
            <span className="text-[10px] font-mono text-text-muted block mb-1">Composite Score</span>
            <span className={cn("text-xl font-bold font-mono", getScoreColor(strategy_cost_analysis.composite_score || 0))}>
              {strategy_cost_analysis.composite_score?.toFixed(1) || "—"}/100
            </span>
          </div>
          <div className="p-3 bg-surface-raised border border-border-subtle rounded">
            <span className="text-[10px] font-mono text-text-muted block mb-1">Race Status</span>
            <span className="text-sm font-semibold font-mono text-text-secondary truncate block">
              {what_happened.status || "Finished"} ({what_happened.points || 0} pts)
            </span>
          </div>
        </div>
      </motion.div>

      {/* SECTION 2: WHAT HAPPENED */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded border border-border-subtle bg-surface-base p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-primary" />
            <h3 className="text-sm font-bold tracking-wider font-mono text-text-primary">
              1. What Happened (Classification & Stint Timeline)
            </h3>
          </div>
          <span className="text-xs font-mono text-text-muted type-tabular">
            {what_happened.laps_completed || 0} Laps Completed
          </span>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {what_happened.narrative}
        </p>

        {/* Stints Visual Breakdown */}
        {what_happened.stints && what_happened.stints.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <span className="text-[10px] font-mono text-text-muted block mb-2">
              Actual Stints & Tyre Strategy
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 type-tabular">
              {what_happened.stints.map((stint) => (
                <div
                  key={stint.stint}
                  className="p-3 rounded border border-border-subtle bg-surface-raised flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-mono text-text-muted block">
                      Stint {stint.stint} (Laps {stint.start_lap}–{stint.end_lap})
                    </span>
                    <span className="text-xs font-mono font-bold text-text-primary">
                      {stint.stint_length} Laps
                    </span>
                  </div>
                  <span className={cn("px-2 py-0.5 text-xs font-mono font-bold border rounded", getCompoundColor(stint.compound))}>
                    {stint.compound}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pit Stops Visual */}
        {what_happened.pit_stops && what_happened.pit_stops.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-mono text-text-muted">Pit Stops:</span>
              {what_happened.openf1_cross_check && (
                <span className={cn(
                  "text-[10px] font-mono px-2 py-0.5 rounded border",
                  what_happened.openf1_cross_check.status === "verified" ? "text-timing-green border-timing-green/30 bg-timing-green/10" :
                  what_happened.openf1_cross_check.status === "discrepancy" ? "text-timing-yellow border-timing-yellow/30 bg-timing-yellow/10" :
                  "text-text-muted border-border-subtle bg-surface-raised"
                )}>
                  {what_happened.openf1_cross_check.status === "verified" ? "✓ OpenF1 Cross-Check: Verified" :
                   what_happened.openf1_cross_check.status === "discrepancy" ? "⚠ OpenF1 Cross-Check: Discrepancy Flagged" :
                   "OpenF1: Unavailable (FastF1 Primary)"}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 type-tabular">
              {what_happened.pit_stops.map((ps) => (
                <span
                  key={ps.pit_stop_number}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-surface-raised border border-border-subtle"
                >
                  <span className="text-text-muted">Stop {ps.pit_stop_number}:</span>
                  <span className="text-text-primary font-bold">Lap {ps.lap}</span>
                  <span className="text-text-muted">({ps.compound_in} ➔ {ps.compound_out})</span>
                  {ps.cross_check_agrees === false && (
                    <span className="text-[10px] text-accent-danger font-bold bg-accent-danger/10 px-1.5 py-0.5 rounded border border-accent-danger/30">
                      OpenF1: Lap {ps.openf1_lap ?? "—"}
                    </span>
                  )}
                  {ps.cross_check_agrees === true && (
                    <span className="text-[10px] text-timing-green font-bold bg-timing-green/10 px-1.5 py-0.5 rounded">
                      ✓ OpenF1
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Discrepancy Alert Banner */}
            {what_happened.openf1_cross_check?.discrepancies?.length > 0 && (
              <div className="mt-2.5 p-2.5 rounded bg-timing-yellow/10 border border-timing-yellow/30 text-xs font-mono text-timing-yellow space-y-1">
                {what_happened.openf1_cross_check.discrepancies.map((disc, dIdx) => (
                  <div key={dIdx} className="flex items-start gap-1.5">
                    <span className="font-bold">⚠</span>
                    <span>{disc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* SECTION 3: STRATEGY COST ANALYSIS */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded border border-border-subtle bg-surface-base p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-timing-yellow" />
            <h3 className="text-sm font-bold tracking-wider font-mono text-text-primary">
              2. Strategy Cost Analysis (Grid-to-Finish Breakdown)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-text-muted">
            Computed Telemetry Metrics
          </span>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-5">
          {strategy_cost_analysis.narrative}
        </p>

        {/* 5 Core Scoring Metric Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 type-tabular">
          {[
            { label: "Strategy Efficiency", val: strategy_cost_analysis.strategy_score, desc: "Pit stop timing & window optimization" },
            { label: "Pace Efficiency", val: strategy_cost_analysis.pace_score, desc: "Clean-air speed vs optimal fuel model" },
            { label: "Tyre Management", val: strategy_cost_analysis.tire_score, desc: "Degradation slope vs grid median" },
            { label: "Pit Stop Efficiency", val: strategy_cost_analysis.pitstop_score, desc: "Stationary duration & pit loss" },
            { label: "Race Execution", val: strategy_cost_analysis.execution_score, desc: "Overtakes, incidents & start execution" },
            { label: "Composite Rating", val: strategy_cost_analysis.composite_score, desc: "Aggregated overall performance score" }
          ].map((metric) => (
            <div key={metric.label} className="p-3 bg-surface-raised border border-border-subtle rounded">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-text-muted tracking-wider">{metric.label}</span>
                <span className={cn("text-xs font-mono font-bold", getScoreColor(metric.val || 0))}>
                  {metric.val?.toFixed(1) || "—"}/100
                </span>
              </div>
              <div className="h-1.5 w-full bg-surface-base rounded-full overflow-hidden mb-1.5">
                <div
                  className={cn("h-full transition-all duration-300", getScoreBg(metric.val || 0))}
                  style={{ width: `${Math.min(100, Math.max(0, metric.val || 0))}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-text-muted block truncate">
                {metric.desc}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* SECTION 4: SUGGESTED ALTERNATIVE STRATEGY */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded border border-border-medium bg-surface-base p-5 relative overflow-hidden shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider uppercase bg-accent-primary text-text-primary rounded-sm">
              🏆 Best Simulated Alternative
            </span>
            <h3 className="text-sm font-bold tracking-wider font-mono text-text-primary">
              3. Suggested Alternative Strategy
            </h3>
          </div>
          <span className="text-xs font-mono text-accent-primary font-bold type-tabular">
            {suggested_alternative.candidates_evaluated || 0} Simulations Tested
          </span>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {suggested_alternative_narrative}
        </p>

        {/* Counterfactual Delta Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 type-tabular">
          <div className="p-3 bg-surface-raised border border-border-subtle rounded">
            <span className="text-[10px] font-mono text-text-muted block mb-1">Optimal Pit Lap</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-accent-primary">
                Lap {suggested_alternative.simulated_pit_lap}
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                (vs {suggested_alternative.actual_pit_lap})
              </span>
            </div>
          </div>

          <div className="p-3 bg-surface-raised border border-border-subtle rounded">
            <span className="text-[10px] font-mono text-text-muted block mb-1">Optimal Compound</span>
            <span className={cn("px-2 py-0.5 text-xs font-mono font-bold border rounded inline-block", getCompoundColor(suggested_alternative.target_compound))}>
              {suggested_alternative.target_compound}
            </span>
          </div>

          <div className="p-3 bg-surface-raised border border-border-subtle rounded">
            <span className="text-[10px] font-mono text-text-muted block mb-1">Projected Finish</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-text-primary">
                P{suggested_alternative.simulated_finish_position}
              </span>
              <span className={cn(
                "text-xs font-mono font-bold",
                (suggested_alternative.projected_position_change || 0) > 0 ? "text-timing-green" : (suggested_alternative.projected_position_change || 0) < 0 ? "text-accent-danger" : "text-text-muted"
              )}>
                ({(suggested_alternative.projected_position_change || 0) > 0 ? `+${suggested_alternative.projected_position_change}` : suggested_alternative.projected_position_change || 0})
              </span>
            </div>
          </div>

          <div className="p-3 bg-surface-raised border border-border-subtle rounded">
            <span className="text-[10px] font-mono text-text-muted block mb-1">Net Time Delta</span>
            <span className={cn(
              "text-xl font-bold font-mono",
              netDelta >= 0 ? "text-timing-green" : "text-accent-danger"
            )}>
              {netDeltaSign}{netDelta}s
            </span>
          </div>
        </div>

        {/* Physics breakdown pills */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border-subtle text-xs font-mono text-text-muted type-tabular">
          <span>Physics Tradeoff:</span>
          <span className="px-2.5 py-1 rounded bg-surface-raised border border-border-subtle text-text-primary">
            Undercut Gain: {suggested_alternative.undercut_gain_s || 0}s
          </span>
          <span className="px-2.5 py-1 rounded bg-surface-raised border border-border-subtle text-text-primary">
            Traffic Loss: {suggested_alternative.traffic_loss_s || 0}s
          </span>
          <span className="px-2.5 py-1 rounded bg-surface-raised border border-border-subtle text-text-primary">
            Pit Loss Cost: {suggested_alternative.pit_loss_s || 22.0}s
          </span>
        </div>

        {/* Telemetry Comparison Visualization & Key Numbers Table */}
        {(report.telemetry_comparison || suggested_alternative.telemetry_comparison) && (
          <div className="mt-5 pt-4 border-t border-border-subtle">
            <StrategyTelemetryComparison
              comparison={report.telemetry_comparison || suggested_alternative.telemetry_comparison}
              mode="analysis"
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
