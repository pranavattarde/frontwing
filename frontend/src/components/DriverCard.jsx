import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScoreRing } from "@/components/ScoreRing";
export function DriverCard({
  driver,
  scores,
  position,
  gridPosition,
  status,
  variant = "compact",
  onClick,
  onCompare
}) {
  const isDetailed = variant === "detailed";
  const posChange = gridPosition - position;
  return <motion.div
    onClick={onClick}
    className={cn(
      "evidence-card relative flex flex-col justify-between hover-lift transition-all duration-[80ms]",
      onClick && "cursor-pointer hover:border-fw-border-active",
      isDetailed ? "p-5 w-full sm:w-[360px]" : "p-3 w-full sm:w-[240px]"
    )}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
  >{
    /* Team Color Accent Bar on Left */
  }<div
    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-card"
    style={{ backgroundColor: driver.teamColor }}
  /><div className="pl-2">{
    /* Top Header */
  }<div className="flex justify-between items-start mb-3"><div><div className="flex items-center gap-1.5"><span className="font-data text-base font-semibold text-text-primary">{driver.code}</span><span className="text-[10px] font-mono text-text-muted">
                #{driver.number}</span></div><p className="text-xs text-text-muted leading-none mt-0.5">{driver.fullName}</p></div>{
    /* Race Result Badge */
  }<div className="flex flex-col items-end"><span className="font-data text-sm font-semibold text-drs-cyan">
              P{position}</span><span className={cn(
    "text-[9px] font-mono leading-none mt-0.5",
    posChange > 0 ? "text-tire-inter" : posChange < 0 ? "text-f1-red" : "text-text-muted"
  )}>{posChange > 0 ? `\u25B2${posChange}` : posChange < 0 ? `\u25BC${Math.abs(posChange)}` : "static"}</span></div></div>{
    /* Content Section */
  }{isDetailed ? <div className="flex flex-col gap-4">{
    /* Detailed Stats Grid */
  }<div className="grid grid-cols-2 gap-3 border-t border-b border-fw-border py-3"><div className="flex flex-col"><span className="text-[9px] font-mono text-text-muted">TEAM</span><span className="text-xs font-medium text-text-secondary truncate">{driver.teamName}</span></div><div className="flex flex-col"><span className="text-[9px] font-mono text-text-muted">STATUS</span><span className="text-xs font-mono text-text-secondary">{status}</span></div><div className="flex flex-col"><span className="text-[9px] font-mono text-text-muted">GRID_START</span><span className="text-xs font-mono text-text-secondary">P{gridPosition}</span></div><div className="flex flex-col"><span className="text-[9px] font-mono text-text-muted">GRID_DIFF</span><span className={cn(
    "text-xs font-mono",
    posChange > 0 ? "text-tire-inter" : posChange < 0 ? "text-f1-red" : "text-text-secondary"
  )}>{posChange > 0 ? `+${posChange}` : posChange}</span></div></div>{
    /* Scores Overview */
  }<div className="flex items-center justify-between"><ScoreRing value={scores.composite} label="COMPOSITE" size="lg" color="#00E5FF" /><div className="flex flex-col gap-1.5 flex-1 pl-6">{Object.entries(scores).filter(([key]) => key !== "composite").map(([key, val]) => <div key={key} className="flex justify-between items-center text-mono-meta font-mono"><span className="text-text-muted uppercase text-[9px]">{key}</span><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-elevated rounded-sm overflow-hidden border border-fw-border"><div
    className="h-full bg-drs-cyan"
    style={{ width: `${val}%` }}
  /></div><span className="text-text-primary text-[10px] w-6 text-right">{val}</span></div></div>)}</div></div></div> : (
    /* Compact View */
    <div className="flex items-center justify-between border-t border-fw-border pt-2.5"><div className="flex flex-col"><span className="text-[9px] font-mono text-text-muted uppercase">Constructor</span><span className="text-xs text-text-secondary font-medium truncate max-w-[120px]">{driver.teamName}</span></div><ScoreRing value={scores.composite} label="SCORE" size="md" color="#00E5FF" /></div>
  )}</div>{isDetailed && onCompare && <button
    onClick={(e) => {
      e.stopPropagation();
      onCompare();
    }}
    className="mt-4 w-full py-1.5 border border-fw-border rounded-button text-mono-meta font-mono text-text-secondary hover:bg-elevated hover:text-text-primary hover:border-fw-border-active transition-all duration-[80ms]"
  >
          COMPARE WITH TEAMMATE
        </button>}</motion.div>;
}
