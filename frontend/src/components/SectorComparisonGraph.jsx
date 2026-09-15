import { cn } from "@/lib/utils";

export function SectorComparisonGraph({
  data,
  driverCode = "DRIVER A",
  comparativeDriverCode = "DRIVER B",
  className
}) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("bg-surface-base border border-border-subtle rounded p-4 text-xs font-mono text-text-muted", className)}>
        NO_SECTOR_COMPARISON_DATA
      </div>
    );
  }

  const codeA = String(driverCode || "DRIVER A").toUpperCase();
  const codeB = comparativeDriverCode ? String(comparativeDriverCode).toUpperCase() : "BENCHMARK";

  return (
    <div className={cn("bg-surface-base border border-border-subtle rounded p-4 flex flex-col gap-4 select-none", className)}>
      {/* Header */}
      <div className="flex justify-between items-center text-xs font-mono border-b border-border-subtle pb-2.5">
        <span className="text-text-primary font-bold tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-primary" />
          SECTOR_TIME_COMPARISON // DELTA_ANALYSIS
        </span>
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <span className="text-accent-primary font-bold">{codeA}</span>
          <span className="text-text-muted">vs</span>
          <span className="text-timing-yellow font-bold">{codeB}</span>
        </div>
      </div>

      {/* 3 Sector Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.map((s) => {
          const isAFaster = s.delta <= 0;
          const winnerCode = s.winner_badge ? s.winner_badge.replace("🏆 ", "").replace(" FASTER", "").trim() : (s.faster_driver ? String(s.faster_driver).toUpperCase() : (isAFaster ? codeA : codeB));
          const winnerBadgeText = s.winner_badge || `🏆 ${winnerCode} FASTER`;
          const deltaAbs = Math.abs(s.delta);
          const deltaStr = isAFaster ? `-${deltaAbs.toFixed(3)}s` : `+${deltaAbs.toFixed(3)}s`;

          return (
            <div
              key={s.sector}
              className={cn(
                "flex flex-col p-3 rounded border transition-all relative overflow-hidden",
                isAFaster
                  ? "border-accent-primary/40 bg-accent-primary/5 shadow-[0_0_15px_rgba(225,6,0,0.05)]"
                  : "border-timing-yellow/40 bg-timing-yellow/5 shadow-[0_0_15px_rgba(255,214,0,0.05)]"
              )}
            >
              {/* Sector Header & Delta */}
              <div className="flex justify-between items-center text-xs font-mono mb-2">
                <span className="font-bold text-text-primary text-xs">{s.sector}</span>
                <span
                  className={cn(
                    "font-mono text-xs font-bold px-1.5 py-0.5 rounded type-tabular",
                    isAFaster
                      ? "bg-accent-primary/15 text-accent-primary border border-accent-primary/30"
                      : "bg-timing-yellow/15 text-timing-yellow border border-timing-yellow/30"
                  )}
                >
                  {deltaStr}
                </span>
              </div>

              {/* Explicit Faster Driver Announcement Badge */}
              <div className="mb-2.5">
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded block text-center shadow-xs",
                    isAFaster
                      ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/40"
                      : "bg-timing-yellow/20 text-timing-yellow border border-timing-yellow/40"
                  )}
                >
                  {winnerBadgeText}
                </span>
              </div>

              {/* Driver Times Breakdown */}
              <div className="flex flex-col gap-1.5 text-[11px] font-mono border-t border-border-subtle/80 pt-2 text-text-muted type-tabular">
                <div className="flex justify-between items-center">
                  <span className="text-accent-primary font-bold">{codeA}:</span>
                  <span className="text-text-primary font-bold">{s.driver_time.toFixed(3)}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-timing-yellow font-bold">{codeB}:</span>
                  <span className="text-text-primary font-bold">{s.benchmark_time.toFixed(3)}s</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

