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
        className="rounded border border-accent-danger/40 bg-surface-base p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 text-xs font-mono font-bold uppercase bg-accent-danger text-text-primary rounded-sm">
            ⚠️ SIMULATION BOUNDARY
          </span>
          <span className="text-xs font-mono text-text-muted">
            UNMODELED VARIABLE DETECTED
          </span>
        </div>

        <h3 className="text-base font-bold text-text-primary font-mono mb-2">
          Variable Not Supported: <span className="text-accent-danger font-mono">"{simulation.unmodeled_variable}"</span>
        </h3>

        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {simulation.message}
        </p>

        <div className="p-3 bg-surface-raised border border-border-subtle rounded">
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
    if (c.includes("SOFT")) return "bg-accent-danger/15 text-accent-danger border-accent-danger/30";
    if (c.includes("MEDIUM")) return "bg-timing-yellow/15 text-timing-yellow border-timing-yellow/30";
    if (c.includes("HARD")) return "bg-white/10 text-white border-white/30";
    if (c.includes("INTER")) return "bg-timing-green/15 text-timing-green border-timing-green/30";
    if (c.includes("WET")) return "bg-[#0070FF]/15 text-[#3671C6] border-[#0070FF]/30";
    return "bg-surface-raised text-text-muted border-border-subtle";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Simulation Header */}
      <div className="rounded border border-border-subtle bg-surface-base p-5 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-accent-primary" />
        
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase bg-accent-primary text-text-primary rounded-sm">
              COUNTERFACTUAL SIMULATION
            </span>
            <span className="text-xs font-mono text-text-muted">
              {season} {grandPrix} • {driverName}
            </span>
          </div>
          {latencyMs && (
            <span className="text-xs font-mono text-text-muted type-tabular">
              COMPUTED IN {latencyMs}ms
            </span>
          )}
        </div>

        {/* Before vs After Split View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 type-tabular">
          {/* Baseline / Actual Scenario */}
          <div className="p-4 bg-surface-raised border border-border-subtle rounded">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">
                ORIGINAL RACE OUTCOME
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-base border border-border-subtle text-text-muted">
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
                <span className={cn("px-2 py-0.5 text-xs font-mono font-bold border rounded", getCompoundColor(original_scenario.compound))}>
                  {original_scenario.compound || "HARD"}
                </span>
              </div>
            </div>
          </div>

          {/* Simulated / Counterfactual Scenario */}
          <div className="p-4 bg-surface-raised border border-border-medium rounded relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-accent-primary uppercase tracking-wider">
                SIMULATED COUNTERFACTUAL
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-primary text-text-primary font-bold">
                SIMULATED
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-mono text-text-muted">Projected Finish:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-bold text-accent-primary">
                    P{simulated_scenario.finish_position ?? "—"}
                  </span>
                  <span className={cn(
                    "text-xs font-mono font-bold",
                    posChange > 0 ? "text-timing-green" : posChange < 0 ? "text-accent-danger" : "text-text-muted"
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
                <span className={cn("px-2 py-0.5 text-xs font-mono font-bold border rounded", getCompoundColor(simulated_scenario.target_compound))}>
                  {simulated_scenario.target_compound || "HARD"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Time Delta Callout */}
        <div className="p-4 rounded bg-surface-base border border-border-subtle flex flex-wrap items-center justify-between gap-4 mb-4 type-tabular">
          <div>
            <span className="text-[10px] font-mono text-text-muted uppercase block">
              NET RACE TIME DELTA
            </span>
            <span className={cn(
              "text-2xl font-mono font-bold",
              netDelta >= 0 ? "text-timing-green" : "text-accent-danger"
            )}>
              {netDeltaSign}{netDelta}s {netDelta >= 0 ? "TIME GAINED" : "TIME LOST"}
            </span>
          </div>

          {/* Physics trade-off breakdown */}
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded bg-surface-raised border border-border-subtle">
              <span className="text-text-muted block text-[10px]">UNDERCUT GAIN</span>
              <span className="font-bold text-text-primary">{simulated_scenario.undercut_gain_s || 0}s</span>
            </div>
            <div className="px-3 py-1.5 rounded bg-surface-raised border border-border-subtle">
              <span className="text-text-muted block text-[10px]">TRAFFIC LOSS</span>
              <span className="font-bold text-text-primary">{simulated_scenario.traffic_loss_s || 0}s</span>
            </div>
            <div className="px-3 py-1.5 rounded bg-surface-raised border border-border-subtle">
              <span className="text-text-muted block text-[10px]">PIT LANE LOSS</span>
              <span className="font-bold text-text-primary">{simulated_scenario.pit_loss_s || 22.0}s</span>
            </div>
          </div>
        </div>

        {/* Analytical Explanation */}
        <p className="text-sm text-text-secondary leading-relaxed border-t border-border-subtle pt-4">
          {analysis_summary}
        </p>
      </div>
    </motion.div>
  );
}
