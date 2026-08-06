import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface LapTimePoint {
  lap: number;
  lap_time: number;
  compound?: string;
  driver?: string;
}

interface LapTimeGraphProps {
  data: LapTimePoint[];
  driverCode?: string;
  comparativeData?: LapTimePoint[];
  comparativeDriverCode?: string;
  className?: string;
}

export function LapTimeGraph({
  data,
  driverCode = 'DRIVER',
  comparativeData,
  comparativeDriverCode,
  className,
}: LapTimeGraphProps) {
  const [hoveredLap, setHoveredLap] = useState<LapTimePoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className={cn('bg-panel border border-fw-border rounded-card p-4 text-xs font-mono text-text-muted', className)}>
        NO_LAP_TIME_DATA_AVAILABLE
      </div>
    );
  }

  const allTimes = [...data, ...(comparativeData || [])].map((d) => d.lap_time);
  const minTime = Math.min(...allTimes) - 0.5;
  const maxTime = Math.max(...allTimes) + 0.5;

  const width = 600;
  const height = 180;
  const padding = 35;

  const maxLap = Math.max(...data.map((d) => d.lap), ...(comparativeData || []).map((d) => d.lap));
  const minLap = Math.min(...data.map((d) => d.lap), ...(comparativeData || []).map((d) => d.lap));

  const getX = (lap: number) => padding + ((lap - minLap) / Math.max(1, maxLap - minLap)) * (width - 2 * padding);
  const getY = (time: number) => height - padding - ((time - minTime) / Math.max(0.1, maxTime - minTime)) * (height - 2 * padding);

  const pathA = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.lap)} ${getY(d.lap_time)}`).join(' ');
  const pathB = comparativeData
    ? comparativeData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.lap)} ${getY(d.lap_time)}`).join(' ')
    : '';

  return (
    <div className={cn('bg-panel border border-fw-border rounded-card p-4 flex flex-col gap-3', className)}>
      <div className="flex justify-between items-center text-mono-meta font-mono">
        <span className="text-text-primary font-semibold tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-drs-cyan" />
          LAP_TIME_EVOLUTION // TELEMETRY_GRAPH
        </span>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-drs-cyan font-semibold">{driverCode}</span>
          {comparativeDriverCode && <span className="text-f1-red font-semibold">{comparativeDriverCode}</span>}
        </div>
      </div>

      <div className="relative w-full h-[180px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const yVal = minTime + (maxTime - minTime) * (1 - pct);
            const yPos = getY(yVal);
            return (
              <g key={idx}>
                <line x1={padding} y1={yPos} x2={width - padding} y2={yPos} stroke="#1C2025" strokeDasharray="3 3" />
                <text x={padding - 6} y={yPos + 3} textAnchor="end" fill="#5C6470" fontSize="9" className="font-mono">
                  {yVal.toFixed(1)}s
                </text>
              </g>
            );
          })}

          <path d={pathA} fill="none" stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round" />

          {pathB && <path d={pathB} fill="none" stroke="#FF1801" strokeWidth="2" strokeDasharray="4 2" />}

          {data.map((d, i) => (
            <circle
              key={i}
              cx={getX(d.lap)}
              cy={getY(d.lap_time)}
              r={hoveredLap?.lap === d.lap ? 5 : 3}
              fill="#00E5FF"
              className="transition-all cursor-pointer hover:scale-125"
              onMouseEnter={() => setHoveredLap(d)}
            />
          ))}
        </svg>

        {hoveredLap && (
          <div
            className="absolute z-20 bg-canvas/90 border border-drs-cyan/40 backdrop-blur-md px-2.5 py-1.5 rounded-button text-[10px] font-mono text-text-primary pointer-events-none shadow-lg"
            style={{
              left: `${(getX(hoveredLap.lap) / width) * 100}%`,
              top: '10px',
              transform: 'translateX(-50%)',
            }}
          >
            <div>LAP {hoveredLap.lap}: <span className="text-drs-cyan font-bold">{hoveredLap.lap_time.toFixed(3)}s</span></div>
            {hoveredLap.compound && <div className="text-text-muted">COMPOUND: {hoveredLap.compound}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
