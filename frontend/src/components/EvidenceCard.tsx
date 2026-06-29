import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EvidenceCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: 'collapsed' | 'expanded' | 'deepDive';
  onExpand?: () => void;
  onDeepDive?: () => void;
  onExport?: () => void;
  className?: string;
}

export function EvidenceCard({
  title,
  subtitle,
  children,
  variant = 'collapsed',
  onExpand,
  onDeepDive,
  onExport,
  className,
}: EvidenceCardProps) {
  const isCollapsed = variant === 'collapsed';
  const isDeepDive = variant === 'deepDive';

  return (
    <motion.section
      className={cn(
        'evidence-card p-4 flex flex-col justify-between transition-all duration-[150ms] ease-fw relative',
        isCollapsed ? 'min-h-[140px]' : isDeepDive ? 'w-full min-h-[500px]' : 'min-h-[320px]',
        className
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Card Header */}
      <div className="flex justify-between items-start border-b border-fw-border pb-2.5 mb-3">
        <div>
          <h3 className="text-text-primary text-sm font-semibold tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-mono-meta font-mono text-text-muted mt-0.5 uppercase">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {onExport && (
            <button
              onClick={onExport}
              className="text-mono-meta font-mono text-text-muted hover:text-text-secondary transition-colors"
              title="Export as PNG"
            >
              [EXPORT]
            </button>
          )}
          {onDeepDive && !isCollapsed && (
            <button
              onClick={onDeepDive}
              className="text-mono-meta font-mono text-drs-cyan hover:underline transition-colors"
            >
              DEEP_DIVE
            </button>
          )}
          {onExpand && (
            <button
              onClick={onExpand}
              className="text-text-muted hover:text-text-primary p-0.5 transition-colors"
              aria-label={isCollapsed ? 'Expand card' : 'Collapse card'}
            >
              <svg
                className={cn('w-4 h-4 transform transition-transform duration-[150ms]', !isCollapsed && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Visual Content Area */}
      <div className="flex-1 w-full overflow-hidden flex flex-col justify-center">
        {children}
      </div>

      {/* Progress visual loader line at top when loading */}
      {variant === 'collapsed' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-drs-cyan/10 overflow-hidden rounded-t-card">
          <div className="h-full bg-drs-cyan/40 w-1/3 animate-skeleton" />
        </div>
      )}
    </motion.section>
  );
}
