import { TelemetryCard } from "@/components/TelemetryCard";
export function TelemetryComparison({
  driverA,
  driverB,
  metric,
  lapNumber,
  trackName,
  annotations = [],
  onHover,
  hoverDist = null
}) {
  return <div className="flex flex-col gap-4 bg-panel border border-fw-border rounded-card p-4">{
    /* Visual Canvas Trace */
  }<TelemetryCard
    driverA={driverA}
    driverB={driverB}
    metric={metric}
    lapNumber={lapNumber}
    trackName={trackName}
    variant="expanded"
    onHover={onHover}
  />{
    /* Delta Annotations Grid */
  }{annotations.length > 0 && <div className="border-t border-fw-border pt-3"><span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider block mb-2">
            TELEMETRY_DELTA_ANNOTATIONS
          </span><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">{annotations.map((ann, idx) => {
    const isActive = hoverDist !== null && Math.abs(hoverDist - ann.distanceM) < 100;
    return <div
      key={idx}
      className={`border rounded-card p-2.5 font-mono transition-all duration-[100ms] ${isActive ? "border-drs-cyan bg-drs-cyan/5" : "border-fw-border bg-canvas/40"}`}
    ><div className="flex justify-between text-[10px] mb-1"><span className="text-text-primary font-semibold">{ann.label}</span><span className="text-text-muted">{ann.distanceM}m</span></div><div className="flex justify-between items-baseline mt-1"><span className="text-[9px] text-text-muted">DELTA:</span><span className={`text-xs font-semibold ${ann.deltaMs <= 0 ? "text-drs-cyan" : "text-f1-red"}`}>{ann.deltaMs <= 0 ? `${ann.deltaMs}ms` : `+${ann.deltaMs}ms`}</span></div></div>;
  })}</div></div>}</div>;
}
