import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PROGRESS_STAGES = [
  { id: "session", label: "Resolving Session", matches: ["parsing", "session"] },
  { id: "telemetry", label: "Gathering Data", matches: ["loading_data", "telemetry", "computing"] },
  { id: "synthesizing", label: "Synthesizing Analysis", matches: ["generating", "synthesizing", "done"] }
];

export function AIThinkingIndicator({ stage = "parsing", detail, className }) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulse((p) => (p + 1) % 4);
    }, 350);
    return () => clearInterval(timer);
  }, []);

  const getStageStatus = (stageItemIdx) => {
    // Current active index
    let currentIdx = 0;
    if (["loading_data", "telemetry", "computing"].includes(stage)) {
      currentIdx = 1;
    } else if (["generating", "synthesizing", "done"].includes(stage)) {
      currentIdx = 2;
    }

    if (stageItemIdx < currentIdx) return "completed";
    if (stageItemIdx === currentIdx) return "active";
    return "pending";
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border border-border-subtle rounded-card bg-surface-base/90 backdrop-blur-md p-4 flex flex-col gap-3.5 shadow-card",
        className
      )}
    >
      {/* 3-Stage Progressive Resolution Bar */}
      <div className="grid grid-cols-3 gap-2">
        {PROGRESS_STAGES.map((s, idx) => {
          const status = getStageStatus(idx);
          return (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-badge border font-mono text-[11px] transition-all duration-200",
                status === "completed" && "bg-timing-green/10 border-timing-green/30 text-timing-green font-semibold",
                status === "active" && "bg-accent-primary/10 border-accent-primary/40 text-accent-primary font-bold shadow-sm",
                status === "pending" && "bg-surface-raised/40 border-border-subtle text-text-muted opacity-60"
              )}
            >
              {status === "completed" ? (
                <span className="w-4 h-4 rounded-full bg-timing-green/20 text-timing-green flex items-center justify-center text-[10px] font-bold">
                  ✓
                </span>
              ) : status === "active" ? (
                <span className="w-4 h-4 rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center text-[10px] animate-spin">
                  ⚙
                </span>
              ) : (
                <span className="w-4 h-4 rounded-full bg-surface-raised text-text-muted flex items-center justify-center text-[9px]">
                  {idx + 1}
                </span>
              )}
              <span className="truncate tracking-wider">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Real-time Telemetry Status Ticker */}
      <div className="flex items-center justify-between text-mono-meta font-mono border-t border-border-subtle pt-2.5 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
          <span className="text-text-primary font-semibold tracking-wide">
            Race Engineer Analysis
          </span>
        </div>
        <span className="text-text-secondary font-mono italic">
          {detail || "Querying telemetry streams and aerodynamic models..."}
        </span>
      </div>
    </div>
  );
}
