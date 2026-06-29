import { useState } from 'react';
import { TelemetryCard } from '@/components/TelemetryCard';
import type { TelemetryPoint } from '@/lib/types';

interface TelemetryOverlayProps {
  driverA: { code: string; color: string; data: TelemetryPoint[] };
  driverB: { code: string; color: string; data: TelemetryPoint[] };
  lapNumber: number;
  trackName: string;
  highlightZone?: { startM: number; endM: number };
}

export function TelemetryOverlay({
  driverA,
  driverB,
  lapNumber,
  trackName,
  highlightZone,
}: TelemetryOverlayProps) {
  const [hoverDist, setHoverDist] = useState<number | null>(null);

  const handleHover = (dist: number) => {
    setHoverDist(dist);
  };

  return (
    <div className="flex flex-col gap-4 bg-panel border border-fw-border rounded-card p-4">
      <div className="flex justify-between items-center border-b border-fw-border pb-2.5 mb-2 font-mono text-mono-meta">
        <span className="text-text-primary font-semibold uppercase">
          SYNCHRONIZED_MULTI_CHANNEL_TELEMETRY
        </span>
        <span className="text-text-muted">ALIGNMENT: DISTANCE (10M BINS)</span>
      </div>

      <div className="flex flex-col gap-3">
        {/* Speed Channel */}
        <TelemetryCard
          driverA={driverA}
          driverB={driverB}
          metric="speed"
          lapNumber={lapNumber}
          trackName={trackName}
          highlightZone={highlightZone}
          variant="expanded"
          onHover={handleHover}
          hoverDist={hoverDist}
        />

        {/* Throttle Channel */}
        <TelemetryCard
          driverA={driverA}
          driverB={driverB}
          metric="throttle"
          lapNumber={lapNumber}
          trackName={trackName}
          highlightZone={highlightZone}
          variant="expanded"
          onHover={handleHover}
          hoverDist={hoverDist}
        />

        {/* Brake Channel */}
        <TelemetryCard
          driverA={driverA}
          driverB={driverB}
          metric="brake"
          lapNumber={lapNumber}
          trackName={trackName}
          highlightZone={highlightZone}
          variant="expanded"
          onHover={handleHover}
          hoverDist={hoverDist}
        />

        {/* Gear Channel */}
        <TelemetryCard
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
