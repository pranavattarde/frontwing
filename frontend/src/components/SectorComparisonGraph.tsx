import { cn } from '@/lib/utils';

export interface SectorDelta {
  sector: 'S1' | 'S2' | 'S3';
  driver_time: number;
  benchmark_time: number;
  delta: number;
}

interface SectorComparisonGraphProps {
  data: SectorDelta[];
  driverCode?: string;
  className?: string;
}

export function SectorComparisonGraph({
  data,
  driverCode = 'DRIVER',
  className,
}: SectorComparisonGraphProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn('bg-panel border border-fw-border rounded-card p-4 text-xs font-mono text-text-muted', className)}>
        NO_SECTOR_COMPARISON_DATA
      </div>
    );
  }

  return (
    <div className={cn('bg-panel border border-fw-border rounded-card p-4 flex flex-col gap-4', className)}>
      <div className="flex justify-between items-center text-mono-meta font-mono">
        <span className="text-text-primary font-semibold tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-drs-cyan" />
          SECTOR_TIME_COMPARISON // DELTA_ANALYSIS
        </span>
        <span className="text-text-muted font-mono text-[10px]">{driverCode.toUpperCase()} vs BENCHMARK</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {data.map((s) => {
          const isFaster = s.delta <= 0;
          const deltaStr = isFaster ? `${s.delta.toFixed(3)}s` : `+${s.delta.toFixed(3)}s`;

          return (
            <div
              key={s.sector}
              className={cn(
                'flex flex-col p-3 rounded-card border transition-all',
                isFaster ? 'border-drs-cyan/30 bg-drs-cyan/5' : 'border-f1-red/30 bg-f1-red/5'
              )}
            >
              <div className="flex justify-between items-center text-mono-meta font-mono mb-1">
                <span className="font-bold text-text-primary">{s.sector}</span>
                <span className={cn('font-mono text-xs font-bold', isFaster ? 'text-drs-cyan' : 'text-f1-red')}>
                  {deltaStr}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
                <span>TIME: {s.driver_time.toFixed(3)}s</span>
                <span>REF: {s.benchmark_time.toFixed(3)}s</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
