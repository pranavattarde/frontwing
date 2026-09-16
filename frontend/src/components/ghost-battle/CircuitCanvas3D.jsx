import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

/**
 * Low-poly stylized Formula 1 car mesh colored by team
 */
function F1CarMesh({ color = "#E10600", isFinished = false }) {
  const primaryColor = useMemo(() => new THREE.Color(color), [color]);
  const carbonColor = useMemo(() => new THREE.Color("#12151A"), []);
  const tireColor = useMemo(() => new THREE.Color("#0A0C0E"), []);

  return (
    <group scale={isFinished ? [0.85, 0.85, 0.85] : [1, 1, 1]}>
      {/* Main Chassis Body */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.9, 0.35, 3.2]} />
        <meshStandardMaterial color={primaryColor} roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Cockpit & Airbox */}
      <mesh position={[0, 0.52, -0.2]} castShadow>
        <boxGeometry args={[0.55, 0.35, 1.2]} />
        <meshStandardMaterial color={carbonColor} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Front Nose Cone */}
      <mesh position={[0, 0.18, 1.8]} castShadow>
        <coneGeometry args={[0.35, 1.0, 4]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color={primaryColor} roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Front Wing Mainplane */}
      <mesh position={[0, 0.1, 2.2]} castShadow>
        <boxGeometry args={[1.9, 0.08, 0.45]} />
        <meshStandardMaterial color={carbonColor} roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Rear Wing Assembly */}
      <group position={[0, 0.8, -1.6]}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 0.1, 0.4]} />
          <meshStandardMaterial color={primaryColor} roughness={0.3} metalness={0.6} />
        </mesh>
        {/* Endplates */}
        <mesh position={[-0.75, -0.15, 0]}>
          <boxGeometry args={[0.06, 0.4, 0.45]} />
          <meshStandardMaterial color={carbonColor} />
        </mesh>
        <mesh position={[0.75, -0.15, 0]}>
          <boxGeometry args={[0.06, 0.4, 0.45]} />
          <meshStandardMaterial color={carbonColor} />
        </mesh>
      </group>

      {/* Wheels: 4 low-poly cylinders */}
      {/* Front-Left */}
      <mesh position={[-0.85, 0.25, 1.3]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.32, 12]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>
      {/* Front-Right */}
      <mesh position={[0.85, 0.25, 1.3]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.32, 12]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>
      {/* Rear-Left */}
      <mesh position={[-0.9, 0.32, -1.3]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.42, 12]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>
      {/* Rear-Right */}
      <mesh position={[0.9, 0.32, -1.3]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.42, 12]} />
        <meshStandardMaterial color={tireColor} roughness={0.9} />
      </mesh>

      {/* Halo Safety Structure */}
      <mesh position={[0, 0.65, 0.1]}>
        <torusGeometry args={[0.32, 0.04, 6, 12, Math.PI]} rotation={[Math.PI / 3, 0, 0]} />
        <meshStandardMaterial color={carbonColor} />
      </mesh>
    </group>
  );
}

/**
 * Driver vehicle representation that interpolates along its telemetry array
 */
