import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ReasoningEvent {
  timestamp: number; // ms offset
  type: 'data_load' | 'computation' | 'comparison' | 'conclusion';
  description: string;
  duration_ms: number;
}

interface ReasoningTimelineProps {
  events: ReasoningEvent[];
  totalDuration: number;
  className?: string;
}

const TYPE_COLORS: Record<string, string> = {
  data_load: 'bg-drs-cyan border-drs-cyan/30 text-drs-cyan',
  computation: 'bg-teammate-yellow border-teammate-yellow/30 text-teammate-yellow',
  comparison: 'bg-f1-red border-f1-red/30 text-f1-red',
  conclusion: 'bg-tire-inter border-tire-inter/30 text-tire-inter',
};

export function ReasoningTimeline({ events, totalDuration, className }: ReasoningTimelineProps) {
  return (
    <div className={cn('bg-panel border border-fw-border rounded-card p-4 flex flex-col gap-4 select-none w-full', className)}>
      {/* Title */}
      <div className="flex justify-between items-center text-mono-meta font-mono border-b border-fw-border pb-2">
        <span className="text-text-primary font-semibold uppercase tracking-wider">
          REASONING_PIPELINE_LATENCY
        </span>
        <span className="text-text-muted">TOTAL_DURATION: {totalDuration}MS</span>
      </div>

      {/* Latency ticks block */}
      <div className="relative flex flex-col gap-3 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-fw-border">
        {events.map((evt, idx) => {
          return (
            <motion.div
              key={idx}
              className="flex gap-4 items-start pl-6 relative"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.15 }}
            >
              {/* Bullet indicator */}
              <div
                className={cn(
                  'absolute left-[9px] top-1.5 w-1.5 h-1.5 rounded-full border border-canvas',
                  TYPE_COLORS[evt.type].split(' ')[0]
                )}
              />

              <div className="flex-1 flex justify-between items-baseline gap-2 font-mono">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-text-primary">
                    +{evt.timestamp}ms: {evt.description}
                  </span>
                  <span className="text-[9px] text-text-muted uppercase">
                    TYPE: {evt.type}
                  </span>
                </div>
                <span className="text-text-muted text-[10px] shrink-0 font-semibold">
                  {evt.duration_ms}ms
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
