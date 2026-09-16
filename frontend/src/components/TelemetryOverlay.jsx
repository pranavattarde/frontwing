import { useState } from "react";
import { TelemetryCard } from "@/components/TelemetryCard";
export function TelemetryOverlay({
  driverA,
  driverB,
  lapNumber,
  trackName,
  highlightZone
}) {
  const [hoverDist, setHoverDist] = useState(null);
  const handleHover = (dist) => {
    setHoverDist(dist);
  };
  return (
    <div className="flex flex-col gap-4 bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2.5 mb-2 font-mono text-[10px]">
        <span className="text-[var(--text-primary)] font-semibold uppercase tracking-wider">
          SYNCHRONIZED_MULTI_CHANNEL_TELEMETRY
        </span>
        <span className="text-[var(--text-muted)] font-mono">ALIGNMENT: DISTANCE (10M BINS)</span>
      </div>
      <div className="flex flex-col gap-3">{
    /* Speed Channel */
  }<TelemetryCard
    driverA={driverA}
    driverB={driverB}
    metric="speed"
    lapNumber={lapNumber}
    trackName={trackName}
    highlightZone={highlightZone}
    variant="expanded"
    onHover={handleHover}
    hoverDist={hoverDist}
  />{
    /* Throttle Channel */
  }<TelemetryCard
    driverA={driverA}
    driverB={driverB}
    metric="throttle"
    lapNumber={lapNumber}
    trackName={trackName}
    highlightZone={highlightZone}
    variant="expanded"
    onHover={handleHover}
    hoverDist={hoverDist}
  />{
    /* Brake Channel */
  }<TelemetryCard
    driverA={driverA}
    driverB={driverB}
    metric="brake"
    lapNumber={lapNumber}
    trackName={trackName}
    highlightZone={highlightZone}
    variant="expanded"
    onHover={handleHover}
    hoverDist={hoverDist}
  />{
    /* Gear Channel */
  }<TelemetryCard
    driverA={driverA}
    driverB={driverB}
    metric="gear"
    lapNumber={lapNumber}
    trackName={trackName}
    highlightZone={highlightZone}
    variant="expanded"
    onHover={handleHover}
    hoverDist={hoverDist}
  />
      </div>
    </div>
  );
}
