import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function VerdictBlock({ verdict, confidence, className }) {
  const getConfidenceColor = (val) => {
    if (val >= 80) return "text-timing-green border-timing-green/30 bg-timing-green/10";
    if (val >= 50) return "text-timing-yellow border-timing-yellow/30 bg-timing-yellow/10";
    return "text-accent-danger border-accent-danger/30 bg-accent-danger/10";
  };

  return (
    <motion.div
      className={cn(
        "border border-border-subtle rounded p-5 bg-surface-base flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden shadow-sm",
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Left indicator strip matching confidence color */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5",
          confidence >= 80 ? "bg-timing-green" : confidence >= 50 ? "bg-timing-yellow" : "bg-accent-danger"
        )}
      />

      <div className="flex-1 pl-2">
        <span className="text-xs font-mono text-accent-primary font-bold uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
          AI_VERDICT
        </span>
        <div className="text-text-primary font-sans text-sm sm:text-base font-semibold leading-relaxed whitespace-pre-line">
          {verdict}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end pl-2 sm:pl-0">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
          CONFIDENCE
        </span>
        <span
          className={cn(
            "font-mono text-xs font-bold px-2.5 py-0.5 border rounded mt-0.5 type-tabular",
            getConfidenceColor(confidence)
          )}
        >
          {confidence}%
        </span>
      </div>
    </motion.div>
  );
}
