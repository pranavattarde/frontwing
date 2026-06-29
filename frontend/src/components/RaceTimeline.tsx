import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { RacePhase, RaceIncident } from '@/lib/types';

interface RaceTimelineProps {
  phases: RacePhase[];
  incidents: RaceIncident[];
  orientation?: 'horizontal' | 'vertical';
  onPhaseClick?: (index: number) => void;
  onIncidentClick?: (index: number) => void;
  activePhaseIndex?: number;
}

const TYPE_COLORS: Record<string, string> = {
  normal: 'border-fw-border text-text-secondary bg-elevated/20',
  safety_car: 'border-teammate-yellow/40 text-teammate-yellow bg-teammate-yellow/5',
  incident: 'border-f1-red/40 text-f1-red bg-f1-red/5',
  border_window: 'border-drs-cyan/40 text-drs-cyan bg-drs-cyan/5',
  pit_window: 'border-drs-cyan/40 text-drs-cyan bg-drs-cyan/5',
};

const TYPE_LABELS: Record<string, string> = {
  normal: 'NORMAL_STINT',
  safety_car: 'SAFETY_CAR',
  incident: ' steward_incident',
  pit_window: 'PIT_WINDOW_OPEN',
};

export function RaceTimeline({
  phases,
  incidents,
  orientation = 'vertical',
  onPhaseClick,
  onIncidentClick,
  activePhaseIndex,
}: RaceTimelineProps) {
  const isVertical = orientation === 'vertical';

  if (isVertical) {
    return (
      <div className="flex flex-col gap-4 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-fw-border">
        {phases.map((phase, idx) => {
          const isActive = activePhaseIndex === idx;

          return (
            <motion.div
              key={idx}
              onClick={() => onPhaseClick?.(idx)}
              className={cn(
                'flex gap-4 items-start pl-8 relative group transition-all duration-[150ms]',
                onPhaseClick ? 'cursor-pointer' : ''
              )}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.15 }}
            >
              {/* Bullet Indicator */}
              <div
                className={cn(
                  'absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-canvas transition-all duration-[150ms]',
                  phase.type === 'incident' ? 'border-f1-red' : phase.type === 'safety_car' ? 'border-teammate-yellow' : 'border-text-muted',
                  isActive && 'scale-125 border-drs-cyan bg-drs-cyan shadow-[0_0_8px_#00E5FF]'
                )}
              />

              <div
                className={cn(
                  'flex-1 border rounded-card p-3 transition-all duration-[150ms]',
                  isActive ? 'border-fw-border-active bg-elevated/40' : 'border-fw-border bg-panel group-hover:bg-elevated/20',
                  TYPE_COLORS[phase.type]
                )}
              >
                <div className="flex justify-between items-baseline mb-1 text-mono-meta font-mono">
                  <span className="font-semibold uppercase tracking-wider text-[9px]">
                    {TYPE_LABELS[phase.type] || phase.type.toUpperCase()}
                  </span>
                  <span className="text-text-muted">
                    LAPS {phase.startLap} - {phase.endLap}
                  </span>
                </div>
                <p className="text-xs text-text-primary leading-snug">
                  {phase.description}
                </p>
              </div>
            </motion.div>
          );
        })}

        {/* Incidents timeline overlay */}
        {incidents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-fw-border flex flex-col gap-2">
            <span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
               stewards_incident_log
            </span>
            <div className="flex flex-col gap-2">
              {incidents.map((inc, i) => (
                <div
                  key={i}
                  onClick={() => onIncidentClick?.(i)}
                  className="border border-f1-red/20 bg-f1-red/5 rounded-card p-3 text-xs leading-normal cursor-pointer hover:bg-f1-red/10 transition-colors"
                >
                  <div className="flex justify-between font-mono text-[9px] text-f1-red mb-1">
                    <span>⚠ INCIDENT_REPORTER</span>
                    <span>LAP {inc.lap}</span>
                  </div>
                  <p className="text-text-secondary">{inc.description}</p>
                  <div className="flex gap-2 mt-2">
                    {inc.drivers.map((d) => (
                      <span key={d} className="font-mono text-[9px] bg-f1-red/15 text-f1-red px-1 border border-f1-red/25 rounded-sm">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Horizontal variant (scrolling timeline bar)
  return (
    <div className="w-full bg-panel border border-fw-border rounded-card p-3 select-none overflow-x-auto">
      <div className="min-w-[760px] flex items-center justify-between gap-1 relative before:absolute before:left-2 before:right-2 before:h-0.5 before:bg-fw-border">
        {phases.map((phase, idx) => {
          const isActive = activePhaseIndex === idx;
          return (
            <div
              key={idx}
              onClick={() => onPhaseClick?.(idx)}
              className={cn(
                'relative flex-1 flex flex-col items-center pt-4 cursor-pointer group',
                isActive ? 'text-drs-cyan' : 'text-text-muted'
              )}
            >
              {/* Dot */}
              <div
                className={cn(
                  'absolute top-[-3px] w-2 h-2 rounded-full bg-canvas border border-fw-border group-hover:border-text-primary z-10 transition-all',
                  isActive ? 'bg-drs-cyan border-drs-cyan scale-125' : '',
                  phase.type === 'incident' ? 'border-f1-red' : ''
                )}
              />
              <span className="font-mono text-[9px] mt-1 font-semibold">L{phase.startLap}-{phase.endLap}</span>
              <span className="text-[10px] text-center truncate max-w-[120px] text-text-secondary mt-1 group-hover:text-text-primary transition-colors">
                {phase.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
