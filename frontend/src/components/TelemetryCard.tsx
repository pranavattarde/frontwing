import { useEffect, useRef, useState, useMemo } from 'react';
import type { TelemetryPoint } from '@/lib/types';

interface TelemetryCardProps {
  driverA: { code: string; color: string; data: TelemetryPoint[] };
  driverB?: { code: string; color: string; data: TelemetryPoint[] } | null;
  metric: 'speed' | 'throttle' | 'brake' | 'gear';
  lapNumber: number;
  trackName: string;
  highlightZone?: { startM: number; endM: number };
  variant?: 'collapsed' | 'expanded' | 'deepDive';
  onHover?: (distanceM: number) => void;
  onExpand?: () => void;
}

export function TelemetryCard({
  driverA,
  driverB = null,
  metric,
  lapNumber,
  trackName,
  highlightZone,
  variant = 'collapsed',
  onHover,
  onExpand,
}: TelemetryCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverDist, setHoverDist] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 120 });

  const isCollapsed = variant === 'collapsed';
  const height = isCollapsed ? 120 : variant === 'deepDive' ? 400 : 280;

  // Track resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width || 600,
          height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  // Max value calculation for scaling
  const maxVal = useMemo(() => {
    if (metric === 'speed') return 340; // Max km/h
    if (metric === 'throttle' || metric === 'brake') return 100; // Percent/bars
    if (metric === 'gear') return 8; // 8 gears
    return 100;
  }, [metric]);

  // Scale map function
  const totalDistance = useMemo(() => {
    const data = driverA.data;
    return data.length > 0 ? data[data.length - 1].distanceM : 4318;
  }, [driverA.data]);

  // Draw telemetry traces
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // 1. Draw Grid Lines (every 250m)
    ctx.strokeStyle = '#1C2025';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = '#5C6470';
    for (let m = 0; m <= totalDistance; m += 250) {
      const x = (m / totalDistance) * dimensions.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dimensions.height);
      ctx.stroke();

      if (!isCollapsed && m % 500 === 0) {
        ctx.fillText(`${m}m`, x + 4, dimensions.height - 8);
      }
    }

    // 2. Draw Highlight Zone (if any)
    if (highlightZone) {
      const xStart = (highlightZone.startM / totalDistance) * dimensions.width;
      const xEnd = (highlightZone.endM / totalDistance) * dimensions.width;
      ctx.fillStyle = 'rgba(0, 229, 255, 0.04)';
      ctx.fillRect(xStart, 0, xEnd - xStart, dimensions.height);

      // Border outline for highlight
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(xStart, 0);
      ctx.lineTo(xStart, dimensions.height);
      ctx.moveTo(xEnd, 0);
      ctx.lineTo(xEnd, dimensions.height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const drawTrace = (points: TelemetryPoint[], color: string) => {
      if (points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'miter'; // Strict pixel junctions, no rounding

      points.forEach((pt, idx) => {
        const x = (pt.distanceM / totalDistance) * dimensions.width;
        const val = pt[metric];
        const y = dimensions.height - (val / maxVal) * (dimensions.height - 20) - 10;

        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // If brake metric, fill area under trace
      if (metric === 'brake') {
        ctx.fillStyle = 'rgba(255, 24, 1, 0.08)';
        ctx.lineTo((points[points.length - 1].distanceM / totalDistance) * dimensions.width, dimensions.height);
        ctx.lineTo(0, dimensions.height);
        ctx.closePath();
        ctx.fill();
      }
    };

    // Draw Defender/Teammate trace first so primary overlay stands out
    if (driverB) {
      drawTrace(driverB.data, '#FFD600'); // Neon Yellow for Defender
    }
    drawTrace(driverA.data, '#00E5FF'); // Neon Cyan for Chaser

  }, [dimensions, driverA, driverB, metric, maxVal, totalDistance, highlightZone, isCollapsed]);

  // Hover crosshair handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const distanceM = Math.round((x / dimensions.width) * totalDistance);
    const clampedDist = Math.max(0, Math.min(totalDistance, distanceM));
    setHoverDist(clampedDist);
    onHover?.(clampedDist);
  };

  const handleMouseLeave = () => {
    setHoverDist(null);
  };

  // Find data point at active distance
  const getPointAtDist = (points: TelemetryPoint[], dist: number) => {
    if (points.length === 0) return null;
    return points.reduce((prev, curr) => 
      Math.abs(curr.distanceM - dist) < Math.abs(prev.distanceM - dist) ? curr : prev
    );
  };

  const ptA = hoverDist !== null ? getPointAtDist(driverA.data, hoverDist) : null;
  const ptB = hoverDist !== null && driverB ? getPointAtDist(driverB.data, hoverDist) : null;

  return (
    <div
      ref={containerRef}
      className="evidence-card p-3 flex flex-col justify-between select-none relative"
      style={{ height }}
    >
      {/* Top Header Row */}
      <div className="flex justify-between items-center text-mono-meta font-mono">
        <div className="flex items-center gap-2">
          <span className="text-text-primary font-semibold uppercase">
            {metric.toUpperCase()}_TRACE // {driverA.code}
            {driverB && ` vs ${driverB.code}`}
          </span>
          <span className="text-text-muted">LAP {lapNumber}</span>
          {highlightZone && (
            <span className="text-drs-cyan bg-drs-cyan/10 px-1 border border-drs-cyan/20 rounded-sm">
              ZONE_LOCK
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-muted">{trackName}</span>
          {onExpand && (
            <button
              onClick={onExpand}
              className="text-text-muted hover:text-text-primary hover:underline transition-colors"
            >
              [EXPAND]
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="relative flex-1 cursor-crosshair mt-2"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

        {/* Hover Crosshair Overlay */}
        {hoverDist !== null && !isCollapsed && (
          <>
            {/* Vertical crosshair line */}
            <div
              className="absolute top-0 bottom-0 w-px border-l border-dashed border-text-muted/50 pointer-events-none"
              style={{ left: `${(hoverDist / totalDistance) * dimensions.width}px` }}
            />

            {/* Hover Tooltip Overlay */}
            <div
              className="absolute top-2 bg-panel border border-fw-border-active rounded-card p-2 text-mono-meta font-mono pointer-events-none z-10 flex flex-col gap-1 shadow-xl"
              style={{
                left: `${(hoverDist / totalDistance) * dimensions.width + 12}px`,
                transform: (hoverDist / totalDistance) * dimensions.width > dimensions.width - 150 ? 'translateX(-110%)' : 'none',
              }}
            >
              <div className="text-text-primary font-semibold">DIST: {hoverDist}m</div>
              <div className="flex items-center gap-1.5" style={{ color: '#00E5FF' }}>
                <span>{driverA.code}:</span>
                <span>{ptA ? `${ptA[metric].toFixed(0)}` : 'N/A'}</span>
                {metric === 'speed' && 'km/h'}
                {metric === 'throttle' && '%'}
                {metric === 'brake' && 'bar'}
              </div>
              {driverB && ptB && (
                <div className="flex items-center gap-1.5" style={{ color: '#FFD600' }}>
                  <span>{driverB.code}:</span>
                  <span>{ptB[metric].toFixed(0)}</span>
                  {metric === 'speed' && 'km/h'}
                  {metric === 'throttle' && '%'}
                  {metric === 'brake' && 'bar'}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Collapsed State Summary Row */}
      {isCollapsed && (
        <div className="flex justify-between items-center text-mono-meta font-mono text-text-muted mt-2 border-t border-fw-border pt-1">
          <span>0m</span>
          <span> Spielberg Circuit </span>
          <span>{totalDistance}m</span>
        </div>
      )}
    </div>
  );
}
