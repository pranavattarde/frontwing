import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScoreRing } from '@/components/ScoreRing';
import type { TeamMetrics } from '@/lib/types';

interface TeamCardProps {
  metrics: TeamMetrics;
  variant?: 'summary' | 'expanded';
  onClick?: () => void;
  onDriverClick?: (driverCode: string) => void;
}

export function TeamCard({
  metrics,
  variant = 'expanded',
  onClick,
  onDriverClick,
}: TeamCardProps) {
  const { team, constructorScore, pitCrewRank, strategyGrade, avgWearSlope } = metrics;
  const isExpanded = variant === 'expanded';

  return (
    <motion.div
      onClick={onClick}
      className={cn(
        'evidence-card relative flex flex-col justify-between hover-lift transition-all duration-[80ms]',
        onClick && 'cursor-pointer hover:border-fw-border-active',
        isExpanded ? 'p-5 w-full sm:w-[360px]' : 'p-3 w-full'
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Team Color Accent Line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-card"
        style={{ backgroundColor: team.color }}
      />

      <div className="pl-2">
        {/* Top Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="text-text-primary text-sm font-semibold truncate max-w-[200px]">
              {team.name}
            </h4>
            <div className="flex gap-2 mt-1">
              {team.drivers.map((d) => (
                <button
                  key={d.code}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDriverClick?.(d.code);
                  }}
                  className="font-mono text-mono-meta text-text-muted hover:text-drs-cyan hover:underline transition-colors"
                >
                  {d.code}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-text-muted uppercase">STRAT_GRADE</span>
            <span className="font-data text-base font-semibold text-drs-cyan">
              {strategyGrade}
            </span>
          </div>
        </div>

        {/* Content Body */}
        {isExpanded ? (
          <div className="flex flex-col gap-4 border-t border-fw-border pt-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-text-muted">PIT_CREW_RANK</span>
                <span className="text-xs font-mono text-text-secondary">P{pitCrewRank}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-text-muted">AVG_WEAR_SLOPE</span>
                <span className="text-xs font-mono text-text-secondary">{avgWearSlope.toFixed(3)} s/lap</span>
              </div>
            </div>

            {/* Constructor Score Ring */}
            <div className="flex items-center justify-between border-t border-fw-border pt-3">
              <span className="text-mono-meta font-mono text-text-muted max-w-[140px] leading-tight">
                CONSTRUCTOR EFFICIENCY SCORE OVER WEEKEND
              </span>
              <ScoreRing value={constructorScore} label="CONSTRUCTOR" size="md" color="#00E5FF" />
            </div>
          </div>
        ) : (
          /* Summary View */
          <div className="flex items-center justify-between border-t border-fw-border pt-2 text-mono-meta font-mono">
            <div>
              <span className="text-text-muted">PIT_RANK:</span>{' '}
              <span className="text-text-secondary">P{pitCrewRank}</span>
            </div>
            <div>
              <span className="text-text-muted">WEAR:</span>{' '}
              <span className="text-text-secondary">{avgWearSlope.toFixed(3)}s</span>
            </div>
            <span className="text-text-primary font-semibold">{constructorScore.toFixed(1)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
