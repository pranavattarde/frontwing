import { getTireColor, getTireLabel } from "@/lib/utils";
export function StrategyTimeline({
  stints,
  totalLaps,
  driverCode,
  simulated,
  variant = "single",
  onStintClick
}) {
  const isComparison = variant === "comparison" && simulated && simulated.length > 0;
  const renderStintRow = (rowStints, isSim) => {
    return <div className="relative h-6 w-full flex items-center bg-elevated/40 border border-fw-border rounded-sm overflow-hidden select-none">{rowStints.map((stint, idx) => {
      const stintLaps = stint.endLap - stint.startLap + 1;
      const widthPct = stintLaps / totalLaps * 100;
      const tireColor = getTireColor(stint.compound);
      const tireLabel = getTireLabel(stint.compound);
      return <div
        key={idx}
        onClick={() => onStintClick?.(idx, isSim)}
        className="h-full cursor-pointer hover:brightness-110 active:brightness-95 border-r border-canvas/20 last:border-r-0 flex items-center justify-center font-mono text-xs transition-all relative group"
        style={{
          width: `${widthPct}%`,
          backgroundColor: tireColor,
          color: stint.compound === "hard" ? "#090A0C" : "#F3F5F7"
        }}
        title={`${driverCode} Stint ${idx + 1}: ${stint.compound.toUpperCase()} (Laps ${stint.startLap}-${stint.endLap}, Wear: ${stint.wearSlope.toFixed(3)}s/lap)`}
      ><span className="font-semibold text-[10px] sm:text-xs">{tireLabel}{stint.startLap}-{stint.endLap}</span>{
        /* Stint details popover on hover */
      }<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-50"><div className="bg-panel border border-fw-border-active rounded-card p-2 text-text-primary text-[10px] leading-tight shadow-lg pointer-events-none whitespace-nowrap"><p className="font-semibold uppercase text-drs-cyan">{stint.compound} COMPOUND</p><p>Laps: {stint.startLap} - {stint.endLap} ({stintLaps} laps)</p><p>Degradation: {stint.wearSlope.toFixed(3)} s/lap</p></div><div className="w-1.5 h-1.5 bg-panel border-r border-b border-fw-border-active rotate-45 -mt-1" /></div></div>;
    })}</div>;
  };
  return <div className="w-full flex flex-col gap-2 p-2 bg-panel rounded-card border border-fw-border">{
    /* Timeline Header */
  }<div className="flex justify-between items-center text-mono-meta font-mono"><span className="text-text-primary font-semibold tracking-wider">
          STRATEGY_TIMELINE // {driverCode}</span><span className="text-text-muted">
          TOTAL_LAPS: {totalLaps}</span></div>{
    /* Row Wrapper */
  }<div className="flex flex-col gap-1.5 w-full">{
    /* Actual strategy row */
  }<div className="flex items-center gap-2">{isComparison && <span className="w-10 text-[10px] font-mono text-text-muted text-right shrink-0">ACTUAL</span>}{renderStintRow(stints, false)}</div>{
    /* Simulated strategy row */
  }{isComparison && simulated && <div className="flex items-center gap-2"><span className="w-10 text-[10px] font-mono text-drs-cyan text-right shrink-0">SIM_L20</span>{renderStintRow(simulated, true)}</div>}</div>{
    /* Axis Guide */
  }<div className="relative w-full h-4 mt-1 font-mono text-[9px] text-text-muted select-none"><div className="absolute left-0">LAP 1</div><div className="absolute left-1/4 -translate-x-1/2">LAP {Math.floor(totalLaps * 0.25)}</div><div className="absolute left-1/2 -translate-x-1/2">LAP {Math.floor(totalLaps * 0.5)}</div><div className="absolute left-3/4 -translate-x-1/2">LAP {Math.floor(totalLaps * 0.75)}</div><div className="absolute right-0">LAP {totalLaps}</div></div></div>;
}
