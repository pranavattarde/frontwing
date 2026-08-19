import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
export function FollowUpSuggestions({
  suggestions,
  disabled = false,
  onSuggestionClick
}) {
  if (suggestions.length === 0) return null;
  return <div className="flex flex-col gap-2 mt-6"><span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
        FOLLOW_UP_SUGGESTIONS
      </span><div className="flex flex-col gap-1.5">{suggestions.map((suggestion, idx) => <motion.button
    key={suggestion}
    disabled={disabled}
    onClick={() => onSuggestionClick?.(suggestion)}
    className={cn(
      "flex items-center justify-between px-3 py-2 border border-fw-border rounded-card bg-panel hover:bg-elevated text-left hover:border-fw-border-active transition-all duration-[80ms] group",
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
    )}
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: idx * 0.05, duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
  ><span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{suggestion}</span><span className="font-mono text-mono-meta text-text-muted group-hover:text-drs-cyan transition-colors ml-4 shrink-0">
              [ASK]
            </span></motion.button>)}</div></div>;
}
