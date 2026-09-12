import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

/**
 * TelemetryCard - Clinical Canvas-Based F1 Telemetry Visualizer
 *
 * Implements strict design system rules from docs/design_system.md:
 * - Zero line-smoothing (miter line joins, crisp angular transitions)
 * - Strict track distance alignment (X-axis in meters from start/finish line)
 * - 250m slate grid intervals with 500m/1000m labels
 * - High contrast: Chaser/Driver A (#00E5FF Neon Cyan), Defender/Driver B (#FFD600 Neon Yellow)
 * - Brake overlay: Neon F1 Red (#FF1801) with rgba(255, 24, 1, 0.08) fill when active
 * - High-DPI Canvas scaling with devicePixelRatio
 * - Interactive distance-synchronized crosshair & HUD telemetry inspector
 * - Monospace data table deep-dive mode
 * - Zero client-side mock/placeholder fallbacks (pure backend telemetry data)
 */
export function TelemetryCard({
  driverA,
  driverB = null,
  metric: initialMetric = "speed",
  lapNumber,
  trackName,
  highlightZone,
  variant = "collapsed",
  onHover,
  onExpand,
  hoverDist,
  className
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [activeMetric, setActiveMetric] = useState(initialMetric);
  const [localHoverDist, setLocalHoverDist] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 600, height: 140 });

  const activeHoverDist = hoverDist !== undefined ? hoverDist : localHoverDist;
  const isCollapsed = variant === "collapsed";
  const isDeepDive = variant === "deepDive" || showTable;

  // Sync activeMetric if initialMetric changes externally
  useEffect(() => {
    if (initialMetric) setActiveMetric(initialMetric);
  }, [initialMetric]);

  // Determine card height
  const chartHeight = useMemo(() => {
    if (isCollapsed) return 140;
    if (activeMetric === "multi") return 360;
    if (variant === "deepDive") return 300;
    return 240;
  }, [isCollapsed, activeMetric, variant]);

  // ResizeObserver for dynamic responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: Math.max(300, entry.contentRect.width || 600),
          height: chartHeight
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [chartHeight]);

  // Validate and extract telemetry points from backend arrays
  const dataA = useMemo(() => (Array.isArray(driverA?.data) ? driverA.data : []), [driverA?.data]);
  const dataB = useMemo(() => (Array.isArray(driverB?.data) ? driverB.data : []), [driverB?.data]);
  const hasData = dataA.length > 0 || dataB.length > 0;
  const hasGearData = useMemo(() => {
    const checkPts = (pts) => pts && pts.length > 0 && pts.some((p) => Number(p.gear) > 0);
    return checkPts(dataA) || checkPts(dataB);
  }, [dataA, dataB]);

  // Calculate total track distance from real telemetry data points
  const totalDistance = useMemo(() => {
    let maxDist = 0;
    if (dataA.length > 0) maxDist = Math.max(maxDist, dataA[dataA.length - 1].distanceM || 0);
    if (dataB.length > 0) maxDist = Math.max(maxDist, dataB[dataB.length - 1].distanceM || 0);
    return maxDist > 0 ? Math.ceil(maxDist) : 5000;
  }, [dataA, dataB]);

  // Max scale values per metric
  const getMetricConfig = useCallback((met) => {
    switch (met) {
      case "speed":
        return { max: 350, min: 0, unit: "km/h", ticks: [100, 200, 300], label: "SPEED (km/h)" };
      case "throttle":
        return { max: 100, min: 0, unit: "%", ticks: [50, 100], label: "THROTTLE (%)" };
      case "brake":
        return { max: 100, min: 0, unit: "%", ticks: [50, 100], label: "BRAKE (%)" };
      case "gear":
        return { max: 8, min: 1, unit: "GEAR", ticks: [1, 2, 3, 4, 5, 6, 7, 8], label: "GEAR (1-8)" };
      case "rpm":
        return { max: 14000, min: 4000, unit: "RPM", ticks: [6000, 9000, 12000], label: "RPM" };
      default:
        return { max: 100, min: 0, unit: "", ticks: [50, 100], label: String(met).toUpperCase() };
    }
  }, []);

  // Canvas render engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = dimensions.width;
    const h = dimensions.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padLeft = isCollapsed ? 10 : 48;
    const padRight = 12;
    const padTop = isCollapsed ? 12 : 20;
    const padBottom = isCollapsed ? 16 : 32;
    const plotW = Math.max(10, w - padLeft - padRight);
    const plotH = Math.max(10, h - padTop - padBottom);

    const getX = (distM) => padLeft + (distM / totalDistance) * plotW;

    // Helper to draw single channel grid & traces
    const drawChannel = (met, yOffset, channelHeight, isMultiSubplot = false) => {
      const cfg = getMetricConfig(met);
      const getY = (val) => {
        const normalized = (val - cfg.min) / (cfg.max - cfg.min);
        const clamped = Math.max(0, Math.min(1, normalized));
        return yOffset + channelHeight - clamped * channelHeight;
      };

      // Background channel panel for multi-view clarity
      if (isMultiSubplot) {
        ctx.fillStyle = "rgba(22, 25, 30, 0.4)";
        ctx.fillRect(padLeft, yOffset, plotW, channelHeight);
      } else if (!isCollapsed) {
        // Explicit Y-Axis Metric Title with Unit
        ctx.fillStyle = "#8E9AA8";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillText(cfg.label + " ↑", padLeft, yOffset - 6);
      }

      // 1. Distance Grid Lines (250m intervals per design spec)
      ctx.strokeStyle = "#1C2025";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.font = "9px 'JetBrains Mono', 'Roboto Mono', monospace";
      ctx.fillStyle = "#5C6470";

      const distStep = totalDistance > 6000 ? 500 : 250;
      for (let m = 0; m <= totalDistance; m += distStep) {
        const x = getX(m);
        ctx.beginPath();
        ctx.moveTo(x, yOffset);
        ctx.lineTo(x, yOffset + channelHeight);
        ctx.stroke();

        // Distance text labels on bottom-most channel
        if (yOffset + channelHeight >= plotH - 5) {
          if (!isCollapsed && m % (distStep * 2) === 0) {
            ctx.fillText(`${m}m`, x - 10, h - 16);
          }
        }
      }

      // X-Axis Title Centered at Bottom of Chart
      if (!isCollapsed && (yOffset + channelHeight >= plotH - 5)) {
        ctx.fillStyle = "#8E9AA8";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("DISTANCE (m) →", padLeft + plotW / 2, h - 4);
        ctx.textAlign = "left";
      }

      // 2. Metric Horizontal Reference Lines
      cfg.ticks.forEach((tickVal) => {
        const y = getY(tickVal);
        ctx.strokeStyle = "#16191E";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();

        if (!isCollapsed) {
          ctx.fillStyle = "#8E9AA8";
          ctx.font = "9px 'JetBrains Mono', monospace";
          ctx.fillText(`${tickVal}`, 6, y + 3);
        }
      });

      // Channel title banner for multi-mode
      if (isMultiSubplot) {
        ctx.fillStyle = "#00E5FF";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillText(cfg.label, padLeft + 6, yOffset + 12);
      }

      // 3. Highlight Zone (if specified, e.g. apex/braking zone lock)
      if (highlightZone && highlightZone.startM !== undefined && highlightZone.endM !== undefined) {
        const xStart = getX(highlightZone.startM);
        const xEnd = getX(highlightZone.endM);
        ctx.fillStyle = "rgba(0, 229, 255, 0.05)";
        ctx.fillRect(xStart, yOffset, xEnd - xStart, channelHeight);
        ctx.strokeStyle = "rgba(0, 229, 255, 0.25)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(xStart, yOffset);
        ctx.lineTo(xStart, yOffset + channelHeight);
        ctx.moveTo(xEnd, yOffset);
        ctx.lineTo(xEnd, yOffset + channelHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Draw Trace Line with ZERO Line Smoothing (Pixel-precise miter joins)
      const renderTrace = (pts, strokeColor, isDriverA) => {
        if (!pts || pts.length === 0) return;

        // Brake channel area fill when active (> 10%)
        if (met === "brake") {
          ctx.beginPath();
          let inBrakeZone = false;

          pts.forEach((pt) => {
            const x = getX(pt.distanceM || 0);
            const rawB = pt.brake;
            const bVal = typeof rawB === "boolean" ? (rawB ? 100 : 0) : Number(rawB) || 0;
            const y = getY(bVal);

            if (bVal > 10) {
              if (!inBrakeZone) {
                inBrakeZone = true;
                ctx.moveTo(x, getY(0));
              }
              ctx.lineTo(x, y);
            } else {
              if (inBrakeZone) {
                inBrakeZone = false;
                ctx.lineTo(x, getY(0));
                ctx.closePath();
                ctx.fillStyle = isDriverA ? "rgba(255, 24, 1, 0.12)" : "rgba(255, 214, 0, 0.08)";
                ctx.fill();
                ctx.beginPath();
              }
            }
          });

          if (inBrakeZone) {
            ctx.lineTo(getX(pts[pts.length - 1].distanceM || 0), getY(0));
            ctx.closePath();
            ctx.fillStyle = isDriverA ? "rgba(255, 24, 1, 0.12)" : "rgba(255, 214, 0, 0.08)";
            ctx.fill();
          }
        }

        // Stroke line path
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = "miter";
        ctx.lineCap = "butt";

        pts.forEach((pt, idx) => {
          const x = getX(pt.distanceM || 0);
          let val = pt[met];
          if (met === "brake" && typeof val === "boolean") val = val ? 100 : 0;
          if (met === "gear") {
            val = Number(val) || 0;
            if (val <= 0) return; // Strict data integrity: do not fabricate gear numbers when zero
          }
          if (typeof val !== "number") val = Number(val) || 0;
          const y = getY(val);

          // Step trace for gear
          if (met === "gear" && idx > 0) {
            const prevX = getX(pts[idx - 1].distanceM || 0);
            ctx.lineTo(x, getY(Number(pts[idx - 1].gear) || val));
          }

          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      };

      // Render Driver B (Defender - #FFD600) then Driver A (Chaser - #00E5FF)
      if (dataB.length > 0) {
        renderTrace(dataB, driverB?.color || "#FFD600", false);
      }
      if (dataA.length > 0) {
        renderTrace(dataA, driverA?.color || (met === "brake" ? "#FF1801" : "#00E5FF"), true);
      }
    };

    // Multi-track mode: Render stacked Speed, Throttle, Brake
    if (activeMetric === "multi" && !isCollapsed) {
      const channelGap = 10;
      const subH = (plotH - channelGap * 2) / 3;
      drawChannel("speed", padTop, subH, true);
      drawChannel("throttle", padTop + subH + channelGap, subH, true);
      drawChannel("brake", padTop + (subH + channelGap) * 2, subH, true);
    } else {
      drawChannel(activeMetric === "multi" ? "speed" : activeMetric, padTop, plotH, false);
    }
  }, [
    dimensions,
    dataA,
    dataB,
    activeMetric,
    totalDistance,
    highlightZone,
    isCollapsed,
    hasData,
    driverA,
    driverB,
    getMetricConfig
  ]);

  const rafRef = useRef(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Handle crosshair cursor movement with RAF throttling
  const handleMouseMove = (e) => {
    if (isCollapsed || !hasData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padLeft = 38;
    const padRight = 10;
    const plotW = Math.max(10, rect.width - padLeft - padRight);
    const relX = Math.max(0, Math.min(plotW, x - padLeft));
    const distM = Math.round((relX / plotW) * totalDistance);
    const clampedDist = Math.max(0, Math.min(totalDistance, distM));

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setLocalHoverDist(clampedDist);
      onHover?.(clampedDist);
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setLocalHoverDist(null);
    onHover?.(null);
  };

  // Fast O(log N) binary search for closest point by distance bin
  const getPointAtDist = (points, dist) => {
    if (!points || points.length === 0) return null;
    let low = 0;
    let high = points.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const mDist = points[mid].distanceM || 0;
      if (mDist < dist) {
        low = mid + 1;
      } else if (mDist > dist) {
        high = mid - 1;
      } else {
        return points[mid];
      }
    }
    if (low >= points.length) return points[points.length - 1];
    if (high < 0) return points[0];
    const p1 = points[high];
    const p2 = points[low];
    return Math.abs((p1.distanceM || 0) - dist) <= Math.abs((p2.distanceM || 0) - dist) ? p1 : p2;
  };

  const ptA = activeHoverDist !== null ? getPointAtDist(dataA, activeHoverDist) : null;
  const ptB = activeHoverDist !== null ? getPointAtDist(dataB, activeHoverDist) : null;

  const formatVal = (point, met) => {
    if (!point || point[met] === undefined || point[met] === null) return "N/A";
    const raw = point[met];
    const num = typeof raw === "boolean" ? (raw ? 100 : 0) : Number(raw);
    return isNaN(num) ? "N/A" : num.toFixed(0);
  };

  // Delta calculation for hover HUD
  const getDelta = (met) => {
    if (!ptA || !ptB) return null;
    let vA = ptA[met];
    let vB = ptB[met];
    if (typeof vA === "boolean") vA = vA ? 100 : 0;
    if (typeof vB === "boolean") vB = vB ? 100 : 0;
    const nA = Number(vA);
    const nB = Number(vB);
    if (isNaN(nA) || isNaN(nB)) return null;
    const diff = nA - nB;
    const cfg = getMetricConfig(met);
    return {
      diff,
      text: `${diff >= 0 ? "+" : ""}${diff.toFixed(0)} ${cfg.unit}`
    };
  };

  const padLeft = isCollapsed ? 10 : 38;
  const padRight = 10;
  const plotW = Math.max(10, dimensions.width - padLeft - padRight);
  const crosshairLeft = activeHoverDist !== null ? padLeft + (activeHoverDist / totalDistance) * plotW : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "evidence-card bg-panel border border-fw-border rounded-card p-3.5 flex flex-col justify-between select-none relative transition-all duration-200",
        className
      )}
      style={{ minHeight: isCollapsed ? 140 : chartHeight + (showTable ? 320 : 60) }}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-fw-border pb-2.5 text-mono-meta font-mono">
        <div className="flex items-center gap-2.5">
          <span className="text-text-primary font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-drs-cyan animate-pulse" />
            {activeMetric.toUpperCase()}_TRACE // {driverA?.code || "DRV_A"}
            {driverB?.code ? ` vs ${driverB.code}` : ""}
          </span>
          <span className="text-text-muted">LAP {lapNumber || 1}</span>
          {highlightZone && (
            <span className="text-drs-cyan bg-drs-cyan/10 px-1.5 py-0.5 border border-drs-cyan/20 rounded-sm text-[10px]">
              ZONE_LOCK
            </span>
          )}
        </div>

        {/* Channel Selector Buttons (when expanded) */}
        {!isCollapsed && (
          <div className="flex items-center gap-1 bg-canvas border border-fw-border rounded-card p-0.5">
            {["speed", "throttle", "brake", "gear", "multi"].map((met) => (
              <button
                key={met}
                onClick={() => setActiveMetric(met)}
                className={cn(
                  "px-2 py-0.5 rounded-sm text-[10px] uppercase font-mono transition-colors",
                  activeMetric === met
                    ? "bg-drs-cyan text-canvas font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary hover:bg-panel"
                )}
              >
                {met}
              </button>
            ))}
          </div>
        )}

        {/* Right Header Metadata / Actions */}
        <div className="flex items-center gap-3">
          <span className="text-text-muted hidden sm:inline">{trackName || "Circuit"}</span>
          {!isCollapsed && (
            <button
              onClick={() => setShowTable(!showTable)}
              className={cn(
                "px-2 py-0.5 rounded-sm text-[10px] font-mono border transition-colors",
                showTable
                  ? "border-drs-cyan text-drs-cyan bg-drs-cyan/10"
                  : "border-fw-border text-text-muted hover:text-text-primary"
              )}
            >
              {showTable ? "[HIDE_TABLE]" : "[DATA_TABLE]"}
            </button>
          )}
          {onExpand && (
            <button
              onClick={onExpand}
              className="text-drs-cyan hover:underline transition-colors font-semibold"
            >
              {isCollapsed ? "[EXPAND]" : "[POP_OUT]"}
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center font-mono text-xs text-text-muted gap-1">
          <span className="text-f1-red font-semibold">// NO TELEMETRY TRACE PERSISTED</span>
          <span>No downsampled FastF1 data points recorded for this driver and lap.</span>
        </div>
      ) : (
        <div
          className="relative flex-1 cursor-crosshair mt-2"
          style={{ height: chartHeight - 40 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

          {/* Honest Gear Fallback Overlay */}
          {activeMetric === "gear" && !hasGearData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-panel/95 backdrop-blur-sm z-10 text-center font-mono p-4 border border-fw-border">
              <span className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                ⚠️ GEAR DATA UNAVAILABLE
              </span>
              <span className="text-[11px] text-text-muted max-w-sm">
                FastF1 telemetry for this session does not contain recorded physical nGear channels.
                FrontWing enforces strict data integrity and does not synthesize fake gear traces.
              </span>
            </div>
          )}

          {/* Hover Crosshair & HUD Overlay */}
          {activeHoverDist !== null && !isCollapsed && (
            <>
              {/* Vertical crosshair line */}
              <div
                className="absolute top-0 bottom-0 w-px border-l border-dashed border-drs-cyan/80 pointer-events-none shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                style={{
                  transform: `translate3d(${crosshairLeft}px, 0, 0)`,
                  willChange: "transform"
                }}
              />

              {/* Hover HUD Badge */}
              <div
                className="absolute top-2 bg-panel/95 border border-drs-cyan/50 rounded-card p-2.5 text-mono-meta font-mono pointer-events-none z-20 flex flex-col gap-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.6),0_0_15px_rgba(0,229,255,0.15)] backdrop-blur-md min-w-[150px] transition-transform duration-75"
                style={{
                  transform: `translate3d(${crosshairLeft > dimensions.width - 180 ? crosshairLeft - 170 : crosshairLeft + 14}px, 0, 0)`,
                  willChange: "transform"
                }}
              >
                <div className="text-text-primary font-bold border-b border-fw-border pb-1 flex justify-between items-center">
                  <span>DIST: {activeHoverDist}m</span>
                  <span className="text-[9px] text-text-muted">LAP {lapNumber || 1}</span>
                </div>

                {/* Primary Metric Value */}
                <div className="flex flex-col gap-1 text-[11px]">
                  <div className="flex justify-between items-center" style={{ color: "#00E5FF" }}>
                    <span className="font-semibold">{driverA?.code || "DRV_A"}:</span>
                    <span>
                      {formatVal(ptA, activeMetric === "multi" ? "speed" : activeMetric)}{" "}
                      {getMetricConfig(activeMetric === "multi" ? "speed" : activeMetric).unit}
                    </span>
                  </div>

                  {driverB?.code && ptB && (
                    <div className="flex justify-between items-center" style={{ color: "#FFD600" }}>
                      <span className="font-semibold">{driverB.code}:</span>
                      <span>
                        {formatVal(ptB, activeMetric === "multi" ? "speed" : activeMetric)}{" "}
                        {getMetricConfig(activeMetric === "multi" ? "speed" : activeMetric).unit}
                      </span>
                    </div>
                  )}

                  {/* Delta indicator */}
                  {driverB?.code && ptB && (
                    <div className="flex justify-between items-center border-t border-fw-border pt-1 text-[10px]">
                      <span className="text-text-muted">DELTA:</span>
                      <span
                        className={cn(
                          "font-bold",
                          (getDelta(activeMetric === "multi" ? "speed" : activeMetric)?.diff || 0) >= 0
                            ? "text-drs-cyan"
                            : "text-f1-red"
                        )}
                      >
                        {getDelta(activeMetric === "multi" ? "speed" : activeMetric)?.text || "0"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Multi-channel telemetry sub-metrics */}
                {activeMetric !== "multi" && ptA && (
                  <div className="flex items-center gap-2 border-t border-fw-border pt-1 text-[9px] text-text-muted">
                    <span>THR: {formatVal(ptA, "throttle")}%</span>
                    <span>BRK: {formatVal(ptA, "brake")}%</span>
                    <span>GEAR: {formatVal(ptA, "gear")}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Multi-Trace Legend & Explanatory Caption */}
      {activeMetric === "multi" && !isCollapsed && hasData && (
        <div className="mt-3 p-3 bg-canvas/60 border border-fw-border rounded-card flex flex-col gap-2 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-3">
              <span className="text-text-muted font-bold tracking-wider">DRIVERS:</span>
              <span className="flex items-center gap-1.5 text-drs-cyan font-bold">
                <span className="w-2.5 h-0.5 bg-drs-cyan rounded-full inline-block" />
                {driverA?.code || "DRIVER A"}
              </span>
              {driverB?.code && (
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <span className="w-2.5 h-0.5 bg-amber-400 rounded-full inline-block" />
                  {driverB.code}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-drs-cyan" /> SPEED (km/h)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> THROTTLE (0-100%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-f1-red" /> BRAKE (THRESHOLD)
              </span>
            </div>
          </div>
          <p className="text-[11px] text-text-muted border-t border-fw-border/60 pt-2 italic">
            Synchronized multi-channel telemetry trace comparing vehicle speed, full throttle application, and threshold braking points against track distance from the start/finish line.
          </p>
        </div>
      )}

      {/* Collapsed State Summary Row */}
      {isCollapsed && hasData && (
        <div className="flex justify-between items-center text-mono-meta font-mono text-text-muted mt-2 border-t border-fw-border pt-1">
          <span>0m</span>
          <span className="text-[10px] text-text-secondary uppercase">
            {driverA?.code || "DRIVER"} ({dataA.length} PTS)
            {driverB?.code ? ` VS ${driverB.code} (${dataB.length} PTS)` : ""}
          </span>
          <span>{totalDistance}m</span>
        </div>
      )}

      {/* Deep-Dive Monospace Telemetry Grid Table */}
      {isDeepDive && hasData && (
        <div className="border-t border-fw-border pt-3 mt-3 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
            <span className="text-text-primary font-semibold uppercase">
              DISTANCE_BINNED_TELEMETRY_LOG // 10M_SLICES
            </span>
            <span>SHOWING {Math.min(25, dataA.length)} POINTS</span>
          </div>

          <div className="overflow-x-auto max-h-[220px] overflow-y-auto border border-fw-border rounded-card bg-canvas">
            <table className="w-full text-left font-mono text-[10px]">
              <thead className="bg-panel border-b border-fw-border sticky top-0 text-text-muted">
                <tr>
                  <th className="py-1 px-2.5">DIST (m)</th>
                  <th className="py-1 px-2" style={{ color: "#00E5FF" }}>
                    {driverA?.code || "A"} SPD
                  </th>
                  {driverB?.code && (
                    <th className="py-1 px-2" style={{ color: "#FFD600" }}>
                      {driverB.code} SPD
                    </th>
                  )}
                  {driverB?.code && <th className="py-1 px-2 text-text-primary">Δ SPD</th>}
                  <th className="py-1 px-2" style={{ color: "#00E5FF" }}>
                    {driverA?.code || "A"} THR
                  </th>
                  {driverB?.code && (
                    <th className="py-1 px-2" style={{ color: "#FFD600" }}>
                      {driverB.code} THR
                    </th>
                  )}
                  <th className="py-1 px-2" style={{ color: "#00E5FF" }}>
                    {driverA?.code || "A"} BRK
                  </th>
                  {driverB?.code && (
                    <th className="py-1 px-2" style={{ color: "#FFD600" }}>
                      {driverB.code} BRK
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-fw-border text-text-secondary">
                {dataA.slice(0, 30).map((ptAItem, idx) => {
                  const dist = ptAItem.distanceM || 0;
                  const ptBItem = getPointAtDist(dataB, dist);
                  const spdA = Number(ptAItem.speed) || 0;
                  const spdB = ptBItem ? Number(ptBItem.speed) || 0 : 0;
                  const deltaSpd = spdA - spdB;
                  const thrA = Number(ptAItem.throttle) || 0;
                  const thrB = ptBItem ? Number(ptBItem.throttle) || 0 : 0;
                  const brkA = typeof ptAItem.brake === "boolean" ? (ptAItem.brake ? 100 : 0) : Number(ptAItem.brake) || 0;
                  const brkB = ptBItem
                    ? typeof ptBItem.brake === "boolean"
                      ? ptBItem.brake
                        ? 100
                        : 0
                      : Number(ptBItem.brake) || 0
                    : 0;

                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "hover:bg-panel/80 transition-colors",
                        activeHoverDist !== null && Math.abs(dist - activeHoverDist) < 50
                          ? "bg-drs-cyan/10 font-bold"
                          : ""
                      )}
                    >
                      <td className="py-1 px-2.5 text-text-primary">{dist.toFixed(1)}</td>
                      <td className="py-1 px-2" style={{ color: "#00E5FF" }}>
                        {spdA.toFixed(0)}
                      </td>
                      {driverB?.code && (
                        <td className="py-1 px-2" style={{ color: "#FFD600" }}>
                          {ptBItem ? spdB.toFixed(0) : "-"}
                        </td>
                      )}
                      {driverB?.code && (
                        <td
                          className={cn(
                            "py-1 px-2",
                            deltaSpd >= 0 ? "text-drs-cyan" : "text-f1-red font-semibold"
                          )}
                        >
                          {ptBItem ? `${deltaSpd >= 0 ? "+" : ""}${deltaSpd.toFixed(0)}` : "-"}
                        </td>
                      )}
                      <td className="py-1 px-2">{thrA.toFixed(0)}%</td>
                      {driverB?.code && <td className="py-1 px-2">{ptBItem ? `${thrB.toFixed(0)}%` : "-"}</td>}
                      <td className={cn("py-1 px-2", brkA > 0 ? "text-f1-red font-semibold" : "")}>
                        {brkA.toFixed(0)}%
                      </td>
                      {driverB?.code && (
                        <td className={cn("py-1 px-2", brkB > 0 ? "text-f1-red font-semibold" : "")}>
                          {ptBItem ? `${brkB.toFixed(0)}%` : "-"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
