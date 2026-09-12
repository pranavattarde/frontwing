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
    high: "text-tire-inter border-tire-inter/20 bg-tire-inter/5",
    medium: "text-teammate-yellow border-teammate-yellow/20 bg-teammate-yellow/5",
    low: "text-f1-red border-f1-red/20 bg-f1-red/5"
  };
  if (variant === "inline") {
    return <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-mono text-xs border cursor-pointer hover:bg-elevated transition-colors duration-[80ms]",
        confidenceColors[confidence] || confidenceColors.high
      )}
    ><span className="font-semibold">{metric.value}{metric.unit}</span><span className="text-text-muted">({headline})</span></span>;
  }
  return <motion.div
    onClick={onClick}
    className={cn(
      "evidence-card p-4 relative flex flex-col justify-between hover-lift cursor-pointer group hover:border-fw-border-active transition-all duration-[80ms]",
      variant === "featured" ? "min-h-[120px] w-full sm:w-[280px]" : "min-h-[90px] w-full sm:w-[220px]"
    )}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
  >{onDismiss && <button
    onClick={(e) => {
      e.stopPropagation();
      onDismiss();
    }}
    className="absolute top-2 right-2 text-text-muted hover:text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-[80ms]"
    aria-label="Dismiss insight"
  >
          ✕
        </button>}<div>{
    /* Confidence Badge */
  }<div className="flex items-center justify-between mb-2"><span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
            INSIGHT
          </span><span
    className={cn(
      "font-mono text-[9px] px-1.5 py-0.2 rounded-sm border uppercase font-medium",
      confidenceColors[confidence]
    )}
  >{confidence} CONFIDENCE
          </span></div>{
    /* Headline */
  }<h4 className="text-text-primary text-sm font-medium leading-snug mb-2 pr-4">{headline}</h4></div><div className="mt-2">{
    /* Metric */
  }<div className="flex items-baseline gap-1.5 mb-1"><span className="font-data text-xl font-semibold text-drs-cyan">{typeof metric.value === "number" && metric.unit === "s/lap" ? metric.value.toFixed(3) : metric.value}</span><span className="font-mono text-xs text-text-muted">{metric.unit}</span></div>{
    /* Context & Source */
  }<p className="text-mono-meta font-mono text-text-muted leading-tight truncate" title={metric?.context}>{metric?.context}</p><div className="flex items-center justify-between text-[10px] font-mono text-text-muted/70 mt-1.5 pt-1.5 border-t border-fw-border/30">
          <span className="truncate max-w-[140px]" title={source}>SRC: {source}</span>
          {source_url && (
            <a
              href={source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-drs-cyan/80 hover:text-drs-cyan hover:underline transition-colors shrink-0 ml-1"
              onClick={(e) => e.stopPropagation()}
            >
              VERIFY ↗
            </a>
          )}
        </div></div></motion.div>;
}
