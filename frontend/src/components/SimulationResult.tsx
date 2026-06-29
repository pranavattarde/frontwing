import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SimulationOutput } from '@/lib/types';

interface SimulationResultProps {
  result: SimulationOutput;
  variant?: 'compact' | 'detailed';
  onDrillDown?: () => void;
  onShareResult?: () => void;
}

export function SimulationResult({
  result,
  variant = 'detailed',
  onDrillDown,
  onShareResult,
}: SimulationResultProps) {
  const { actual, simulated, delta, confidence, simType } = result;
  const isDetailed = variant === 'detailed';
  const posGain = delta.positions;

  return (
    <motion.div
      className={cn(
        'evidence-card border-l-2 border-l-drs-cyan',
        isDetailed ? 'p-5 w-full sm:w-[320px]' : 'p-3 w-full'
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header Row */}
      <div className="flex justify-between items-center text-mono-meta font-mono mb-3">
        <span className="text-text-primary font-semibold uppercase tracking-wider">
          SIMULATION_RESULT // {simType.toUpperCase()}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">CONFIDENCE:</span>
          <span className="text-tire-inter font-semibold">{confidence}%</span>
        </div>
      </div>

      {/* Main Stats Block */}
      <div className="flex items-center justify-between gap-4 border-b border-fw-border pb-3">
        <div className="flex flex-col">
          <span className="text-[9px] font-mono text-text-muted">POSITION_DELTA</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl font-semibold font-data text-text-primary">
              P{simulated.position}
            </span>
            <span className={cn(
              'text-xs font-semibold font-mono',
              posGain > 0 ? 'text-tire-inter' : posGain < 0 ? 'text-f1-red' : 'text-text-muted'
            )}>
              {posGain > 0 ? `+${posGain}` : posGain === 0 ? 'static' : posGain}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] font-mono text-text-muted">TIME_DIFFERENCE</span>
          <span className="text-xl font-semibold font-data text-drs-cyan mt-1">
            {delta.seconds > 0 ? `+${delta.seconds.toFixed(3)}s` : `${delta.seconds.toFixed(3)}s`}
          </span>
        </div>
      </div>

      {/* Detail Rows */}
      {isDetailed && (
        <div className="flex flex-col gap-2 pt-3">
          <div className="flex justify-between items-center text-mono-meta font-mono">
            <span className="text-text-muted">ACTUAL_FINISH:</span>
            <span className="text-text-secondary">P{actual.position} ({actual.time.split('.')[0]})</span>
          </div>
          <div className="flex justify-between items-center text-mono-meta font-mono">
            <span className="text-text-muted">SIMULATED_FINISH:</span>
            <span className="text-text-secondary">P{simulated.position} ({simulated.time.split('.')[0]})</span>
          </div>

          <div className="flex gap-2 mt-2">
            {onDrillDown && (
              <button
                onClick={onDrillDown}
                className="flex-1 py-1.5 border border-fw-border rounded-button text-[10px] font-mono text-text-secondary hover:bg-elevated hover:text-text-primary hover:border-fw-border-active transition-all duration-[80ms]"
              >
                DRILL_DOWN
              </button>
            )}
            {onShareResult && (
              <button
                onClick={onShareResult}
                className="py-1.5 px-2.5 border border-fw-border rounded-button text-[10px] font-mono text-text-muted hover:text-text-secondary hover:border-fw-border-active transition-all duration-[80ms]"
                aria-label="Share simulation result"
              >
                [SHARE]
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
