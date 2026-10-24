import { cn } from "@/lib/utils";

export function InsightCard({
  insight,
  variant = "card",
  onClick,
  onDismiss,
  showMetric = true,
}) {
  if (!insight) return null;
  const headline = insight.headline || insight.title || "Race insight";
  const metric =
    insight.metric ||
    (insight.metrics
      ? {
          value: insight.metrics.metric_value,
          unit: insight.metrics.metric_unit,
          context: insight.metrics.metric_context,
        }
      : null);
  const hasMetric =
    showMetric && metric?.value !== null && metric?.value !== undefined;
  const source = insight.source || insight.source_outlet;
  const sourceUrl = /^https?:\/\//i.test(insight.source_url || "")
    ? insight.source_url
    : null;
  if (variant === "inline")
    return (
      <button
        onClick={onClick}
        className="border border-border-medium px-3 py-2 text-xs text-left"
      >
        {hasMetric && (
          <span className="font-mono type-tabular mr-2">
            {metric.value}
            {metric.unit}
          </span>
        )}
        {headline}
      </button>
    );
  return (
    <article
      className={cn(
        "paddock-insight",
        variant === "featured" && "paddock-insight-featured",
      )}
    >
      <div className="paddock-insight-source">
        <span>{source || "RACE INSIGHT"}</span>
        {onDismiss && (
          <button onClick={onDismiss} aria-label="Dismiss insight">
            ×
          </button>
        )}
      </div>
      {onClick ? (
        <button className="text-left" onClick={onClick}>
          <h3>{headline}</h3>
        </button>
      ) : (
        <h3>{headline}</h3>
      )}
      {hasMetric && (
        <div className="paddock-insight-metric">
          <strong className="type-tabular">
            {typeof metric.value === "number" && metric.unit === "s/lap"
              ? metric.value.toFixed(3)
              : metric.value}
          </strong>
          <span>{metric.unit}</span>
          {metric.context && <small>{metric.context}</small>}
        </div>
      )}
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          READ THE SOURCE <span aria-hidden="true">↗</span>
        </a>
      )}
    </article>
  );
}
