import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function ExplanationPanel({ steps = [], conclusion, reasoningGraph, planningSteps = [], className }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("border border-fw-border rounded-card bg-panel/80 overflow-hidden shadow-md", className)}>
      {/* Header Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-elevated/40 transition-colors cursor-pointer group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono font-bold text-text-primary flex items-center gap-2 group-hover:text-drs-cyan transition-colors">
            <span>⚙️</span>
            <span>{isOpen ? "HIDE TECHNICAL REASONING & TELEMETRY LOGS" : "SHOW TECHNICAL REASONING & TELEMETRY LOGS"}</span>
          </span>
        </div>
        <span className="text-[11px] font-mono text-drs-cyan group-hover:underline">
          {isOpen ? "[COLLAPSE]" : "[EXPAND]"}
        </span>
      </button>

      {/* Accordion Expansion */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-fw-border"
          >
            <div className="p-4 flex flex-col gap-4 font-mono text-xs">
              {/* Conclusion Block */}
              {conclusion && (
                <div className="bg-canvas border border-fw-border p-3 rounded-card text-text-primary border-l-2 border-l-drs-cyan leading-relaxed">
                  <span className="text-[10px] font-mono text-text-muted uppercase block mb-1 font-bold">
                    ENGINEERING_SYNTHESIS_CONCLUSION
                  </span>
                  <p className="text-xs text-text-secondary">{conclusion}</p>
                </div>
              )}

              {/* Root Cause Reasoning Graph (if available) */}
              {reasoningGraph && (
                <div className="bg-canvas border border-fw-border p-3 rounded-card flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-drs-cyan uppercase font-bold tracking-wider">
                    ROOT_CAUSE_REASONING_GRAPH // DAG_TRACE
                  </span>
                  <pre className="text-[11px] font-mono text-text-secondary whitespace-pre-wrap overflow-x-auto bg-panel/60 p-2.5 rounded border border-fw-border/60">
                    {reasoningGraph}
                  </pre>
                </div>
              )}

              {/* Raw Planning Steps & Parameters */}
              {planningSteps && planningSteps.length > 0 && (
                <div className="bg-canvas border border-fw-border p-3 rounded-card flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-wider">
                    DISPATCHED_PLANNING_STEPS // FASTF1_TOOL_INVOCATIONS
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {planningSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-text-muted">
                        <span className="text-text-primary font-bold">#{idx + 1}</span>
                        <code className="bg-panel px-1.5 py-0.5 rounded text-drs-cyan border border-fw-border">
                          {step}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps Timeline */}
              {steps && steps.length > 0 && (
                <div className="flex flex-col gap-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-fw-border">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex gap-4 relative pl-6">
                      <div className="absolute left-[5px] top-1.5 w-1.5 h-1.5 rounded-full bg-drs-cyan border border-canvas" />
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-xs font-semibold text-text-primary leading-tight">
                            {step.title}
                          </span>
                          {step.confidence !== undefined && (
                            <span className="text-[10px] font-mono text-text-muted shrink-0">
                              CONF: {step.confidence}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary leading-normal">{step.description}</p>
                        {step.dataReference && (
                          <span className="text-[10px] font-mono text-text-muted mt-0.5">
                            REF: {step.dataReference}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
