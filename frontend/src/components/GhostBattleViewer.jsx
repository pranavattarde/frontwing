import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TelemetryComparison } from "@/components/TelemetryComparison";
import { TelemetryOverlay } from "@/components/TelemetryOverlay";
export function GhostBattleViewer({
  driverA,
  driverB,
  lapNumber,
  trackName,
  narrations,
  className
}) {
  const [activeCornerIdx, setActiveCornerIdx] = useState(0);
  const [hoverDist, setHoverDist] = useState(null);
  const [viewMode, setViewMode] = useState("single");
  const annotations = useMemo(() => {
    const corners = [
      { name: "Turn 1", distanceM: 350 },
      { name: "Turn 3", distanceM: 1050 },
      { name: "Turn 4", distanceM: 1400 },
      { name: "Turn 8", distanceM: 3200 }
    ];
    return narrations.map((n, idx) => ({
      distanceM: corners[idx]?.distanceM || 500,
      label: n.cornerName,
      deltaMs: n.deltaMs
    }));
  }, [narrations]);
  const highlightZone = useMemo(() => {
    const activeDistance = annotations[activeCornerIdx]?.distanceM;
    if (!activeDistance) return void 0;
    return {
      startM: Math.max(0, activeDistance - 150),
      endM: activeDistance + 150
    };
  }, [activeCornerIdx, annotations]);
  const handleHover = (dist) => {
    setHoverDist(dist);
    const closestIdx = annotations.reduce(
      (closest, curr, idx) => Math.abs(curr.distanceM - dist) < Math.abs(annotations[closest].distanceM - dist) ? idx : closest,
      0
    );
    setActiveCornerIdx(closestIdx);
  };
  return <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-8 items-start select-none", className)}>{
    /* Left Pane (Colspan 5): Turn-by-Turn Narration Log */
  }<div className="lg:col-span-5 flex flex-col gap-4"><div className="flex justify-between items-center"><span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
            AI_GHOST_BATTLE_LOG
          </span><div className="flex gap-1.5 font-mono text-[9px]"><button
    onClick={() => setViewMode("single")}
    className={`px-1.5 py-0.5 border rounded-sm ${viewMode === "single" ? "border-drs-cyan text-drs-cyan bg-drs-cyan/5 font-semibold" : "border-fw-border text-text-muted"}`}
  >
              SINGLE_TRACE
            </button><button
    onClick={() => setViewMode("stacked")}
    className={`px-1.5 py-0.5 border rounded-sm ${viewMode === "stacked" ? "border-drs-cyan text-drs-cyan bg-drs-cyan/5 font-semibold" : "border-fw-border text-text-muted"}`}
  >
              STACKED_CHANNELS
            </button></div></div>{
    /* Narrative steps list */
  }<div className="flex flex-col gap-3">{narrations.map((nar, idx) => {
    const isActive = activeCornerIdx === idx;
    const isAdvantageA = nar.advantage === driverA.code;
    return <motion.div
      key={idx}
      onClick={() => setActiveCornerIdx(idx)}
      className={cn(
        "border rounded-card p-4 transition-all duration-[150ms] cursor-pointer relative overflow-hidden",
        isActive ? "border-fw-border-active bg-elevated/40" : "border-fw-border bg-panel hover:bg-elevated/20"
      )}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05, duration: 0.15 }}
    >{
      /* Advantage strip */
    }<div
      className="absolute left-0 top-0 bottom-0 w-1"
      style={{ backgroundColor: isAdvantageA ? "#00E5FF" : "#FFD600" }}
    /><div className="pl-2"><div className="flex justify-between items-baseline mb-2 font-mono text-mono-meta"><span className="text-text-primary font-semibold">{nar.cornerName}</span><span className={cn("text-xs font-semibold", isAdvantageA ? "text-drs-cyan" : "text-teammate-yellow")}>{isAdvantageA ? driverA.code : driverB.code} ADV (+{Math.abs(nar.deltaMs)}ms)
                    </span></div><p className="text-xs text-text-secondary leading-relaxed">{nar.narrative}</p></div></motion.div>;
  })}</div></div>{
    /* Right Pane (Colspan 7): Synced Telemetry Traces */
  }<div className="lg:col-span-7 flex flex-col gap-4">{viewMode === "single" ? <TelemetryComparison
    driverA={driverA}
    driverB={driverB}
    metric="speed"
    lapNumber={lapNumber}
    trackName={trackName}
    annotations={annotations}
    onHover={handleHover}
    hoverDist={hoverDist}
  /> : <TelemetryOverlay
    driverA={driverA}
    driverB={driverB}
    lapNumber={lapNumber}
    trackName={trackName}
    highlightZone={highlightZone}
  />}</div></div>;
}
