import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getCircuitByTrackName } from "@/lib/circuitTracks";

/**
 * GhostFightSimulator - Real-time Continuous Ghost Battle Loop with Accurate SVG Track Map
 *
 * Simulates a continuous head-to-head ghost fight between Driver A (Cyan) and Driver B (Yellow)
 * running along an accurate F1 circuit outline with colored sector segments and live telemetry HUD.
 */
export function GhostFightSimulator({
  driverA,
  driverB,
  trackName = "Grand Prix Circuit",
  lapNumber,
  className
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [progressDist, setProgressDist] = useState(0); // in meters
  const [pathLength, setPathLength] = useState(1000);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const trackPathRef = useRef(null);

  const circuit = useMemo(() => getCircuitByTrackName(trackName), [trackName]);

  const dataA = useMemo(() => (Array.isArray(driverA?.data) ? driverA.data : []), [driverA?.data]);
  const dataB = useMemo(() => (Array.isArray(driverB?.data) ? driverB.data : []), [driverB?.data]);

  const totalDistance = useMemo(() => {
    let maxD = 0;
    if (dataA.length > 0) maxD = Math.max(maxD, dataA[dataA.length - 1].distanceM || 0);
    if (dataB.length > 0) maxD = Math.max(maxD, dataB[dataB.length - 1].distanceM || 0);
    return maxD > 100 ? Math.ceil(maxD) : (circuit.lengthMeters || 5800);
  }, [dataA, dataB, circuit]);

  const nameA = driverA?.name || driverA?.code || "DRIVER A";
  const nameB = driverB?.name || driverB?.code || "DRIVER B";
  const colorA = driverA?.color || "#00E5FF";
  const colorB = driverB?.color || "#FFD600";

  // Measure SVG track length once mounted or when circuit changes
  useEffect(() => {
    if (trackPathRef.current) {
      try {
        const len = trackPathRef.current.getTotalLength();
        if (len > 0) setPathLength(len);
      } catch (e) {
        // Fallback default length
      }
    }
  }, [circuit]);

  // Interpolate telemetry metrics at any distance
  const getInterpolatedPoint = useCallback((telemetry, dist) => {
    if (!telemetry || telemetry.length === 0) {
      return { speed: 0, throttle: 0, brake: 0, gear: 1 };
    }
    if (dist <= telemetry[0].distanceM) return telemetry[0];
    if (dist >= telemetry[telemetry.length - 1].distanceM) return telemetry[telemetry.length - 1];

    let low = 0;
    let high = telemetry.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (telemetry[mid].distanceM <= dist) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const p1 = telemetry[Math.max(0, high)];
    const p2 = telemetry[Math.min(telemetry.length - 1, low)];
    if (!p1 || !p2 || p1 === p2 || p2.distanceM === p1.distanceM) {
      return p1 || telemetry[0];
    }
    const ratio = Math.max(0, Math.min(1, (dist - p1.distanceM) / (p2.distanceM - p1.distanceM)));

    const spd = Math.round(p1.speed + (p2.speed - p1.speed) * ratio);
    const thr = Math.round(p1.throttle + (p2.throttle - p1.throttle) * ratio);
    const brkVal1 = p1.brake === true ? 100 : (p1.brake === false ? 0 : Number(p1.brake || 0));
    const brkVal2 = p2.brake === true ? 100 : (p2.brake === false ? 0 : Number(p2.brake || 0));
    const brk = Math.round(brkVal1 + (brkVal2 - brkVal1) * ratio);

    const g1 = Number(p1.gear || 0);
    const g2 = Number(p2.gear || 0);
    const g = g1 > 0 && g2 > 0 ? Math.round(g1 + (g2 - g1) * ratio) : (g1 > 0 ? g1 : (g2 > 0 ? g2 : 0));

    return { speed: spd, throttle: thr, brake: brk, gear: g };
  }, []);

  // Continuous animation loop
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    const animate = (time) => {
      if (lastTimeRef.current !== null) {
        const deltaMs = time - lastTimeRef.current;
        const metersPerSec = (totalDistance / 22) * speedMultiplier;
        const distInc = (metersPerSec * deltaMs) / 1000;

        setProgressDist((prev) => {
          const next = prev + distInc;
          return next >= totalDistance ? 0 : next;
        });
      }
      lastTimeRef.current = time;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speedMultiplier, totalDistance]);

  const currA = useMemo(() => getInterpolatedPoint(dataA, progressDist), [dataA, progressDist, getInterpolatedPoint]);
  const currB = useMemo(() => getInterpolatedPoint(dataB, progressDist), [dataB, progressDist, getInterpolatedPoint]);

  const speedDelta = currA.speed - currB.speed;
  const isALeading = speedDelta >= 0;

  // Active sector tracking based on circuit ratios
  const currentSector = useMemo(() => {
    const s1Ratio = circuit.sectors[0]?.ratio || 0.33;
    const s2Ratio = circuit.sectors[1]?.ratio || 0.67;
    const currentRatio = progressDist / totalDistance;

    if (currentRatio < s1Ratio) {
      return { id: "SECTOR 1", color: "#B138DD", name: circuit.sectors[0]?.name || "Sector 1" };
    }
    if (currentRatio < s2Ratio) {
      return { id: "SECTOR 2", color: "#00D26A", name: circuit.sectors[1]?.name || "Sector 2" };
    }
    return { id: "SECTOR 3", color: "#FFD600", name: circuit.sectors[2]?.name || "Sector 3" };
  }, [progressDist, totalDistance, circuit]);

  // Calculate 2D coordinates on the SVG circuit outline
  const carPosA = useMemo(() => {
    if (!trackPathRef.current || pathLength <= 0) return { x: 200, y: 150 };
    const ratio = Math.max(0, Math.min(1, progressDist / totalDistance));
    try {
      const pt = trackPathRef.current.getPointAtLength(ratio * pathLength);
      return { x: pt.x, y: pt.y };
    } catch {
      return { x: 200, y: 150 };
    }
  }, [progressDist, totalDistance, pathLength]);

  const carPosB = useMemo(() => {
    if (!trackPathRef.current || pathLength <= 0) return { x: 200, y: 150 };
    // Position offset in meters based on speed delta
    const offsetM = isALeading ? -30 : 30;
    const ratio = Math.max(0, Math.min(1, (progressDist + offsetM) / totalDistance));
    try {
      const pt = trackPathRef.current.getPointAtLength(ratio * pathLength);
      return { x: pt.x, y: pt.y };
    } catch {
      return { x: 200, y: 150 };
    }
  }, [progressDist, totalDistance, pathLength, isALeading]);

  // Sector path dash arrays
  const s1Len = pathLength * (circuit.sectors[0]?.ratio || 0.33);
  const s2Ratio = circuit.sectors[1]?.ratio || 0.67;
  const s1Ratio = circuit.sectors[0]?.ratio || 0.33;
  const s2Len = pathLength * (s2Ratio - s1Ratio);
  const s3Len = pathLength * (1 - s2Ratio);

  return (
    <div className={cn("bg-panel border border-fw-border rounded-card p-4 flex flex-col gap-4 select-none relative overflow-hidden", className)}>
      {/* Top Header & Track Badges */}
      <div className="flex justify-between items-center border-b border-fw-border pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-drs-cyan animate-pulse" />
          <span className="font-f1 text-sm font-bold text-text-primary tracking-wider uppercase">
            LIVE GHOST BATTLE // {circuit.name.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span
            className="px-2 py-0.5 rounded font-bold border tracking-wider"
            style={{
              backgroundColor: `${currentSector.color}20`,
              color: currentSector.color,
              borderColor: `${currentSector.color}50`,
            }}
          >
            {currentSector.id}
          </span>
          <span className="text-text-muted">
            LAP {lapNumber || "PB"}
          </span>
        </div>
      </div>

      {/* SVG Circuit Outline & Synced Ghost Battle Track Map */}
      <div className="relative w-full h-[220px] bg-canvas/95 rounded-card border border-fw-border flex flex-col items-center justify-center p-2 overflow-hidden">
        {/* Subtle Background Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.03)_0%,transparent_70%)] pointer-events-none" />

        <svg
          viewBox={circuit.viewBox}
          className="w-full h-full max-h-[200px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Glow Filter for Car A (Cyan) */}
            <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow Filter for Car B (Yellow) */}
            <filter id="glowYellow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Master hidden measurement path */}
          <path
            ref={trackPathRef}
            d={circuit.trackPath}
            fill="none"
            stroke="none"
          />

          {/* Base Asphalt Track Width */}
          <path
            d={circuit.trackPath}
            fill="none"
            stroke="#161922"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={circuit.trackPath}
            fill="none"
            stroke="#222735"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Sector 1 Segment (Purple) */}
          <path
            d={circuit.trackPath}
            fill="none"
            stroke="#B138DD"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${s1Len} ${pathLength}`}
            strokeDashoffset="0"
            className="opacity-90"
          />

          {/* Sector 2 Segment (Green) */}
          <path
            d={circuit.trackPath}
            fill="none"
            stroke="#00D26A"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${s2Len} ${pathLength}`}
            strokeDashoffset={`${-s1Len}`}
            className="opacity-90"
          />

          {/* Sector 3 Segment (Yellow) */}
          <path
            d={circuit.trackPath}
            fill="none"
            stroke="#FFD600"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${s3Len} ${pathLength}`}
            strokeDashoffset={`${-(s1Len + s2Len)}`}
            className="opacity-90"
          />

          {/* Start / Finish Gantry Line */}
          {circuit.startFinish && (
            <g transform={`translate(${circuit.startFinish.x}, ${circuit.startFinish.y})`}>
              <line x1="-2" y1="-8" x2="-2" y2="8" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="2,2" />
              <line x1="2" y1="-8" x2="2" y2="8" stroke="#FF1801" strokeWidth="2.5" />
            </g>
          )}

          {/* Ghost Driver B (Defender - Neon Yellow) */}
          <g transform={`translate(${carPosB.x}, ${carPosB.y})`}>
            <circle r="7" fill="#FFD600" opacity="0.3" filter="url(#glowYellow)" />
            <circle r="4" fill="#FFD600" stroke="#0B0D10" strokeWidth="1.5" />
            <rect x="-18" y="7" width="36" height="12" rx="3" fill="#12151B" stroke="#FFD600" strokeWidth="0.8" />
            <text x="0" y="16" fill="#FFD600" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {nameB.split(" ")[0].slice(0, 6)}
            </text>
          </g>

          {/* Ghost Driver A (Chaser - Neon Cyan) */}
          <g transform={`translate(${carPosA.x}, ${carPosA.y})`}>
            <circle r="8" fill="#00E5FF" opacity="0.4" filter="url(#glowCyan)" />
            <circle r="5" fill="#00E5FF" stroke="#0B0D10" strokeWidth="1.5" />
            <circle r="1.5" fill="#FFFFFF" />
            <rect x="-18" y="-19" width="36" height="12" rx="3" fill="#12151B" stroke="#00E5FF" strokeWidth="0.8" />
            <text x="0" y="-10" fill="#00E5FF" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {nameA.split(" ")[0].slice(0, 6)}
            </text>
          </g>
        </svg>

        {/* Bottom Track Meta & Sector Legend */}
        <div className="w-full flex justify-between items-center text-[10px] font-mono text-text-muted px-2 pt-1 border-t border-fw-border/60 z-10">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#B138DD]" /> S1
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00D26A]" /> S2
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FFD600]" /> S3
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>TRACK DIST: {Math.round(progressDist)}m / {totalDistance}m</span>
            <span className="text-text-primary font-bold">{Math.round((progressDist / totalDistance) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Real-Time Live HUD Telemetry Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Driver A Telemetry HUD (Cyan) */}
        <div className="border border-drs-cyan/30 bg-drs-cyan/5 rounded-card p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs font-bold text-drs-cyan flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-drs-cyan" />
              {nameA}
            </span>
            <span className="font-mono text-xs font-bold text-text-primary">
              {currA.speed} <span className="text-[10px] text-text-muted font-normal">km/h</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] text-text-muted">
            <div className="flex flex-col bg-panel/80 p-1.5 rounded border border-fw-border">
              <span className="text-[8px]">THROTTLE</span>
              <span className="text-text-primary font-bold">{currA.throttle}%</span>
            </div>
            <div className="flex flex-col bg-panel/80 p-1.5 rounded border border-fw-border">
              <span className="text-[8px]">BRAKE</span>
              <span className={cn("font-bold", currA.brake > 0 ? "text-f1-red" : "text-text-primary")}>
                {currA.brake > 0 ? `${currA.brake}%` : "OFF"}
              </span>
            </div>
            <div className="flex flex-col bg-panel/80 p-1.5 rounded border border-fw-border">
              <span className="text-[8px]">GEAR</span>
              <span className="text-drs-cyan font-bold">{currA.gear > 0 ? `G${currA.gear}` : "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Driver B Telemetry HUD (Yellow) */}
        <div className="border border-teammate-yellow/30 bg-teammate-yellow/5 rounded-card p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs font-bold text-teammate-yellow flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teammate-yellow" />
              {nameB}
            </span>
            <span className="font-mono text-xs font-bold text-text-primary">
              {currB.speed} <span className="text-[10px] text-text-muted font-normal">km/h</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] text-text-muted">
            <div className="flex flex-col bg-panel/80 p-1.5 rounded border border-fw-border">
              <span className="text-[8px]">THROTTLE</span>
              <span className="text-text-primary font-bold">{currB.throttle}%</span>
            </div>
            <div className="flex flex-col bg-panel/80 p-1.5 rounded border border-fw-border">
              <span className="text-[8px]">BRAKE</span>
              <span className={cn("font-bold", currB.brake > 0 ? "text-f1-red" : "text-text-primary")}>
                {currB.brake > 0 ? `${currB.brake}%` : "OFF"}
              </span>
            </div>
            <div className="flex flex-col bg-panel/80 p-1.5 rounded border border-fw-border">
              <span className="text-[8px]">GEAR</span>
              <span className="text-teammate-yellow font-bold">{currB.gear > 0 ? `G${currB.gear}` : "N/A"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delta Leader Badge & Controls */}
      <div className="flex justify-between items-center bg-elevated/40 border border-fw-border rounded-card p-2.5 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted">DELTA AT {Math.round(progressDist)}m:</span>
          <span
            className={cn(
              "font-bold px-2 py-0.5 rounded text-[11px]",
              isALeading ? "bg-drs-cyan/15 text-drs-cyan border border-drs-cyan/30" : "bg-teammate-yellow/15 text-teammate-yellow border border-teammate-yellow/30"
            )}
          >
            {isALeading ? `${nameA.split(" ")[0]} +${Math.abs(speedDelta)} km/h` : `${nameB.split(" ")[0]} +${Math.abs(speedDelta)} km/h`}
          </span>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2 py-0.5 rounded border border-fw-border hover:border-drs-cyan text-text-primary hover:text-drs-cyan transition-colors text-[10px]"
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </button>
          <button
            onClick={() => setSpeedMultiplier((prev) => (prev === 1 ? 2 : prev === 2 ? 0.5 : 1))}
            className="px-1.5 py-0.5 rounded border border-fw-border text-text-muted hover:text-text-primary text-[10px]"
          >
            {speedMultiplier}X
          </button>
          <button
            onClick={() => setProgressDist(0)}
            className="px-1.5 py-0.5 rounded border border-fw-border text-text-muted hover:text-text-primary text-[10px]"
          >
            RESTART
          </button>
        </div>
      </div>
    </div>
  );
}
