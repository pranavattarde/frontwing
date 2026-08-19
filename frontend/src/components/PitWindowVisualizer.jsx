import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
export function PitWindowVisualizer({
  pittingDriver,
  rivals,
  cleanAirThreshold = 1.5,
  className,
  onRivalClick
}) {
  return <div className={cn("bg-panel border border-fw-border rounded-card p-4 flex flex-col gap-4 select-none", className)}>{
    /* Title */
  }<div className="flex justify-between items-center text-mono-meta font-mono"><span className="text-text-primary font-semibold tracking-wider">
          PIT_EXIT_WINDOW_TRAFFIC_QUEUE
        </span><span className="text-text-muted">THRESHOLD: {cleanAirThreshold.toFixed(1)}S</span></div>{
    /* Visual queue stack */
  }<div className="relative flex flex-col gap-2">{
    /* Track Line Center connector */
  }<div className="absolute left-[38px] top-1.5 bottom-1.5 w-[2px] bg-fw-border" />{rivals.map((rival, idx) => {
    const isDirty = Math.abs(rival.gapAtExit) <= cleanAirThreshold && rival.gapAtExit < 0;
    return <motion.div
      key={rival.code}
      onClick={() => onRivalClick?.(rival.code)}
      className={cn(
        "flex items-center gap-4 relative pl-4 transition-all duration-[100ms]",
        onRivalClick && "cursor-pointer"
      )}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05, duration: 0.15 }}
    >{
      /* Gap Bubble on Track timeline */
    }<div
      className={cn(
        "w-2 h-2 rounded-full z-10 border bg-canvas ml-4 shrink-0 transition-colors",
        isDirty ? "border-f1-red bg-f1-red" : "border-drs-cyan bg-drs-cyan"
      )}
    />{
      /* Rival Details Row Card */
    }<div
      className={cn(
        "flex-1 flex justify-between items-center px-3 py-2 border rounded-card transition-all",
        isDirty ? "border-f1-red/30" : "border-fw-border bg-canvas/40 hover:border-fw-border-active",
        isDirty && "bg-f1-red/5 text-f1-red"
      )}
      style={isDirty ? {
        backgroundImage: "repeating-linear-gradient(45deg, rgba(255, 24, 1, 0.08) 0px, rgba(255, 24, 1, 0.08) 2px, transparent 2px, transparent 8px)"
      } : {}}
    ><div className="flex items-center gap-3"><span className="font-mono text-xs text-text-muted">P{rival.position}</span><span className="font-data text-sm font-semibold text-text-primary">{rival.code}</span></div><div className="flex items-center gap-2 font-mono text-mono-meta">{isDirty ? <span className="text-f1-red font-semibold uppercase text-[9px]">DIRTY_AIR</span> : <span className="text-drs-cyan font-semibold uppercase text-[9px]">CLEAN_AIR</span>}<span className={cn("text-xs font-semibold", isDirty ? "text-f1-red" : "text-drs-cyan")}>{rival.gapAtExit > 0 ? `+${rival.gapAtExit.toFixed(1)}s` : `${rival.gapAtExit.toFixed(1)}s`}</span></div></div></motion.div>;
  })}{
    /* Highlight the pitting driver marker in the middle */
  }<div className="flex items-center gap-4 pl-4 relative my-1 z-10"><div className="w-2.5 h-2.5 rounded-full bg-drs-cyan border-2 border-canvas ml-4 shrink-0 shadow-[0_0_8px_#00E5FF]" /><div className="flex-1 flex justify-between items-center px-4 py-2.5 border border-drs-cyan/40 bg-drs-cyan/10 rounded-card font-mono border-l-2 border-l-drs-cyan"><div className="flex items-center gap-2"><span className="text-xs text-drs-cyan font-semibold">PIT_EXIT</span><span className="text-sm font-semibold text-text-primary">{pittingDriver.code}</span></div><span className="text-xs text-drs-cyan font-semibold">LAP {pittingDriver.exitLap}</span></div></div></div></div>;
}
