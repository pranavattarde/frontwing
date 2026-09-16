import { useState } from "react";
import { cn } from "@/lib/utils";
import { GhostFightSimulator } from "@/components/GhostFightSimulator";

export function TelemetryComparisonCard({
  comparativeAnalysis,
  telemetryDataA = [],
  telemetryDataB = [],
  driverA = { code: "DRV_A", name: "Driver A" },
  driverB = { code: "DRV_B", name: "Driver B" },
  trackName = "Grand Prix Circuit",
  lapNumberA = 1,
  lapNumberB = 1,
  className
}) {
  const [activeTab, setActiveTab] = useState("sectors");

  const fastDriver = comparativeAnalysis?.faster_driver || driverA?.name || driverA?.code;
  const lapDelta = comparativeAnalysis?.lap_delta_s || 0;
  const summary = comparativeAnalysis?.analysis_summary || comparativeAnalysis?.executive_summary;
  const sectorBreakdown = comparativeAnalysis?.sector_breakdown || {};
  const strongerA = comparativeAnalysis?.driver_a_stronger_sectors || [];
  const strongerB = comparativeAnalysis?.driver_b_stronger_sectors || [];

  const nameA = driverA?.name || driverA?.code || "DRIVER A";
  const nameB = driverB?.name || driverB?.code || "DRIVER B";
  const codeA = driverA?.code || nameA.slice(0, 3).toUpperCase();
  const codeB = driverB?.code || nameB.slice(0, 3).toUpperCase();

  const isAWinner = fastDriver.toLowerCase().includes(nameA.toLowerCase()) || fastDriver.toLowerCase().includes(codeA.toLowerCase());

  return (
    <div className={cn("bg-surface-base border border-border-subtle rounded p-5 flex flex-col gap-5 select-none shadow-lg animate-slide-up", className)}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse" />
          <div>
            <h2 className="font-mono text-sm font-bold text-text-primary tracking-wider">
              Head-to-Head Telemetry Comparison • {trackName}
            </h2>
            <span className="font-mono text-[10px] text-text-muted type-tabular">
              Session Personal Best Laps: {codeA} (Lap {lapNumberA}) vs {codeB} (Lap {lapNumberB})
            </span>
          </div>
        </div>

        {/* Faster Driver Pill */}
        <div
          className={cn(
            "self-start sm:self-auto px-3 py-1.5 rounded font-mono text-xs font-bold tracking-wider flex items-center gap-2 border",
            isAWinner
              ? "bg-accent-primary/15 border-accent-primary/40 text-accent-primary"
              : "bg-timing-yellow/15 border-timing-yellow/40 text-timing-yellow"
          )}
        >
          <span>🏆 {fastDriver} Faster</span>
          <span className="text-[10px] opacity-80 type-tabular">(-{lapDelta.toFixed(3)}s)</span>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Tabular Comparison UI */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Executive Summary Card */}
          {summary && (
            <div className="bg-surface-raised border border-border-subtle rounded p-3 font-mono text-xs text-text-secondary leading-relaxed">
              <span className="text-accent-primary font-bold mr-1.5">[Summary]</span>
              {summary.replace(/\*\*Executive Summary:\*\*/g, "").trim()}
            </div>
          )}

          {/* Table Tab Selector */}
          <div className="flex justify-between items-center border-b border-border-subtle pb-2">
            <span className="font-mono text-[10px] text-text-muted tracking-wider">
              Comparative Metrics Matrix
            </span>
            <div className="flex gap-1.5 font-mono text-[10px]">
              <button
                onClick={() => setActiveTab("sectors")}
                className={cn(
                  "px-2.5 py-1 rounded border transition-colors font-semibold",
                  activeTab === "sectors"
                    ? "border-accent-primary text-accent-primary bg-accent-primary/10 font-bold"
                    : "border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-raised"
                )}
              >
                Sectors & Pace
              </button>
              <button
                onClick={() => setActiveTab("speeds")}
                className={cn(
                  "px-2.5 py-1 rounded border transition-colors font-semibold",
                  activeTab === "speeds"
                    ? "border-accent-primary text-accent-primary bg-accent-primary/10 font-bold"
                    : "border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-raised"
                )}
              >
                Speeds & Throttle
              </button>
            </div>
          </div>

          {/* Tabular Formatted Comparison */}
          {activeTab === "sectors" ? (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-[10px] text-text-muted">
                    <th className="py-2 px-3">Sector / Metric</th>
                    <th className="py-2 px-3 text-accent-primary font-bold">{codeA} (Lap {lapNumberA})</th>
                    <th className="py-2 px-3 text-timing-yellow font-bold">{codeB} (Lap {lapNumberB})</th>
                    <th className="py-2 px-3">Delta</th>
                    <th className="py-2 px-3">Advantage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {/* S1 Row */}
                  {sectorBreakdown.S1 && (
                    <tr className="hover:bg-surface-raised transition-colors type-tabular">
                      <td className="py-2.5 px-3 font-bold text-text-primary">Sector 1</td>
                      <td className="py-2.5 px-3 text-accent-primary font-bold">{sectorBreakdown.S1.driver_a_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3 text-timing-yellow font-bold">{sectorBreakdown.S1.driver_b_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3">
                        <span className={cn("font-bold", sectorBreakdown.S1.delta <= 0 ? "text-accent-primary" : "text-timing-yellow")}>
                          {sectorBreakdown.S1.delta <= 0 ? `${sectorBreakdown.S1.delta.toFixed(3)}s` : `+${sectorBreakdown.S1.delta.toFixed(3)}s`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wide flex items-center gap-1 w-fit border", sectorBreakdown.S1.delta <= 0 ? "bg-accent-primary/15 text-accent-primary border-accent-primary/30" : "bg-timing-yellow/15 text-timing-yellow border-timing-yellow/30")}>
                          {sectorBreakdown.S1.winner_badge || `🏆 ${sectorBreakdown.S1.delta <= 0 ? codeA : codeB} Faster`}
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* S2 Row */}
                  {sectorBreakdown.S2 && (
                    <tr className="hover:bg-surface-raised transition-colors type-tabular">
                      <td className="py-2.5 px-3 font-bold text-text-primary">Sector 2</td>
                      <td className="py-2.5 px-3 text-accent-primary font-bold">{sectorBreakdown.S2.driver_a_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3 text-timing-yellow font-bold">{sectorBreakdown.S2.driver_b_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3">
                        <span className={cn("font-bold", sectorBreakdown.S2.delta <= 0 ? "text-accent-primary" : "text-timing-yellow")}>
                          {sectorBreakdown.S2.delta <= 0 ? `${sectorBreakdown.S2.delta.toFixed(3)}s` : `+${sectorBreakdown.S2.delta.toFixed(3)}s`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wide flex items-center gap-1 w-fit border", sectorBreakdown.S2.delta <= 0 ? "bg-accent-primary/15 text-accent-primary border-accent-primary/30" : "bg-timing-yellow/15 text-timing-yellow border-timing-yellow/30")}>
                          {sectorBreakdown.S2.winner_badge || `🏆 ${sectorBreakdown.S2.delta <= 0 ? codeA : codeB} Faster`}
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* S3 Row */}
                  {sectorBreakdown.S3 && (
                    <tr className="hover:bg-surface-raised transition-colors type-tabular">
                      <td className="py-2.5 px-3 font-bold text-text-primary">Sector 3</td>
                      <td className="py-2.5 px-3 text-accent-primary font-bold">{sectorBreakdown.S3.driver_a_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3 text-timing-yellow font-bold">{sectorBreakdown.S3.driver_b_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3">
                        <span className={cn("font-bold", sectorBreakdown.S3.delta <= 0 ? "text-accent-primary" : "text-timing-yellow")}>
                          {sectorBreakdown.S3.delta <= 0 ? `${sectorBreakdown.S3.delta.toFixed(3)}s` : `+${sectorBreakdown.S3.delta.toFixed(3)}s`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wide flex items-center gap-1 w-fit border", sectorBreakdown.S3.delta <= 0 ? "bg-accent-primary/15 text-accent-primary border-accent-primary/30" : "bg-timing-yellow/15 text-timing-yellow border-timing-yellow/30")}>
                          {sectorBreakdown.S3.winner_badge || `🏆 ${sectorBreakdown.S3.delta <= 0 ? codeA : codeB} Faster`}
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-[10px] text-text-muted">
                    <th className="py-2 px-3">Telemetry Channel</th>
                    <th className="py-2 px-3 text-accent-primary font-bold">{codeA}</th>
                    <th className="py-2 px-3 text-timing-yellow font-bold">{codeB}</th>
                    <th className="py-2 px-3">Delta</th>
                    <th className="py-2 px-3">Leader</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  <tr className="hover:bg-surface-raised transition-colors type-tabular">
                    <td className="py-2.5 px-3 font-bold text-text-primary">Top Speed (V_Max)</td>
                    <td className="py-2.5 px-3 text-accent-primary font-bold">
                      {Math.round(Math.max(...(sectorBreakdown.S1 ? [sectorBreakdown.S1.driver_a_top_speed, sectorBreakdown.S2.driver_a_top_speed, sectorBreakdown.S3.driver_a_top_speed] : [300])))} km/h
                    </td>
                    <td className="py-2.5 px-3 text-timing-yellow font-bold">
                      {Math.round(Math.max(...(sectorBreakdown.S1 ? [sectorBreakdown.S1.driver_b_top_speed, sectorBreakdown.S2.driver_b_top_speed, sectorBreakdown.S3.driver_b_top_speed] : [300])))} km/h
                    </td>
                    <td className="py-2.5 px-3 text-text-muted font-mono">
                      ±{Math.abs(Math.round((sectorBreakdown.S1?.driver_a_top_speed || 0) - (sectorBreakdown.S1?.driver_b_top_speed || 0)))} km/h
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-raised text-text-primary border border-border-subtle">
                        {(sectorBreakdown.S1?.driver_a_top_speed || 0) >= (sectorBreakdown.S1?.driver_b_top_speed || 0) ? codeA : codeB}
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-raised transition-colors type-tabular">
                    <td className="py-2.5 px-3 font-bold text-text-primary">Full Throttle %</td>
                    <td className="py-2.5 px-3 text-accent-primary font-bold">
                      {sectorBreakdown.S1 ? ((sectorBreakdown.S1.driver_a_throttle_pct + sectorBreakdown.S2.driver_a_throttle_pct + sectorBreakdown.S3.driver_a_throttle_pct) / 3).toFixed(1) : "62.5"}%
                    </td>
                    <td className="py-2.5 px-3 text-timing-yellow font-bold">
                      {sectorBreakdown.S1 ? ((sectorBreakdown.S1.driver_b_throttle_pct + sectorBreakdown.S2.driver_b_throttle_pct + sectorBreakdown.S3.driver_b_throttle_pct) / 3).toFixed(1) : "60.1"}%
                    </td>
                    <td className="py-2.5 px-3 text-text-muted font-mono">
                      ±1.5%
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-raised text-text-primary border border-border-subtle">
                        {codeA}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Performance Takeaway Badges */}
          <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
            {strongerA.length > 0 && (
              <span className="px-2.5 py-1 rounded bg-accent-primary/10 border border-accent-primary/30 text-accent-primary font-bold">
                ✓ {codeA} Stronger in: {strongerA.join(", ")}
              </span>
            )}
            {strongerB.length > 0 && (
              <span className="px-2.5 py-1 rounded bg-timing-yellow/10 border border-timing-yellow/30 text-timing-yellow font-bold">
                ✓ {codeB} Stronger in: {strongerB.join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Continuous Live Ghost Fight Simulator */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          <GhostFightSimulator
            driverA={{
              code: codeA,
              name: nameA,
              color: "#E10600",
              data: telemetryDataA
            }}
            driverB={{
              code: codeB,
              name: nameB,
              color: "#FFD600",
              data: telemetryDataB
            }}
            lapNumber={lapNumberA}
            trackName={trackName}
          />
        </div>
      </div>
    </div>
  );
}
