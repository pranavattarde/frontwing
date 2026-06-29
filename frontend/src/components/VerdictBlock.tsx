import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VerdictBlockProps {
  verdict: string;
  confidence: number; // 0-100
  className?: string;
}

export function VerdictBlock({ verdict, confidence, className }: VerdictBlockProps) {
  const getConfidenceColor = (val: number) => {
    if (val >= 80) return 'text-tire-inter border-tire-inter/20 bg-tire-inter/5';
    if (val >= 50) return 'text-teammate-yellow border-teammate-yellow/20 bg-teammate-yellow/5';
    return 'text-f1-red border-f1-red/20 bg-f1-red/5';
  };

  return (
    <motion.div
      className={cn(
        'border border-fw-border rounded-card p-4 bg-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden',
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Left indicator strip matching confidence color */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1',
          confidence >= 80 ? 'bg-tire-inter' : confidence >= 50 ? 'bg-teammate-yellow' : 'bg-f1-red'
        )}
      />

      <div className="flex-1 pl-2">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-1">
          AI_VERDICT
        </span>
        <h2 className="text-text-primary text-base font-semibold leading-snug">
          {verdict}
        </h2>
      </div>

      <div className="shrink-0 flex flex-col items-end pl-2 sm:pl-0">
        <span className="text-[9px] font-mono text-text-muted uppercase">CONFIDENCE</span>
        <span
          className={cn(
            'font-mono text-xs font-semibold px-2 py-0.5 border rounded-sm mt-0.5',
            getConfidenceColor(confidence)
          )}
        >
          {confidence}%
        </span>
      </div>
    </motion.div>
  );
}
