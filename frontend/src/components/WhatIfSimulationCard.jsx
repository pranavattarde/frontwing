import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function WhatIfSimulationCard({ simulation, driverName, grandPrix, season, latencyMs }) {
  if (!simulation) return null;

  // Unmodeled physical variable limitation
  if (simulation.is_modeled === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-card border-2 border-[#FF1801]/40 bg-panel p-6 shadow-card"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 text-xs font-mono font-bold uppercase bg-[#FF1801] text-white rounded-sm">
            ⚠️ SIMULATION BOUNDARY
          </span>
          <span className="text-xs font-mono text-text-muted">
            UNMODELED VARIABLE DETECTED
          </span>
        </div>

        <h3 className="text-base font-bold text-text-primary font-mono mb-2">
          Variable Not Supported: <span className="text-[#FF1801] font-mono">"{simulation.unmodeled_variable}"</span>
        </h3>

        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {simulation.message}
        </p>

        <div className="p-3 bg-canvas/60 border border-fw-border rounded-sm">
          <span className="text-[11px] font-mono text-text-muted uppercase block mb-1">
            WHAT CAN BE SIMULATED:
          </span>
          <ul className="text-xs font-mono text-text-secondary space-y-1">
            <li>• <strong className="text-text-primary">Pit Stop Timing:</strong> What if driver X pitted on lap N?</li>
            <li>• <strong className="text-text-primary">Relative Pit Window:</strong> What if driver X pitted 5 laps earlier/later?</li>
            <li>• <strong className="text-text-primary">Compound Choice:</strong> What if driver X switched to Softs/Mediums/Hards?</li>
          </ul>
        </div>
      </motion.div>
    );
  }

  const {
    original_scenario = {},
    simulated_scenario = {},
    analysis_summary = ""
  } = simulation;

  const netDelta = simulated_scenario.net_time_delta_s ?? 0;
  const netDeltaSign = netDelta >= 0 ? "+" : "";
  const posChange = simulated_scenario.position_change ?? 0;
  const posChangeStr = posChange > 0 ? `+${posChange}` : `${posChange}`;

  const getCompoundColor = (compound) => {
    const c = String(compound || "").toUpperCase();
    if (c.includes("SOFT")) return "bg-[#FF1801]/10 text-[#FF1801] border-[#FF1801]/30";
    if (c.includes("MEDIUM")) return "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/30";
    if (c.includes("HARD")) return "bg-white/10 text-white border-white/30";
    if (c.includes("INTER")) return "bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/30";
    if (c.includes("WET")) return "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30";
    return "bg-white/5 text-text-muted border-fw-border";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Simulation Header */}
      <div className="rounded-card border border-fw-border bg-panel p-5 relative overflow-hidden shadow-card">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-drs-cyan via-teammate-yellow to-f1-red" />
        
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase bg-drs-cyan text-canvas rounded-sm">
              COUNTERFACTUAL SIMULATION
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

        {/* Before vs After Split View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Baseline / Actual Scenario */}
          <div className="p-4 bg-canvas/60 border border-fw-border rounded-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">
                ORIGINAL RACE OUTCOME
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-panel border border-fw-border text-text-muted">
                ACTUAL
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-mono text-text-muted">Finish Position:</span>
                <span className="text-2xl font-mono font-bold text-text-primary">
                  P{original_scenario.finish_position ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">Actual Pit Stop:</span>
                <span className="text-sm font-mono font-bold text-text-primary">
                  Lap {original_scenario.pit_lap ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">Tyre Compound:</span>
                <span className={cn("px-2 py-0.5 text-xs font-mono font-bold border rounded-sm", getCompoundColor(original_scenario.compound))}>
                  {original_scenario.compound || "HARD"}
                </span>
              </div>
            </div>
          </div>

          {/* Simulated / Counterfactual Scenario */}
          <div className="p-4 bg-canvas/80 border-2 border-drs-cyan/40 rounded-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-drs-cyan uppercase tracking-wider">
                SIMULATED COUNTERFACTUAL
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-drs-cyan text-canvas font-bold">
                SIMULATED
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-mono text-text-muted">Projected Finish:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-bold text-drs-cyan">
                    P{simulated_scenario.finish_position ?? "—"}
                  </span>
                  <span className={cn(
                    "text-xs font-mono font-bold",
                    posChange > 0 ? "text-[#00D26A]" : posChange < 0 ? "text-[#FF1801]" : "text-text-muted"
                  )}>
                    ({posChangeStr} places)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">Simulated Pit Stop:</span>
                <span className="text-sm font-mono font-bold text-text-primary">
                  Lap {simulated_scenario.simulated_pit_lap ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">Target Compound:</span>
                <span className={cn("px-2 py-0.5 text-xs font-mono font-bold border rounded-sm", getCompoundColor(simulated_scenario.target_compound))}>
                  {simulated_scenario.target_compound || "HARD"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Time Delta Callout */}
        <div className="p-4 rounded-sm bg-canvas/80 border border-fw-border flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] font-mono text-text-muted uppercase block">
              NET RACE TIME DELTA
            </span>
            <span className={cn(
              "text-2xl font-mono font-bold",
              netDelta >= 0 ? "text-[#00D26A]" : "text-[#FF1801]"
            )}>
              {netDeltaSign}{netDelta}s {netDelta >= 0 ? "TIME GAINED" : "TIME LOST"}
            </span>
          </div>

          {/* Physics trade-off breakdown */}
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded bg-panel border border-fw-border">
              <span className="text-text-muted block text-[10px]">UNDERCUT GAIN</span>
              <span className="font-bold text-text-primary">{simulated_scenario.undercut_gain_s || 0}s</span>
            </div>
            <div className="px-3 py-1.5 rounded bg-panel border border-fw-border">
              <span className="text-text-muted block text-[10px]">TRAFFIC LOSS</span>
              <span className="font-bold text-text-primary">{simulated_scenario.traffic_loss_s || 0}s</span>
            </div>
            <div className="px-3 py-1.5 rounded bg-panel border border-fw-border">
              <span className="text-text-muted block text-[10px]">PIT LANE LOSS</span>
              <span className="font-bold text-text-primary">{simulated_scenario.pit_loss_s || 22.0}s</span>
            </div>
          </div>
        </div>

        {/* Analytical Explanation */}
        <p className="text-sm text-text-secondary leading-relaxed border-t border-fw-border pt-4">
          {analysis_summary}
        </p>
      </div>
    </motion.div>
  );
}