function SynchronizedGhostVehicle({ driver, currentTime }) {
  const groupRef = useRef();

  // Interpolate position and heading based on currentTime
  const currentTelemetry = useMemo(() => {
    const telem = driver.telemetry || [];
    if (telem.length === 0) return null;

    // If driver already finished, anchor at final position
    if (currentTime >= driver.lap_time_s) {
      const last = telem[telem.length - 1];
      const prev = telem[Math.max(0, telem.length - 2)];
      return {
        pt: last,
        heading: prev ? new THREE.Vector3(last.x - prev.x, last.y - prev.y, last.z - prev.z) : new THREE.Vector3(0, 0, 1),
        isFinished: true,
        speed: 0
      };
    }

    // Binary search for closest time interval
    let low = 0;
    let high = telem.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (telem[mid].t < currentTime) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idx1 = Math.max(0, Math.min(telem.length - 2, low - 1));
    const idx2 = idx1 + 1;
    const p1 = telem[idx1];
    const p2 = telem[idx2];

    const dt = Math.max(0.0001, p2.t - p1.t);
    const alpha = Math.max(0, Math.min(1, (currentTime - p1.t) / dt));

    const curX = p1.x + (p2.x - p1.x) * alpha;
    const curY = p1.y + (p2.y - p1.y) * alpha;
    const curZ = p1.z + (p2.z - p1.z) * alpha;

    const heading = new THREE.Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).normalize();
    const curSpeed = Math.round(p1.s + (p2.s - p1.s) * alpha);

    return {
      pt: { x: curX, y: curY, z: curZ },
      heading,
      isFinished: false,
      speed: curSpeed
    };
  }, [driver, currentTime]);

  useFrame(() => {
    if (!groupRef.current || !currentTelemetry) return;
    const { pt, heading } = currentTelemetry;

    groupRef.current.position.set(pt.x, pt.y, pt.z);

    // Compute rotation towards heading vector
    if (heading.lengthSq() > 0.0001) {
      const target = new THREE.Vector3(pt.x + heading.x, pt.y + heading.y, pt.z + heading.z);
      groupRef.current.lookAt(target);
    }
  });

  if (!currentTelemetry) return null;

  const { isFinished, speed } = currentTelemetry;

  return (
    <group ref={groupRef}>
      <F1CarMesh color={driver.team_color} isFinished={isFinished} />

      {/* 3D Billboard Tag above vehicle */}
      <Html position={[0, 2.0, 0]} center distanceFactor={28} className="pointer-events-none select-none">
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-bold shadow-md whitespace-nowrap transition-opacity ${
            isFinished
              ? "bg-surface-base/90 border-timing-green/40 text-timing-green opacity-80"
              : "bg-surface-base/90 border-border-subtle text-text-primary"
          }`}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: driver.team_color || "#E10600" }}
          />
          <span>{driver.code}</span>
          <span className="text-text-muted font-normal type-tabular">
            {isFinished ? "FINISH" : `${speed} km/h`}
          </span>
        </div>
      </Html>
    </group>
  );
}

/**
 * 3D Circuit Track Ribbon & Start/Finish Line
 */
function CircuitTrackRibbon({ centerline }) {
  const { curve, startFinishPoint } = useMemo(() => {
    if (!centerline || centerline.length < 3) return { curve: null, startFinishPoint: null };
    const vectors = centerline.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const closedCurve = new THREE.CatmullRomCurve3(vectors, true);
    return {
      curve: closedCurve,
      startFinishPoint: vectors[0]
    };
  }, [centerline]);

  if (!curve) return null;

  return (
    <group>
      {/* Main Track Ribbon / Tube */}
      <mesh receiveShadow>
        <tubeGeometry args={[curve, 500, 1.4, 8, true]} />
        <meshStandardMaterial color="#181C22" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Subtle Luminous Curbs / Edges */}
      <mesh>
        <tubeGeometry args={[curve, 500, 1.48, 4, true]} />
        <meshBasicMaterial color="#E10600" wireframe opacity={0.15} transparent />
      </mesh>

      {/* Start/Finish Line Marker & Arch */}
      {startFinishPoint && (
        <group position={[startFinishPoint.x, startFinishPoint.y, startFinishPoint.z]}>
          {/* Start/Finish Ground Checkered Strip */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4, 1.6]} />
            <meshBasicMaterial color="#FFFFFF" opacity={0.8} transparent />
          </mesh>

          {/* Glowing Start/Finish Marker Pillar */}
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 5, 8]} />
            <meshBasicMaterial color="#E10600" opacity={0.6} transparent />
          </mesh>

          <Html position={[0, 5.5, 0]} center distanceFactor={30}>
            <div className="px-2 py-0.5 rounded bg-accent-primary text-text-primary text-[9px] font-mono font-bold tracking-widest uppercase shadow-sm">
              START / FINISH
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

/**
 * Dedicated 3D Ghost Battle Viewport Canvas
 */
export function CircuitCanvas3D({ circuit, drivers = [], currentTime = 0 }) {
  const centerline = circuit?.centerline || [];

  return (
    <div className="w-full h-[480px] sm:h-[560px] lg:h-[620px] rounded-lg border border-[var(--border-subtle)] bg-[var(--canvas)] relative overflow-hidden shadow-2xl">
      {/* 3D Viewport Controls Hint */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none select-none">
        <span className="text-[10px] font-mono px-2 py-1 rounded bg-[var(--canvas)]/80 border border-[var(--border-subtle)] text-[var(--text-muted)] backdrop-blur-sm">
          ORBIT: LEFT-CLICK DRAG • PAN: RIGHT-CLICK DRAG • ZOOM: SCROLL
        </span>
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 160, 170], fov: 42, near: 0.5, far: 2000 }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight
          position={[80, 150, 100]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <hemisphereLight skyColor="#242B35" groundColor="#0B0D11" intensity={0.5} />

        {/* 3D Track Geometry */}
        <CircuitTrackRibbon centerline={centerline} />

        {/* Synchronized F1 Driver Cars */}
        {drivers.map((d) => (
          <SynchronizedGhostVehicle
            key={d.code}
            driver={d}
            currentTime={currentTime}
          />
        ))}

        {/* Subtle Horizon Ground Grid */}
        <gridHelper
          args={[350, 24, "#1E242C", "#13171D"]}
          position={[0, -2, 0]}
        />

        {/* Orbit Camera Controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={20}
          maxDistance={450}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>
    </div>
  );
}
