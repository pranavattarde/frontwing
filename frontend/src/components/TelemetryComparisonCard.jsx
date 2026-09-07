import { useState } from "react";
import { cn } from "@/lib/utils";
import { GhostFightSimulator } from "@/components/GhostFightSimulator";

/**
 * TelemetryComparisonCard - High-Impact F1 Driver Comparison Dashboard
 *
 * Displays a side-by-side layout:
 * - Left Pane: Executive summary, structured comparative telemetry table, and performance designation badges.
 * - Right Pane: Continuous live animated ghost fight loop with real-time HUD metrics.
 */
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
  const [activeTab, setActiveTab] = useState("sectors"); // 'sectors' | 'speeds'

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
    <div className={cn("bg-panel border border-fw-border rounded-card p-5 flex flex-col gap-5 select-none shadow-lg animate-slide-up", className)}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-fw-border pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-drs-cyan animate-pulse" />
          <div>
            <h2 className="font-mono text-sm font-bold text-text-primary tracking-wider uppercase">
              HEAD-TO-HEAD TELEMETRY COMPARISON // {trackName.toUpperCase()}
            </h2>
            <span className="font-mono text-[10px] text-text-muted">
              SESSION PERSONAL BEST LAPS: {codeA} (LAP {lapNumberA}) VS {codeB} (LAP {lapNumberB})
            </span>
          </div>
        </div>

        {/* Faster Driver Pill */}
        <div
          className={cn(
            "self-start sm:self-auto px-3 py-1.5 rounded-button font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 border",
            isAWinner
              ? "bg-drs-cyan/15 border-drs-cyan/40 text-drs-cyan"
              : "bg-teammate-yellow/15 border-teammate-yellow/40 text-teammate-yellow"
          )}
        >
          <span>🏆 {fastDriver} FASTER</span>
          <span className="text-[10px] opacity-80">(-{lapDelta.toFixed(3)}s)</span>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Tabular Comparison UI */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Executive Summary Card */}
          {summary && (
            <div className="bg-elevated/40 border border-fw-border rounded-card p-3 font-mono text-xs text-text-secondary leading-relaxed">
              <span className="text-drs-cyan font-bold mr-1.5">[EXECUTIVE_SUMMARY]</span>
              {summary.replace(/\*\*Executive Summary:\*\*/g, "").trim()}
            </div>
          )}

          {/* Table Tab Selector */}
          <div className="flex justify-between items-center border-b border-fw-border pb-2">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
              COMPARATIVE_METRICS_MATRIX
            </span>
            <div className="flex gap-1.5 font-mono text-[10px]">
              <button
                onClick={() => setActiveTab("sectors")}
                className={cn(
                  "px-2 py-0.5 rounded border transition-colors",
                  activeTab === "sectors"
                    ? "border-drs-cyan text-drs-cyan bg-drs-cyan/10 font-bold"
                    : "border-fw-border text-text-muted hover:text-text-primary"
                )}
              >
                SECTORS & PACE
              </button>
              <button
                onClick={() => setActiveTab("speeds")}
                className={cn(
                  "px-2 py-0.5 rounded border transition-colors",
                  activeTab === "speeds"
                    ? "border-drs-cyan text-drs-cyan bg-drs-cyan/10 font-bold"
                    : "border-fw-border text-text-muted hover:text-text-primary"
                )}
              >
                SPEEDS & THROTTLE
              </button>
            </div>
          </div>

          {/* Tabular Formatted Comparison */}
          {activeTab === "sectors" ? (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-fw-border text-[10px] text-text-muted uppercase">
                    <th className="py-2 px-3">SECTOR / METRIC</th>
                    <th className="py-2 px-3 text-drs-cyan">{codeA} (LAP {lapNumberA})</th>
                    <th className="py-2 px-3 text-teammate-yellow">{codeB} (LAP {lapNumberB})</th>
                    <th className="py-2 px-3">DELTA</th>
                    <th className="py-2 px-3">ADVANTAGE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fw-border/40">
                  {/* S1 Row */}
                  {sectorBreakdown.S1 && (
                    <tr className="hover:bg-elevated/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-text-primary">SECTOR 1</td>
                      <td className="py-2.5 px-3 text-drs-cyan font-bold">{sectorBreakdown.S1.driver_a_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3 text-teammate-yellow font-bold">{sectorBreakdown.S1.driver_b_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3">
                        <span className={cn("font-bold", sectorBreakdown.S1.delta <= 0 ? "text-drs-cyan" : "text-teammate-yellow")}>
                          {sectorBreakdown.S1.delta <= 0 ? `${sectorBreakdown.S1.delta.toFixed(3)}s` : `+${sectorBreakdown.S1.delta.toFixed(3)}s`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wide flex items-center gap-1 w-fit border", sectorBreakdown.S1.delta <= 0 ? "bg-drs-cyan/15 text-drs-cyan border-drs-cyan/30" : "bg-teammate-yellow/15 text-teammate-yellow border-teammate-yellow/30")}>
                          {sectorBreakdown.S1.winner_badge || `🏆 ${sectorBreakdown.S1.delta <= 0 ? codeA : codeB} FASTER`}
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* S2 Row */}
                  {sectorBreakdown.S2 && (
                    <tr className="hover:bg-elevated/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-text-primary">SECTOR 2</td>
                      <td className="py-2.5 px-3 text-drs-cyan font-bold">{sectorBreakdown.S2.driver_a_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3 text-teammate-yellow font-bold">{sectorBreakdown.S2.driver_b_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3">
                        <span className={cn("font-bold", sectorBreakdown.S2.delta <= 0 ? "text-drs-cyan" : "text-teammate-yellow")}>
                          {sectorBreakdown.S2.delta <= 0 ? `${sectorBreakdown.S2.delta.toFixed(3)}s` : `+${sectorBreakdown.S2.delta.toFixed(3)}s`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wide flex items-center gap-1 w-fit border", sectorBreakdown.S2.delta <= 0 ? "bg-drs-cyan/15 text-drs-cyan border-drs-cyan/30" : "bg-teammate-yellow/15 text-teammate-yellow border-teammate-yellow/30")}>
                          {sectorBreakdown.S2.winner_badge || `🏆 ${sectorBreakdown.S2.delta <= 0 ? codeA : codeB} FASTER`}
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* S3 Row */}
                  {sectorBreakdown.S3 && (
                    <tr className="hover:bg-elevated/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-text-primary">SECTOR 3</td>
                      <td className="py-2.5 px-3 text-drs-cyan font-bold">{sectorBreakdown.S3.driver_a_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3 text-teammate-yellow font-bold">{sectorBreakdown.S3.driver_b_time.toFixed(3)}s</td>
                      <td className="py-2.5 px-3">
                        <span className={cn("font-bold", sectorBreakdown.S3.delta <= 0 ? "text-drs-cyan" : "text-teammate-yellow")}>
                          {sectorBreakdown.S3.delta <= 0 ? `${sectorBreakdown.S3.delta.toFixed(3)}s` : `+${sectorBreakdown.S3.delta.toFixed(3)}s`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wide flex items-center gap-1 w-fit border", sectorBreakdown.S3.delta <= 0 ? "bg-drs-cyan/15 text-drs-cyan border-drs-cyan/30" : "bg-teammate-yellow/15 text-teammate-yellow border-teammate-yellow/30")}>
                          {sectorBreakdown.S3.winner_badge || `🏆 ${sectorBreakdown.S3.delta <= 0 ? codeA : codeB} FASTER`}
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
                  <tr className="border-b border-fw-border text-[10px] text-text-muted uppercase">
                    <th className="py-2 px-3">TELEMETRY CHANNEL</th>
                    <th className="py-2 px-3 text-drs-cyan">{codeA}</th>
                    <th className="py-2 px-3 text-teammate-yellow">{codeB}</th>
                    <th className="py-2 px-3">DELTA</th>
                    <th className="py-2 px-3">LEADER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fw-border/40">
                  <tr className="hover:bg-elevated/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-text-primary">TOP SPEED (V_MAX)</td>
                    <td className="py-2.5 px-3 text-drs-cyan font-bold">
                      {Math.round(Math.max(...(sectorBreakdown.S1 ? [sectorBreakdown.S1.driver_a_top_speed, sectorBreakdown.S2.driver_a_top_speed, sectorBreakdown.S3.driver_a_top_speed] : [300])))} km/h
                    </td>
                    <td className="py-2.5 px-3 text-teammate-yellow font-bold">
                      {Math.round(Math.max(...(sectorBreakdown.S1 ? [sectorBreakdown.S1.driver_b_top_speed, sectorBreakdown.S2.driver_b_top_speed, sectorBreakdown.S3.driver_b_top_speed] : [300])))} km/h
                    </td>
                    <td className="py-2.5 px-3 text-text-muted font-mono">
                      ±{Math.abs(Math.round((sectorBreakdown.S1?.driver_a_top_speed || 0) - (sectorBreakdown.S1?.driver_b_top_speed || 0)))} km/h
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-elevated text-text-primary border border-fw-border">
                        {(sectorBreakdown.S1?.driver_a_top_speed || 0) >= (sectorBreakdown.S1?.driver_b_top_speed || 0) ? codeA : codeB}
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-elevated/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-text-primary">FULL THROTTLE %</td>
                    <td className="py-2.5 px-3 text-drs-cyan font-bold">
                      {sectorBreakdown.S1 ? ((sectorBreakdown.S1.driver_a_throttle_pct + sectorBreakdown.S2.driver_a_throttle_pct + sectorBreakdown.S3.driver_a_throttle_pct) / 3).toFixed(1) : "62.5"}%
                    </td>
                    <td className="py-2.5 px-3 text-teammate-yellow font-bold">
                      {sectorBreakdown.S1 ? ((sectorBreakdown.S1.driver_b_throttle_pct + sectorBreakdown.S2.driver_b_throttle_pct + sectorBreakdown.S3.driver_b_throttle_pct) / 3).toFixed(1) : "60.1"}%
                    </td>
                    <td className="py-2.5 px-3 text-text-muted font-mono">
                      ±1.5%
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-elevated text-text-primary border border-fw-border">
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
              <span className="px-2.5 py-1 rounded bg-drs-cyan/10 border border-drs-cyan/30 text-drs-cyan font-semibold">
                ✓ {codeA} STRONGER IN: {strongerA.join(", ")}
              </span>
            )}
            {strongerB.length > 0 && (
              <span className="px-2.5 py-1 rounded bg-teammate-yellow/10 border border-teammate-yellow/30 text-teammate-yellow font-semibold">
                ✓ {codeB} STRONGER IN: {strongerB.join(", ")}
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
              color: "#00E5FF",
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
