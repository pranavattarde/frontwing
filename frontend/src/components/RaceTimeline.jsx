import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
const TYPE_COLORS = {
  normal: "border-border-subtle text-text-secondary bg-surface-base",
  safety_car: "border-timing-yellow/40 text-timing-yellow bg-timing-yellow/10",
  incident: "border-accent-danger/40 text-accent-danger bg-accent-danger/10",
  border_window: "border-accent-primary/40 text-accent-primary bg-accent-primary/10",
  pit_window: "border-timing-green/40 text-timing-green bg-timing-green/10"
};
const TYPE_LABELS = {
  normal: "Normal Stint",
  safety_car: "Safety Car",
  incident: "Stewards Incident",
  pit_window: "Pit Window Open"
};
export function RaceTimeline({
  phases,
  incidents,
  orientation = "vertical",
  onPhaseClick,
  onIncidentClick,
  activePhaseIndex
}) {
  const isVertical = orientation === "vertical";
  if (isVertical) {
    return <div className="flex flex-col gap-4 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border-subtle">{phases.map((phase, idx) => {
      const isActive = activePhaseIndex === idx;
      return <motion.div
        key={idx}
        onClick={() => onPhaseClick?.(idx)}
        className={cn(
          "flex gap-4 items-start pl-8 relative group transition-all duration-[150ms]",
          onPhaseClick ? "cursor-pointer" : ""
        )}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.05, duration: 0.15 }}
      >{
        /* Bullet Indicator */
      }<div
        className={cn(
          "absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-canvas transition-all duration-[150ms]",
          phase.type === "incident" ? "border-accent-danger" : phase.type === "safety_car" ? "border-timing-yellow" : "border-text-muted",
          isActive && "scale-125 border-accent-primary bg-accent-primary shadow-[0_0_8px_#E10600]"
        )}
      /><div
        className={cn(
          "flex-1 border rounded-card p-3 transition-all duration-[150ms]",
          isActive ? "border-accent-primary bg-surface-raised shadow-card" : "border-border-subtle bg-surface-base group-hover:bg-surface-raised",
          TYPE_COLORS[phase.type]
        )}
      ><div className="flex justify-between items-baseline mb-1 text-mono-meta font-mono"><span className="font-semibold tracking-wider text-[10px]">{TYPE_LABELS[phase?.type] || String(phase?.type || "Phase")}</span><span className="text-text-muted type-tabular">

                    Laps {phase.startLap} - {phase.endLap}</span></div><p className="text-xs text-text-primary leading-snug">{phase.description}</p></div></motion.div>;
    })}{
      /* Incidents timeline overlay */
    }{incidents.length > 0 && <div className="mt-4 pt-4 border-t border-border-subtle flex flex-col gap-2"><span className="text-mono-meta font-mono text-text-muted tracking-wider">
               Stewards Incident Log
            </span><div className="flex flex-col gap-2">{incidents.map((inc, i) => <div
      key={i}
      onClick={() => onIncidentClick?.(i)}
      className="border border-accent-danger/30 bg-accent-danger/5 rounded-card p-3 text-xs leading-normal cursor-pointer hover:bg-accent-danger/10 transition-colors"
    ><div className="flex justify-between font-mono text-[10px] text-accent-danger mb-1"><span>⚠ Incident Log</span><span className="type-tabular">Lap {inc.lap}</span></div><p className="text-text-secondary">{inc.description}</p><div className="flex gap-2 mt-2">{inc.drivers.map((d) => <span key={d} className="font-mono text-[9px] bg-accent-danger/15 text-accent-danger px-1.5 py-0.5 border border-accent-danger/30 rounded-badge">{d}</span>)}</div></div>)}</div></div>}</div>;
  }
  return <div className="w-full bg-surface-base border border-border-subtle rounded-card p-3 select-none overflow-x-auto"><div className="min-w-[760px] flex items-center justify-between gap-1 relative before:absolute before:left-2 before:right-2 before:h-0.5 before:bg-border-subtle">{phases.map((phase, idx) => {
    const isActive = activePhaseIndex === idx;
    return <div
      key={idx}
      onClick={() => onPhaseClick?.(idx)}
      className={cn(
        "relative flex-1 flex flex-col items-center pt-4 cursor-pointer group",
        isActive ? "text-accent-primary" : "text-text-muted"
      )}
    >{
      /* Dot */
    }<div
      className={cn(
        "absolute top-[-3px] w-2 h-2 rounded-full bg-canvas border border-border-subtle group-hover:border-text-primary z-10 transition-all",
        isActive ? "bg-accent-primary border-accent-primary scale-125" : "",
        phase.type === "incident" ? "border-accent-danger" : ""
      )}
    /><span className="font-mono text-[9px] mt-1 font-semibold type-tabular">L{phase.startLap}-{phase.endLap}</span><span className="text-[10px] text-center truncate max-w-[120px] text-text-secondary mt-1 group-hover:text-text-primary transition-colors">{phase.description}</span></div>;
  })}</div></div>;
}
