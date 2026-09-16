import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
export function ComparisonSlider({
  min,
  max,
  step = 1,
  value,
  markers = [],
  isComputing = false,
  onChange,
  onPreview,
  className
}) {
  const [internalVal, setInternalVal] = useState(value);
  useEffect(() => {
    setInternalVal(value);
  }, [value]);
  const handleInputChange = (valStr) => {
    const val = Number(valStr);
    setInternalVal(val);
    onPreview?.(val);
  };
  const handleMouseUpOrChange = () => {
    onChange?.(internalVal);
  };
  return <div className={cn("flex flex-col gap-3 p-3 bg-surface-base border border-border-subtle rounded-card select-none w-full", className)}><div className="flex justify-between items-center text-mono-meta font-mono"><span className="text-text-primary font-semibold tracking-wider">
          STRATEGY_DECISION_SLIDER // PIT_STOP_WINDOW
        </span><div className="flex items-center gap-2">{isComputing && <span className="text-timing-yellow animate-pulse text-[10px]">
              RE_COMPUTING...
            </span>}<span className="text-accent-primary text-xs font-semibold type-tabular">LAP {internalVal}</span></div></div>{
    /* Slider Input */
  }<div className="relative mt-2 flex items-center"><input
    type="range"
    min={min}
    max={max}
    step={step}
    value={internalVal}
    disabled={isComputing}
    onChange={(e) => handleInputChange(e.target.value)}
    onMouseUp={handleMouseUpOrChange}
    onTouchEnd={handleMouseUpOrChange}
    className={cn(
      "w-full h-1 bg-surface-raised rounded-lg appearance-none cursor-pointer border border-border-subtle accent-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary/30",
      isComputing && "opacity-50 cursor-not-allowed"
    )}
    aria-label="Strategy decision slider"
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={internalVal}
  /></div>{
    /* Slider Markers */
  }{markers.length > 0 && <div className="relative h-6 mt-1.5 font-mono text-[9px] text-text-muted">{markers.map((m, idx) => {
    const positionPct = (m.value - min) / (max - min) * 100;
    const isMatch = internalVal === m.value;
    return <div
      key={idx}
      className="absolute transform -translate-x-1/2 flex flex-col items-center cursor-pointer"
      style={{ left: `${positionPct}%` }}
      onClick={() => {
        if (!isComputing) {
          setInternalVal(m.value);
          onChange?.(m.value);
        }
      }}
    >{
      /* Dot marker */
    }<div
      className={cn(
        "w-1.5 h-1.5 rounded-full border transition-all duration-[100ms]",
        isMatch ? "bg-accent-primary border-accent-primary scale-125" : m.type === "optimal" ? "bg-timing-green border-timing-green/50" : m.type === "actual" ? "bg-accent-danger border-accent-danger/50" : "bg-surface-raised border-border-subtle"
      )}
    /><span
      className={cn(
        "mt-1 font-semibold uppercase",
        isMatch ? "text-accent-primary" : m.type === "optimal" ? "text-timing-green" : m.type === "actual" ? "text-accent-danger" : "text-text-muted"
      )}
    >{m.label}</span></div>;
  })}</div>}</div>;
}
