import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
    if (c.includes("SOFT")) return "bg-[#FF1801]/10 text-[#FF1801] border-[#FF1801]/30";
    if (c.includes("MEDIUM")) return "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/30";
    if (c.includes("HARD")) return "bg-white/10 text-white border-white/30";
    if (c.includes("INTER")) return "bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/30";
    if (c.includes("WET")) return "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30";
    return "bg-white/5 text-text-muted border-fw-border";
  };

  const getScoreColor = (val) => {
    if (val >= 80) return "text-[#00D26A]";
    if (val >= 60) return "text-[#00E5FF]";
    if (val >= 40) return "text-[#FFD600]";
    return "text-[#FF1801]";
  };

  const getScoreBg = (val) => {
    if (val >= 80) return "bg-[#00D26A]";
    if (val >= 60) return "bg-[#00E5FF]";
    if (val >= 40) return "bg-[#FFD600]";
    return "bg-[#FF1801]";
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
        className="rounded-card border border-fw-border bg-panel p-5 relative overflow-hidden shadow-card"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-f1-red via-drs-cyan to-teammate-yellow" />
        
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase bg-f1-red text-white rounded-sm">
              STRATEGY DEBRIEF
            </span>
            <span className="text-mono-meta font-mono text-text-muted">
              {season} {grandPrix} • {driverName}
            </span>
          </div>
          {latencyMs && (
            <span className="text-mono-meta font-mono text-text-muted">
              COMPUTED IN {latencyMs}ms
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-canvas/60 border border-fw-border rounded-sm">
            <span className="text-[10px] font-mono text-text-muted uppercase block mb-1">GRID POSITION</span>
            <span className="text-xl font-bold font-mono text-text-primary">
              {what_happened.grid_position ? `P${what_happened.grid_position}` : "—"}
            </span>
          </div>
          <div className="p-3 bg-canvas/60 border border-fw-border rounded-sm">
            <span className="text-[10px] font-mono text-text-muted uppercase block mb-1">FINISH POSITION</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-text-primary">
                {what_happened.finish_position ? `P${what_happened.finish_position}` : "—"}
              </span>
              <span className={cn(
                "text-xs font-mono font-semibold",
                posDelta > 0 ? "text-[#00D26A]" : posDelta < 0 ? "text-[#FF1801]" : "text-text-muted"
              )}>
                ({posDeltaStr})
              </span>
            </div>
          </div>
          <div className="p-3 bg-canvas/60 border border-fw-border rounded-sm">
            <span className="text-[10px] font-mono text-text-muted uppercase block mb-1">COMPOSITE SCORE</span>
            <span className={cn("text-xl font-bold font-mono", getScoreColor(strategy_cost_analysis.composite_score || 0))}>
              {strategy_cost_analysis.composite_score?.toFixed(1) || "—"}/100
            </span>
          </div>
          <div className="p-3 bg-canvas/60 border border-fw-border rounded-sm">
            <span className="text-[10px] font-mono text-text-muted uppercase block mb-1">RACE STATUS</span>
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
        className="rounded-card border border-fw-border bg-panel p-5"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-drs-cyan" />
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-text-primary">
              1. What Happened (Classification & Stint Timeline)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-text-muted">
            {what_happened.laps_completed || 0} Laps Completed
          </span>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {what_happened.narrative}
        </p>

        {/* Stints Visual Breakdown */}
        {what_happened.stints && what_happened.stints.length > 0 && (
          <div className="mt-4 pt-4 border-t border-fw-border">
            <span className="text-[10px] font-mono text-text-muted uppercase block mb-2">
              ACTUAL STINTS & TYRE STRATEGY
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {what_happened.stints.map((stint) => (
                <div
                  key={stint.stint}
                  className="p-3 rounded-sm border border-fw-border bg-canvas/40 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-mono text-text-muted block">
                      STINT {stint.stint} (LAPS {stint.start_lap}–{stint.end_lap})
                    </span>
                    <span className="text-xs font-mono font-bold text-text-primary">
                      {stint.stint_length} LAPS
                    </span>
                  </div>
                  <span className={cn("px-2 py-0.5 text-xs font-mono font-bold border rounded-sm", getCompoundColor(stint.compound))}>
                    {stint.compound}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pit Stops Visual */}
        {what_happened.pit_stops && what_happened.pit_stops.length > 0 && (
          <div className="mt-3 pt-3 border-t border-fw-border">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-mono text-text-muted uppercase">PIT STOPS:</span>
              {what_happened.openf1_cross_check && (
                <span className={cn(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded border",
                  what_happened.openf1_cross_check.status === "verified" ? "text-[#00D26A] border-[#00D26A]/30 bg-[#00D26A]/5" :
                  what_happened.openf1_cross_check.status === "discrepancy" ? "text-[#FFD600] border-[#FFD600]/30 bg-[#FFD600]/5" :
                  "text-text-muted border-fw-border bg-canvas/40"
                )}>
                  {what_happened.openf1_cross_check.status === "verified" ? "✓ OPENF1 CROSS-CHECK: VERIFIED" :
                   what_happened.openf1_cross_check.status === "discrepancy" ? "⚠ OPENF1 CROSS-CHECK: DISCREPANCY FLAGGED" :
                   "OPENF1: UNAVAILABLE (FASTF1 PRIMARY)"}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {what_happened.pit_stops.map((ps) => (
                <span
                  key={ps.pit_stop_number}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-canvas border border-fw-border"
                >
                  <span className="text-text-muted">STOP {ps.pit_stop_number}:</span>
                  <span className="text-text-primary font-bold">LAP {ps.lap}</span>
                  <span className="text-text-muted">({ps.compound_in} ➔ {ps.compound_out})</span>
                  {ps.cross_check_agrees === false && (
                    <span className="text-[10px] text-[#FF1801] font-bold bg-[#FF1801]/10 px-1 py-0.5 rounded border border-[#FF1801]/30">
                      OpenF1: Lap {ps.openf1_lap ?? "—"}
                    </span>
                  )}
                  {ps.cross_check_agrees === true && (
                    <span className="text-[9px] text-[#00D26A] font-semibold bg-[#00D26A]/10 px-1 py-0.5 rounded">
                      ✓ OpenF1
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Discrepancy Alert Banner */}
            {what_happened.openf1_cross_check?.discrepancies?.length > 0 && (
              <div className="mt-2.5 p-2.5 rounded bg-[#FFD600]/10 border border-[#FFD600]/30 text-xs font-mono text-[#FFD600] space-y-1">
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
        className="rounded-card border border-fw-border bg-panel p-5"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teammate-yellow" />
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-text-primary">
              2. Strategy Cost Analysis (Grid-to-Finish Breakdown)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-text-muted">
            REAL COMPUTED METRICS
          </span>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-5">
          {strategy_cost_analysis.narrative}
        </p>

        {/* 5 Core Scoring Metric Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "STRATEGY EFFICIENCY", val: strategy_cost_analysis.strategy_score, desc: "Pit stop timing & window optimization" },
            { label: "PACE EFFICIENCY", val: strategy_cost_analysis.pace_score, desc: "Clean-air speed vs optimal fuel model" },
            { label: "TYRE MANAGEMENT", val: strategy_cost_analysis.tire_score, desc: "Degradation slope vs grid median" },
            { label: "PIT STOP EFFICIENCY", val: strategy_cost_analysis.pitstop_score, desc: "Stationary duration & pit loss" },
            { label: "RACE EXECUTION", val: strategy_cost_analysis.execution_score, desc: "Overtakes, incidents & start execution" },
            { label: "COMPOSITE RATING", val: strategy_cost_analysis.composite_score, desc: "Aggregated overall performance score" }
          ].map((metric) => (
            <div key={metric.label} className="p-3 bg-canvas/40 border border-fw-border rounded-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{metric.label}</span>
                <span className={cn("text-xs font-mono font-bold", getScoreColor(metric.val || 0))}>
                  {metric.val?.toFixed(1) || "—"}/100
                </span>
              </div>
              <div className="h-1.5 w-full bg-canvas rounded-full overflow-hidden mb-1.5">
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
        className="rounded-card border-2 border-drs-cyan/40 bg-panel p-5 relative overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase bg-drs-cyan text-canvas rounded-sm">
              🏆 BEST SIMULATED ALTERNATIVE
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-text-primary">
              3. Suggested Alternative Strategy
            </h3>
          </div>
          <span className="text-[11px] font-mono text-drs-cyan">
            {suggested_alternative.candidates_evaluated || 0} SIMULATIONS TESTED
          </span>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {suggested_alternative_narrative}
        </p>

        {/* Counterfactual Delta Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-canvas/80 border border-drs-cyan/30 rounded-sm">
            <span className="text-[10px] font-mono text-text-muted uppercase block mb-1">OPTIMAL PIT LAP</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-drs-cyan">
                LAP {suggested_alternative.simulated_pit_lap}
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                (vs {suggested_alternative.actual_pit_lap})
              </span>
            </div>
          </div>

          <div className="p-3 bg-canvas/80 border border-drs-cyan/30 rounded-sm">
            <span className="text-[10px] font-mono text-text-muted uppercase block mb-1">OPTIMAL COMPOUND</span>
            <span className={cn("px-2 py-0.5 text-xs font-mono font-bold border rounded-sm inline-block", getCompoundColor(suggested_alternative.target_compound))}>
              {suggested_alternative.target_compound}
            </span>
          </div>

          <div className="p-3 bg-canvas/80 border border-drs-cyan/30 rounded-sm">
            <span className="text-[10px] font-mono text-text-muted uppercase block mb-1">PROJECTED FINISH</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-text-primary">
                P{suggested_alternative.simulated_finish_position}
              </span>
              <span className={cn(
                "text-xs font-mono font-semibold",
                (suggested_alternative.projected_position_change || 0) > 0 ? "text-[#00D26A]" : (suggested_alternative.projected_position_change || 0) < 0 ? "text-[#FF1801]" : "text-text-muted"
              )}>
                ({(suggested_alternative.projected_position_change || 0) > 0 ? `+${suggested_alternative.projected_position_change}` : suggested_alternative.projected_position_change || 0})
              </span>
            </div>
          </div>

          <div className="p-3 bg-canvas/80 border border-drs-cyan/30 rounded-sm">
            <span className="text-[10px] font-mono text-text-muted uppercase block mb-1">NET TIME DELTA</span>
            <span className={cn(
              "text-xl font-bold font-mono",
              netDelta >= 0 ? "text-[#00D26A]" : "text-[#FF1801]"
            )}>
              {netDeltaSign}{netDelta}s
            </span>
          </div>
        </div>

        {/* Physics breakdown pills */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-fw-border text-[11px] font-mono text-text-muted">
          <span>PHYSICS TRADEOFF:</span>
          <span className="px-2 py-0.5 rounded bg-canvas border border-fw-border text-text-primary">
            Undercut Gain: {suggested_alternative.undercut_gain_s || 0}s
          </span>
          <span className="px-2 py-0.5 rounded bg-canvas border border-fw-border text-text-primary">
            Traffic Loss: {suggested_alternative.traffic_loss_s || 0}s
          </span>
          <span className="px-2 py-0.5 rounded bg-canvas border border-fw-border text-text-primary">
            Pit Lane Loss: {suggested_alternative.pit_loss_s || 22.0}s
          </span>
        </div>
      </motion.div>
    </div>
  );
}
