import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function PitWindowVisualizer({
  pittingDriver,
  rivals,
  cleanAirThreshold = 1.5,
  className,
  onRivalClick
}) {
  return (
    <div className={cn("bg-surface-base border border-border-subtle rounded p-4 flex flex-col gap-4 select-none", className)}>
      {/* Title */}
      <div className="flex justify-between items-center text-xs font-mono border-b border-border-subtle pb-2.5">
        <span className="text-text-primary font-bold tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-primary" />
          PIT_EXIT_WINDOW_TRAFFIC_QUEUE
        </span>
        <span className="text-text-muted text-[11px] type-tabular">THRESHOLD: {cleanAirThreshold.toFixed(1)}S</span>
      </div>

      {/* Visual queue stack */}
      <div className="relative flex flex-col gap-2">
        {/* Track Line Center connector */}
        <div className="absolute left-[38px] top-1.5 bottom-1.5 w-[2px] bg-border-subtle" />

        {rivals.map((rival, idx) => {
          const isDirty = Math.abs(rival.gapAtExit) <= cleanAirThreshold && rival.gapAtExit < 0;
          return (
            <motion.div
              key={rival.code}
              onClick={() => onRivalClick?.(rival.code)}
              className={cn(
                "flex items-center gap-4 relative pl-4 transition-all duration-fast",
                onRivalClick && "cursor-pointer"
              )}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.15 }}
            >
              {/* Gap Bubble on Track timeline */}
              <div
                className={cn(
                  "w-2 h-2 rounded-full z-10 border bg-canvas ml-4 shrink-0 transition-colors",
                  isDirty ? "border-accent-danger bg-accent-danger" : "border-timing-green bg-timing-green"
                )}
              />

              {/* Rival Details Row Card */}
              <div
                className={cn(
                  "flex-1 flex justify-between items-center px-3 py-2 border rounded transition-all",
                  isDirty
                    ? "border-accent-danger/30 bg-accent-danger/10 text-accent-danger"
                    : "border-border-subtle bg-surface-raised/40 hover:border-border-medium text-text-primary"
                )}
                style={
                  isDirty
                    ? {
                        backgroundImage:
                          "repeating-linear-gradient(45deg, rgba(225, 6, 0, 0.08) 0px, rgba(225, 6, 0, 0.08) 2px, transparent 2px, transparent 8px)"
                      }
                    : {}
                }
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-text-muted type-tabular">P{rival.position}</span>
                  <span className="font-sans text-sm font-bold text-text-primary">{rival.code}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] type-tabular">
                  {isDirty ? (
                    <span className="text-accent-danger font-bold uppercase text-[9px] px-1.5 py-0.5 rounded bg-accent-danger/15 border border-accent-danger/30">
                      DIRTY_AIR
                    </span>
                  ) : (
                    <span className="text-timing-green font-bold uppercase text-[9px] px-1.5 py-0.5 rounded bg-timing-green/15 border border-timing-green/30">
                      CLEAN_AIR
                    </span>
                  )}
                  <span className={cn("text-xs font-bold", isDirty ? "text-accent-danger" : "text-timing-green")}>
                    {rival.gapAtExit > 0 ? `+${rival.gapAtExit.toFixed(1)}s` : `${rival.gapAtExit.toFixed(1)}s`}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Highlight the pitting driver marker in the middle */}
        <div className="flex items-center gap-4 pl-4 relative my-1 z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-primary border-2 border-canvas ml-4 shrink-0 shadow-[0_0_8px_rgba(225,6,0,0.6)]" />
          <div className="flex-1 flex justify-between items-center px-4 py-2.5 border border-accent-primary/40 bg-accent-primary/10 rounded font-mono border-l-2 border-l-accent-primary">
            <div className="flex items-center gap-2">
              <span className="text-xs text-accent-primary font-bold">PIT_EXIT</span>
              <span className="text-sm font-bold text-text-primary">{pittingDriver.code}</span>
            </div>
            <span className="text-xs text-accent-primary font-bold type-tabular">LAP {pittingDriver.exitLap}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

