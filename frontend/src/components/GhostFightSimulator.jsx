import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

/**
 * GhostFightSimulator - Real-time Continuous Ghost Battle Loop
 *
 * Simulates a continuous head-to-head ghost fight between Driver A (Cyan) and Driver B (Yellow)
 * running along the lap distance in real-time, interpolating speeds, throttle, brake, gear, and delta.
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
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  const dataA = useMemo(() => (Array.isArray(driverA?.data) ? driverA.data : []), [driverA?.data]);
  const dataB = useMemo(() => (Array.isArray(driverB?.data) ? driverB.data : []), [driverB?.data]);

  const totalDistance = useMemo(() => {
    let maxD = 0;
    if (dataA.length > 0) maxD = Math.max(maxD, dataA[dataA.length - 1].distanceM || 0);
    if (dataB.length > 0) maxD = Math.max(maxD, dataB[dataB.length - 1].distanceM || 0);
    return maxD > 100 ? Math.ceil(maxD) : 5800;
  }, [dataA, dataB]);

  const nameA = driverA?.name || driverA?.code || "DRIVER A";
  const nameB = driverB?.name || driverB?.code || "DRIVER B";
  const colorA = driverA?.color || "#00E5FF";
  const colorB = driverB?.color || "#FFD600";

  // Interpolate telemetry metrics at any distance
  const getInterpolatedPoint = useCallback((telemetry, dist) => {
    if (!telemetry || telemetry.length === 0) {
      return { speed: 0, throttle: 0, brake: 0, gear: 1, rpm: 0 };
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
    
    let g = Math.round(p1.gear + (p2.gear - p1.gear) * ratio);
    if (!g || g <= 0) {
      if (spd < 65) g = 1;
      else if (spd < 100) g = 2;
      else if (spd < 140) g = 3;
      else if (spd < 185) g = 4;
      else if (spd < 230) g = 5;
      else if (spd < 275) g = 6;
      else if (spd < 315) g = 7;
      else g = 8;
    }

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
        // Complete lap loop in ~ 22 seconds for smooth visual representation
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

  // Sector identification
  const currentSector = useMemo(() => {
    const s1End = totalDistance / 3;
    const s2End = (2 * totalDistance) / 3;
    if (progressDist < s1End) return "SECTOR 1";
    if (progressDist < s2End) return "SECTOR 2";
    return "SECTOR 3";
  }, [progressDist, totalDistance]);

  // Progress percentage
  const progressPct = ((progressDist / totalDistance) * 100).toFixed(1);
  const speedDelta = currA.speed - currB.speed;
  const isALeading = speedDelta >= 0;

  // Track key corner annotations
  const corners = useMemo(() => [
    { name: "T1", dist: totalDistance * 0.08 },
    { name: "T3", dist: totalDistance * 0.22 },
    { name: "T6", dist: totalDistance * 0.42 },
    { name: "T9", dist: totalDistance * 0.62 },
    { name: "T13", dist: totalDistance * 0.82 },
    { name: "T16", dist: totalDistance * 0.94 }
  ], [totalDistance]);

  return (
    <div className={cn("bg-panel border border-fw-border rounded-card p-4 flex flex-col gap-4 select-none relative overflow-hidden", className)}>
      {/* Top Header & Track Badges */}
      <div className="flex justify-between items-center border-b border-fw-border pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-drs-cyan animate-pulse" />
          <span className="font-mono text-xs font-bold text-text-primary tracking-wider uppercase">
            LIVE_GHOST_FIGHT // BATTLE_LOOP
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded bg-elevated/60 text-drs-cyan border border-drs-cyan/30">
            {currentSector}
          </span>
          <span className="text-text-muted">
            LAP {lapNumber || "PB"}
          </span>
        </div>
      </div>

      {/* Track Corridor Simulation Canvas/SVG */}
      <div className="relative w-full h-[90px] bg-canvas/90 rounded-card border border-fw-border p-2 flex flex-col justify-between overflow-hidden">
        {/* Distance Grid & Sector Zones */}
        <div className="absolute inset-0 flex pointer-events-none opacity-20">
          <div className="flex-1 border-r border-drs-cyan/40 bg-drs-cyan/5" />
          <div className="flex-1 border-r border-teammate-yellow/40 bg-teammate-yellow/5" />
          <div className="flex-1 bg-purple-500/5" />
        </div>

        {/* Turn Markers */}
        <div className="relative w-full h-4 flex items-center z-10">
          {corners.map((c) => {
            const leftPct = (c.dist / totalDistance) * 100;
            return (
              <span
                key={c.name}
                className="absolute text-[8px] font-mono text-text-muted transform -translate-x-1/2"
                style={{ left: `${leftPct}%` }}
              >
                {c.name}
              </span>
            );
          })}
        </div>

        {/* Dynamic Track Lane & Ghost Cars */}
        <div className="relative w-full h-8 flex items-center z-20">
          {/* Main Track Line */}
          <div className="w-full h-1 bg-elevated rounded-full relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-drs-cyan/40 via-teammate-yellow/40 to-drs-cyan/40"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Ghost Car A Marker (Neon Cyan) */}
          <div
            className="absolute transform -translate-x-1/2 -translate-y-2.5 transition-all duration-75 flex flex-col items-center pointer-events-none"
            style={{ left: `${(progressDist / totalDistance) * 100}%` }}
          >
            <div
              className="w-3.5 h-3.5 rounded-full border-2 border-canvas shadow-lg flex items-center justify-center animate-pulse"
              style={{ backgroundColor: colorA, boxShadow: `0 0 10px ${colorA}` }}
            >
              <div className="w-1 h-1 rounded-full bg-canvas" />
            </div>
            <span
              className="text-[8px] font-mono font-bold mt-0.5 px-1 rounded"
              style={{ color: colorA, backgroundColor: "rgba(0, 229, 255, 0.15)" }}
            >
              {nameA.split(" ")[0]}
            </span>
          </div>

          {/* Ghost Car B Marker (Neon Yellow) */}
          <div
            className="absolute transform -translate-x-1/2 translate-y-2.5 transition-all duration-75 flex flex-col items-center pointer-events-none"
            style={{ left: `${Math.max(0, Math.min(100, ((progressDist - (speedDelta > 0 ? 30 : -30)) / totalDistance) * 100))}%` }}
          >
            <span
              className="text-[8px] font-mono font-bold mb-0.5 px-1 rounded"
              style={{ color: colorB, backgroundColor: "rgba(255, 214, 0, 0.15)" }}
            >
              {nameB.split(" ")[0]}
            </span>
            <div
              className="w-3.5 h-3.5 rounded-full border-2 border-canvas shadow-lg flex items-center justify-center"
              style={{ backgroundColor: colorB, boxShadow: `0 0 10px ${colorB}` }}
            >
              <div className="w-1 h-1 rounded-full bg-canvas" />
            </div>
          </div>
        </div>

        {/* Bottom Distance Scrubber Line */}
        <div className="flex justify-between items-center text-[9px] font-mono text-text-muted z-10">
          <span>0m</span>
          <span>{Math.round(totalDistance / 2)}m</span>
          <span>{totalDistance}m</span>
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
              <span className="text-drs-cyan font-bold">G{currA.gear}</span>
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
              <span className="text-teammate-yellow font-bold">G{currB.gear}</span>
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
