import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  recentSearches?: string[];
  trending?: string[];
  onResultClick?: (query: string) => void;
}

export function SearchOverlay({
  isOpen,
  onClose,
  recentSearches = [],
  trending = [],
  onResultClick,
}: SearchOverlayProps) {
  const [value, setValue] = useState('');

  const filteredSuggestions = trending.filter((item) =>
    item.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-[10vh]">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Search Panel Container */}
          <motion.div
            role="search"
            aria-label="Ask the AI Race Engineer"
            className="w-full max-w-[560px] bg-panel border border-fw-border rounded-card shadow-2xl relative z-10 overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Input Row */}
            <div className="flex items-center px-4 py-3 border-b border-fw-border">
              <svg className="w-4 h-4 text-text-muted mr-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search GP races, strategic debates, or telemetry nodes..."
                className="flex-1 bg-transparent outline-none placeholder:text-text-muted text-text-primary text-sm font-sans"
                autoFocus
              />
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-secondary text-xs font-mono shrink-0 pl-3 border-l border-fw-border"
              >
                [ESC]
              </button>
            </div>

            {/* Results / Suggestion Lists */}
            <div className="p-4 flex flex-col gap-5 max-h-[320px] overflow-y-auto">
              {value.trim() === '' ? (
                <>
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
                        RECENT_INVESTIGATIONS
                      </span>
                      <div className="flex flex-col gap-1">
                        {recentSearches.map((rec) => (
                          <button
                            key={rec}
                            onClick={() => onResultClick?.(rec)}
                            className="text-left py-1 px-2 rounded-button text-xs text-text-secondary hover:bg-elevated/40 hover:text-text-primary transition-colors truncate"
                          >
                            {rec}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Queries */}
                  {trending.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
                        TRENDING_INVESTIGATIVE_LOOPS
                      </span>
                      <div className="flex flex-col gap-1">
                        {trending.map((trend) => (
                          <button
                            key={trend}
                            onClick={() => onResultClick?.(trend)}
                            className="text-left py-1.5 px-2 rounded-button text-xs text-text-secondary hover:bg-elevated/40 hover:text-text-primary transition-colors flex items-center gap-2"
                          >
                            <span className="text-drs-cyan font-mono text-[9px]">◆</span>
                            <span className="truncate">{trend}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Filtered Options */
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
                    FILTERED_TACTICAL_RESULTS
                  </span>
                  <div className="flex flex-col gap-1">
                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map((item) => (
                        <button
                          key={item}
                          onClick={() => onResultClick?.(item)}
                          className="text-left py-1.5 px-2 rounded-button text-xs text-text-secondary hover:bg-elevated/40 hover:text-text-primary transition-colors flex items-center justify-between"
                        >
                          <span className="truncate">{item}</span>
                          <span className="font-mono text-[9px] text-text-muted">[VIEW]</span>
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-text-muted font-mono p-2">
                        NO_RECORDS_MATCHING_CRITERIA
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
