import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/MarkdownContent";

export function VerdictBlock({ verdict, className }) {
  return (
    <motion.div
      className={cn(
        "border border-border-subtle rounded p-5 bg-surface-base flex flex-col items-start gap-3 relative shadow-sm border-l-4 border-l-accent-primary",
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-full">
        <span className="text-xs font-mono text-accent-primary font-bold tracking-wider block mb-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
          Summary
        </span>
        <div className="text-text-primary font-sans text-sm sm:text-base leading-relaxed">
          <MarkdownContent content={verdict} />
        </div>
      </div>
    </motion.div>
  );
}

