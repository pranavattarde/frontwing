import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface KeyMoment {
  lap: number;
  description: string;
  type: 'incident' | 'strategy' | 'overtake';
}

interface RaceStoryCardProps {
  title: string;
  summary: string;
  keyMoments: KeyMoment[];
  raceId: string;
  variant?: 'featured' | 'compact';
  onMomentClick?: (index: number) => void;
  onFullDebrief?: () => void;
}

const MOMENT_ICONS: Record<string, string> = {
  incident: '⚠',
  strategy: '◆',
  overtake: '▸',
};

const MOMENT_COLORS: Record<string, string> = {
  incident: 'text-f1-red border-f1-red/20 bg-f1-red/5',
  strategy: 'text-teammate-yellow border-teammate-yellow/20 bg-teammate-yellow/5',
  overtake: 'text-drs-cyan border-drs-cyan/20 bg-drs-cyan/5',
};

/** component_library.md §12: RaceStoryCard */
export function RaceStoryCard({
  title,
  summary,
  keyMoments,
  onMomentClick,
  onFullDebrief,
  variant = 'featured',
}: RaceStoryCardProps) {
  const isFeatured = variant === 'featured';

  return (
    <motion.article
      className={cn(
        'evidence-card overflow-hidden',
        isFeatured ? 'p-6' : 'p-4'
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Title */}
      <h3
        className={cn(
          'text-text-primary font-semibold mb-3',
          isFeatured ? 'text-h1' : 'text-h2'
        )}
      >
        {title}
      </h3>

      {/* Narrative */}
      <p className="text-body text-text-secondary leading-relaxed mb-4">
        {summary}
      </p>

      {/* Key Moments */}
      {keyMoments.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          <span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
            Key Moments
          </span>
          <div className="flex flex-col gap-1.5">
            {keyMoments.map((moment, i) => (
              <motion.button
                key={i}
                onClick={() => onMomentClick?.(i)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-card border text-left transition-all duration-[80ms] hover:bg-elevated',
                  MOMENT_COLORS[moment.type]
                )}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 + 0.1, duration: 0.15 }}
              >
                <span className="font-mono text-mono-meta shrink-0">
                  {MOMENT_ICONS[moment.type]}
                </span>
                <span className="font-mono text-mono-meta text-text-muted shrink-0 w-10">
                  L{moment.lap}
                </span>
                <span className="text-sm text-text-secondary">
                  {moment.description}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Full Debrief CTA */}
      {isFeatured && onFullDebrief && (
        <button
          onClick={onFullDebrief}
          className="text-mono-meta font-mono text-drs-cyan hover:underline underline-offset-2 transition-colors duration-[80ms]"
        >
          VIEW FULL RACE BRIEFING →
        </button>
      )}
    </motion.article>
  );
}
