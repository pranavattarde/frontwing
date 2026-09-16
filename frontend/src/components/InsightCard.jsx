import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function InsightCard({
  insight,
  variant = "card",
  onClick,
  onDismiss
}) {
  if (!insight) return null;

  const headline = insight.headline || insight.title || "Strategic Telemetry Insight";
  const rawMetric = insight.metric || (insight.metrics ? {
    value: insight.metrics.metric_value,
    unit: insight.metrics.metric_unit,
    context: insight.metrics.metric_context
  } : null);

  const metric = {
    value: rawMetric?.value ?? "+0.24s",
    unit: rawMetric?.unit ?? "/ LAP",
    context: rawMetric?.context ?? "Estimated delta"
  };

  const confidence = insight.confidence || "high";
  const source = insight.source || insight.source_outlet || "Reputable F1 Media";
  const source_url = insight.source_url;

  const confidenceColors = {
    high: "text-timing-green border-timing-green/30 bg-timing-green/10",
    medium: "text-timing-yellow border-timing-yellow/30 bg-timing-yellow/10",
    low: "text-accent-danger border-accent-danger/30 bg-accent-danger/10"
  };

  if (variant === "inline") {
    return (
      <span
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-xs border cursor-pointer hover:bg-surface-raised transition-colors duration-fast",
          confidenceColors[confidence] || confidenceColors.high
        )}
      >
        <span className="font-semibold type-tabular">{metric.value}{metric.unit}</span>
        <span className="text-text-muted">({headline})</span>
      </span>
    );
  }

  return (
    <motion.div
      className={cn(
        "bg-surface-base border border-border-subtle rounded p-4 relative flex flex-col justify-between group transition-all duration-fast",
        variant === "featured" ? "min-h-[120px] w-full sm:w-[280px]" : "min-h-[90px] w-full sm:w-[220px]"
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {onDismiss && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute top-2 right-2 text-text-muted hover:text-accent-danger opacity-0 group-hover:opacity-100 transition-opacity duration-fast"
          aria-label="Dismiss insight"
        >
          ✕
        </button>
      )}

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-text-muted tracking-wider">
            Insight
          </span>
        </div>

        {/* Headline */}
        <h4 className="text-text-primary text-sm font-semibold leading-snug mb-2 pr-4 font-sans">
          {headline}
        </h4>
      </div>

      <div className="mt-2">
        {/* Metric */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="font-mono text-xl font-bold text-accent-primary type-tabular">
            {typeof metric.value === "number" && metric.unit === "s/lap" ? metric.value.toFixed(3) : metric.value}
          </span>
          <span className="font-mono text-xs text-text-muted">{metric.unit}</span>
        </div>

        {/* Context & Source */}
        <p className="font-mono text-xs text-text-muted leading-tight truncate" title={metric?.context}>
          {metric?.context}
        </p>
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted/70 mt-1.5 pt-1.5 border-t border-border-subtle">
          <span className="truncate max-w-[140px]" title={source}>Source: {source}</span>
          {source_url && (
            <a
              href={source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:text-accent-primary-hover hover:underline transition-colors shrink-0 ml-1 font-semibold"
              onClick={(e) => e.stopPropagation()}
            >
              Verify ↗
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
