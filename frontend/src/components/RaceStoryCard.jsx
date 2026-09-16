import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const MOMENT_ICONS = {
  incident: "⚠",
  strategy: "◆",
  overtake: "▸"
};

const MOMENT_COLORS = {
  incident: "text-accent-danger border-accent-danger/30 bg-accent-danger/10",
  strategy: "text-timing-yellow border-timing-yellow/30 bg-timing-yellow/10",
  overtake: "text-accent-primary border-accent-primary/30 bg-accent-primary/10"
};

export function RaceStoryCard({
  title,
  summary,
  keyMoments,
  onMomentClick,
  onFullDebrief,
  sourceUrl,
  sourceOutlet,
  variant = "featured"
}) {
  const isFeatured = variant === "featured";

  return (
    <motion.article
      className={cn(
        "bg-surface-base border border-border-subtle rounded card-interactive overflow-hidden flex flex-col justify-between",
        isFeatured ? "p-6" : "p-4"
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <div>
        {/* Source Outlet Badge & Title */}
        {sourceOutlet && (
          <div className="flex items-center justify-between gap-2 mb-2 text-[10px] font-mono">
            <span className="text-accent-primary uppercase tracking-wider px-2 py-0.5 rounded border border-accent-primary/30 bg-accent-primary/10 font-bold">
              {sourceOutlet}
            </span>
            {sourceUrl && /^https?:\/\//i.test(sourceUrl.trim()) && (
              <a
                href={sourceUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-accent-primary transition-colors flex items-center gap-1 font-semibold"
                onClick={(e) => e.stopPropagation()}
              >
                <span>SOURCE ↗</span>
              </a>
            )}
          </div>
        )}

        <h3
          className={cn(
            "text-text-primary font-heading font-bold mb-2 tracking-tight",
            isFeatured ? "text-xl lg:text-2xl" : "text-lg"
          )}
        >
          {title}
        </h3>

        {/* Narrative */}
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {summary}
        </p>

        {/* Key Moments */}
        {keyMoments && keyMoments.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            <span className="font-mono text-xs text-text-muted uppercase tracking-wider">
              KEY MOMENTS
            </span>
            <div className="flex flex-col gap-1.5">
              {keyMoments.map((moment, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded border text-left",
                    MOMENT_COLORS[moment.type]
                  )}
                >
                  <span className="font-mono text-xs shrink-0">{MOMENT_ICONS[moment.type]}</span>
                  <span className="font-mono text-xs text-text-muted shrink-0 w-10 type-tabular">
                    L{moment.lap}
                  </span>
                  <span className="text-xs text-text-secondary font-sans">{moment.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* External source verification link (Read-only editorial) */}
      <div className="flex items-center justify-end flex-wrap gap-3 mt-2 pt-3 border-t border-border-subtle">
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-text-muted hover:text-accent-primary transition-colors flex items-center gap-1 font-semibold"
            onClick={(e) => e.stopPropagation()}
          >
            <span>VERIFY ON {sourceOutlet ? sourceOutlet.toUpperCase() : "OUTLET"} ↗</span>
          </a>
        )}
      </div>
    </motion.article>
  );
}
