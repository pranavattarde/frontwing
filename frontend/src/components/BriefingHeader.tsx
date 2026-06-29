import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, SessionState } from '@/lib/types';

interface BriefingHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  sessionState: SessionState;
  onBreadcrumbClick?: (index: number) => void;
  onSearchTrigger?: () => void;
  onLogoClick?: () => void;
}

/** component_library.md §1: BriefingHeader */
export const BriefingHeader = memo(function BriefingHeader({
  breadcrumbs,
  sessionState,
  onBreadcrumbClick,
  onSearchTrigger,
  onLogoClick,
}: BriefingHeaderProps) {
  return (
    <nav
      aria-label="Investigation breadcrumb"
      className="sticky top-0 z-10 border-b border-fw-border bg-canvas/95 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between h-12 px-4 max-w-[1440px] mx-auto">
        {/* Logo + Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Logo */}
          <button
            onClick={onLogoClick}
            className="flex items-center gap-1.5 shrink-0 group"
            aria-label="Return to Briefing Room"
          >
            <span className="text-drs-cyan font-mono text-mono-meta font-semibold tracking-widest group-hover:text-text-primary transition-colors duration-[80ms]">
              FW
            </span>
            <span className="hidden sm:inline text-text-muted font-mono text-mono-meta tracking-wider group-hover:text-text-secondary transition-colors duration-[80ms]">
              FRONTWING
            </span>
          </button>

          {/* Separator */}
          {breadcrumbs.length > 0 && (
            <span className="text-text-muted mx-1">/</span>
          )}

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <motion.div
                    key={crumb.label}
                    className="flex items-center gap-1 min-w-0"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {index > 0 && (
                      <span className="text-text-muted text-xs">/</span>
                    )}
                    <button
                      onClick={() => onBreadcrumbClick?.(index)}
                      className={cn(
                        'text-mono-meta font-mono truncate max-w-[160px] transition-colors duration-[80ms]',
                        isLast
                          ? 'text-text-primary'
                          : 'text-text-muted hover:text-text-secondary hover:underline underline-offset-2'
                      )}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {crumb.label}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Session State Indicator */}
          {sessionState !== 'idle' && (
            <div className="flex items-center gap-1.5 ml-2" aria-live="polite">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  sessionState === 'streaming' && 'bg-drs-cyan animate-cursor-pulse',
                  sessionState === 'loading' && 'bg-teammate-yellow animate-cursor-pulse',
                  sessionState === 'error' && 'bg-f1-red'
                )}
              />
              <span className="text-mono-meta font-mono text-text-muted">
                {sessionState === 'streaming' && 'STREAMING'}
                {sessionState === 'loading' && 'LOADING'}
                {sessionState === 'error' && 'ERROR'}
              </span>
            </div>
          )}
        </div>

        {/* Search Trigger */}
        <button
          onClick={onSearchTrigger}
          className="flex items-center gap-2 px-3 py-1.5 rounded-card border border-fw-border bg-panel hover:bg-elevated hover:border-fw-border-active transition-all duration-[80ms] group"
          aria-label="Open search (Cmd+K)"
        >
          <svg
            className="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="hidden sm:inline text-mono-meta font-mono text-text-muted group-hover:text-text-secondary">
            ⌘K
          </span>
        </button>
      </div>
    </nav>
  );
});
