import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { AIStage } from '@/lib/types';

interface AIThinkingIndicatorProps {
  stage: AIStage;
  detail: string;
  className?: string;
}

const STAGE_LABELS: Record<AIStage, string> = {
  parsing: 'PARSING_QUERY',
  loading_data: 'LOADING_FASTF1_DATABASE',
  computing: 'RUNNING_STINT_REGRESSION_MODELS',
  generating: 'GENERATING_NARRATIVE_DEBRIEF',
  done: 'COMPILATION_COMPLETE',
};

export function AIThinkingIndicator({ stage, detail, className }: AIThinkingIndicatorProps) {
  const [dots, setDots] = useState('');

  // Cycle dots: . -> .. -> ... -> .
  useEffect(() => {
    if (stage === 'done') return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '.' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, [stage]);

  const stagesList: AIStage[] = ['parsing', 'loading_data', 'computing', 'generating'];
  const activeIdx = stagesList.indexOf(stage);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'border border-fw-border rounded-card bg-panel p-4 flex flex-col gap-3',
        className
      )}
    >
      {/* Ticker Row */}
      <div className="flex justify-between items-center text-mono-meta font-mono">
        <div className="flex items-center gap-2">
          <span className="text-drs-cyan animate-pulse">●</span>
          <span className="text-text-primary font-semibold">
            {STAGE_LABELS[stage]}
            {stage !== 'done' && dots}
          </span>
        </div>
        <span className="text-text-muted">{detail}</span>
      </div>

      {/* Progress pipeline tracker */}
      <div className="flex gap-1.5 w-full">
        {stagesList.map((stg, idx) => {
          const isCompleted = idx < activeIdx || stage === 'done';
          const isActive = stage === stg;

          return (
            <div
              key={stg}
              className={cn(
                'h-1 flex-1 rounded-sm border transition-all duration-[200ms]',
                isCompleted && 'bg-drs-cyan border-drs-cyan/30',
                isActive && 'bg-teammate-yellow border-teammate-yellow/30 animate-pulse',
                !isCompleted && !isActive && 'bg-elevated border-fw-border'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
