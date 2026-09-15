import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FrontWingLogo } from "./FrontWingLogo";

export const BriefingHeader = memo(function BriefingHeader2({
  breadcrumbs = [],
  sessionState = "idle",
  onBreadcrumbClick,
  onSearchTrigger,
  onLogoClick
}) {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <nav
      aria-label="Investigation breadcrumb"
      className="sticky top-0 z-10 border-b border-border-subtle bg-surface-base/95 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between h-12 px-4 max-w-[1440px] mx-auto">
        {/* Logo + Breadcrumbs */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Return to Briefing Room"
          >
            <FrontWingLogo variant="mark" size="sm" />
            <span className="hidden sm:inline font-heading font-black text-xs tracking-wider text-text-muted group-hover:text-text-primary transition-colors duration-fast">
              FRONT<span className="text-accent-primary">WING</span>
            </span>
          </button>
          {breadcrumbs.length > 0 && <span className="text-text-muted/60 text-xs mx-1">/</span>}
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
                    {index > 0 && <span className="text-text-muted/60 text-xs">/</span>}
                    <button
                      onClick={() => onBreadcrumbClick?.(index)}
                      className={cn(
                        "font-mono text-xs truncate max-w-[220px] transition-colors duration-fast",
                        isLast
                          ? "text-text-primary font-bold"
                          : "text-text-muted hover:text-text-secondary hover:underline underline-offset-2"
                      )}
                      aria-current={isLast ? "page" : undefined}
                    >
                      {crumb.label}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {sessionState !== "idle" && (
            <div className="flex items-center gap-1.5 ml-2" aria-live="polite">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  sessionState === "streaming" && "bg-accent-primary animate-pulse",
                  sessionState === "loading" && "bg-timing-yellow animate-pulse",
                  sessionState === "error" && "bg-accent-danger"
                )}
              />
              <span className="font-mono text-[10px] tracking-wider text-text-muted">
                {sessionState === "streaming" && "STREAMING"}
                {sessionState === "loading" && "LOADING"}
                {sessionState === "error" && "ERROR"}
              </span>
            </div>
          )}
        </div>

        {/* Top-Right Search Trigger ONLY on Homepage */}
        {isHomePage ? (
          <button
            onClick={onSearchTrigger || (() => window.dispatchEvent(new CustomEvent("toggle-search-overlay")))}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-border-subtle bg-surface-raised hover:bg-surface-elevated hover:border-border-strong transition-all duration-fast group"
            aria-label="Open search (Cmd+K)"
          >
            <svg
              className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <span className="hidden sm:inline font-mono text-[11px] text-text-muted group-hover:text-text-primary">
              ⌘K
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/30 text-[10px] font-mono font-semibold tracking-wider text-accent-primary uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
              AI_ENGINEER_ACTIVE
            </span>
          </div>
        )}
      </div>
    </nav>
  );
});
