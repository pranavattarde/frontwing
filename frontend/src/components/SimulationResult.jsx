import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SimulationResult({
  result,
  variant = "detailed",
  onDrillDown,
  onShareResult
}) {
  const { actual, simulated, delta, confidence, simType } = result;
  const isDetailed = variant === "detailed";
  const posGain = delta.positions;

  return (
    <motion.div
      className={cn(
        "bg-surface-base border border-border-subtle rounded border-l-2 border-l-accent-primary shadow-sm",
        isDetailed ? "p-5 w-full sm:w-[320px]" : "p-3 w-full"
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header Row */}
      <div className="flex justify-between items-center text-xs font-mono mb-3 border-b border-border-subtle pb-2">
        <span className="text-text-primary font-bold tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
          Simulation Result • {String(simType || "Strategy")}
        </span>
      </div>

      {/* Main Stats Block */}
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle pb-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-text-muted">Position Delta</span>
          <div className="flex items-baseline gap-1.5 mt-0.5 type-tabular">
            <span className="text-2xl font-bold font-sans text-text-primary">
              P{simulated.position}
            </span>
            <span
              className={cn(
                "text-xs font-bold font-mono",
                posGain > 0 ? "text-timing-green" : posGain < 0 ? "text-accent-danger" : "text-text-muted"
              )}
            >
              {posGain > 0 ? `+${posGain}` : posGain === 0 ? "static" : posGain}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono text-text-muted">Time Difference</span>
          <span className="text-xl font-bold font-mono text-timing-yellow mt-1 type-tabular">
            {delta.seconds > 0 ? `+${delta.seconds.toFixed(3)}s` : `${delta.seconds.toFixed(3)}s`}
          </span>
        </div>
      </div>

      {/* Detail Rows */}
      {isDetailed && (
        <div className="flex flex-col gap-2 pt-3">
          <div className="flex justify-between items-center text-xs font-mono type-tabular">
            <span className="text-text-muted text-[11px]">Actual Finish:</span>
            <span className="text-text-secondary font-medium">P{actual.position} ({actual.time.split(".")[0]})</span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono type-tabular">
            <span className="text-text-muted text-[11px]">Simulated Finish:</span>
            <span className="text-text-secondary font-medium">P{simulated.position} ({simulated.time.split(".")[0]})</span>
          </div>
          <div className="flex gap-2 mt-2">
            {onDrillDown && (
              <button
                onClick={onDrillDown}
                className="btn-f1-secondary flex-1 py-1.5 text-xs capitalize"
              >
                Drill Down
              </button>
            )}
            {onShareResult && (
              <button
                onClick={onShareResult}
                className="btn-f1-secondary py-1.5 px-3 text-xs"
                aria-label="Share simulation result"
              >
                Share
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
