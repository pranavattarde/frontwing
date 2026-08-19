import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
export function ExplanationPanel({ steps, conclusion, className }) {
  const [isOpen, setIsOpen] = useState(false);
  return <div className={cn("border border-fw-border rounded-card bg-panel overflow-hidden", className)}>{
    /* Header Toggle */
  }<button
    onClick={() => setIsOpen(!isOpen)}
    className="w-full px-4 py-3 flex items-center justify-between hover:bg-elevated/40 transition-colors"
    aria-expanded={isOpen}
  ><div className="flex items-center gap-2"><span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
            REASONING_CHAIN // PROGRESSIVE_DISCLOSURE
          </span></div><span className="text-mono-meta font-mono text-drs-cyan hover:underline">{isOpen ? "[HIDE_CHAIN]" : "[EXPLAIN_REASONING]"}</span></button>{
    /* Accordion Expansion */
  }<AnimatePresence initial={false}>{isOpen && <motion.div
    initial={{ height: 0 }}
    animate={{ height: "auto" }}
    exit={{ height: 0 }}
    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    className="overflow-hidden border-t border-fw-border"
  ><div className="p-4 flex flex-col gap-4">{
    /* Conclusion block */
  }<div className="bg-canvas border border-fw-border p-3 rounded-card text-sm text-text-primary border-l-2 border-l-teammate-yellow leading-relaxed"><span className="text-[9px] font-mono text-text-muted uppercase block mb-1">
                  LOGICAL_CONCLUSION
                </span>{conclusion}</div>{
    /* Steps timeline */
  }<div className="flex flex-col gap-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-fw-border">{steps.map((step, idx) => <div key={idx} className="flex gap-4 relative pl-6">{
    /* Bullet indicator */
  }<div className="absolute left-[5px] top-1.5 w-1.5 h-1.5 rounded-full bg-teammate-yellow border border-canvas" /><div className="flex-1 flex flex-col gap-1"><div className="flex justify-between items-baseline gap-2"><span className="text-xs font-semibold text-text-primary leading-tight">
                          Step {idx + 1}: {step.title}</span><span className="text-[10px] font-mono text-text-muted shrink-0">
                          CONF: {step.confidence}%
                        </span></div><p className="text-xs text-text-secondary leading-normal">{step.description}</p>{step.dataReference && <span className="text-[10px] font-mono text-text-muted mt-0.5">
                          REF: {step.dataReference}</span>}</div></div>)}</div></div></motion.div>}</AnimatePresence></div>;
}
