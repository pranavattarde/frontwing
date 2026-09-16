import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTeamMetadata } from "./TeamBadge";

/**
 * TeamCarMesh3D
 * Low-poly generic Formula 1 car mesh rendered in that team's primary and secondary colors.
 * Original stylized geometric mesh with chassis, nose, front/rear wings, sidepods, halo, and wheels.
 */
function TeamCarMesh({ primaryColor, secondaryColor, isHovered }) {
  const groupRef = useRef();

  const primaryMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(primaryColor),
        roughness: 0.35,
        metalness: 0.55
      }),
    [primaryColor]
  );

  const secondaryMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(secondaryColor || "#FFFFFF"),
        roughness: 0.35,
        metalness: 0.6
      }),
    [secondaryColor]
  );

  const carbonMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#12151B"),
        roughness: 0.6,
        metalness: 0.3
      }),
    []
  );

  const tireMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0A0C0E"),
        roughness: 0.9,
        metalness: 0.1
      }),
    []
  );

  useFrame((_, delta) => {
    if (groupRef.current) {
      const targetRotY = isHovered ? 0.35 : 0;
      const targetRotX = isHovered ? -0.1 : 0;
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        targetRotY,
        8,
        delta
      );
      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        targetRotX,
        8,
        delta
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.2, 0]} rotation={[0.05, 0.4, 0]}>
      {/* 1. Main Chassis Tub */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.7, 0.28, 2.6]} />
        <primitive object={primaryMat} attach="material" />
      </mesh>

      {/* 2. Cockpit & Airbox / Engine Cover */}
      <mesh position={[0, 0.44, -0.2]}>
        <boxGeometry args={[0.42, 0.26, 1.0]} />
        <primitive object={secondaryMat} attach="material" />
      </mesh>

      {/* 3. Halo Safety Bar */}
      <mesh position={[0, 0.54, 0.05]}>
        <torusGeometry args={[0.24, 0.035, 6, 10, Math.PI]} rotation={[Math.PI / 3.2, 0, 0]} />
        <primitive object={carbonMat} attach="material" />
      </mesh>

      {/* 4. Aerodynamic Sidepods (Left & Right) */}
      <mesh position={[-0.48, 0.18, -0.15]}>
        <boxGeometry args={[0.26, 0.22, 1.1]} />
        <primitive object={primaryMat} attach="material" />
      </mesh>
      <mesh position={[0.48, 0.18, -0.15]}>
        <boxGeometry args={[0.26, 0.22, 1.1]} />
        <primitive object={primaryMat} attach="material" />
      </mesh>

      {/* Sidepod Color Inlay / Accent Stripe */}
      <mesh position={[-0.56, 0.22, -0.15]}>
        <boxGeometry args={[0.08, 0.06, 0.9]} />
        <primitive object={secondaryMat} attach="material" />
      </mesh>
      <mesh position={[0.56, 0.22, -0.15]}>
        <boxGeometry args={[0.08, 0.06, 0.9]} />
        <primitive object={secondaryMat} attach="material" />
      </mesh>

      {/* 5. Front Nose Cone */}
      <mesh position={[0, 0.16, 1.45]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.28, 0.8, 4]} />
        <primitive object={primaryMat} attach="material" />
      </mesh>

      {/* 6. Front Wing Mainplane & Endplates */}
      <group position={[0, 0.08, 1.8]}>
        {/* Mainplane */}
        <mesh>
          <boxGeometry args={[1.65, 0.06, 0.35]} />
          <primitive object={carbonMat} attach="material" />
        </mesh>
        {/* Upper Wing Flap in Secondary Color */}
        <mesh position={[0, 0.04, -0.04]}>
          <boxGeometry args={[1.5, 0.04, 0.15]} />
          <primitive object={secondaryMat} attach="material" />
        </mesh>
        {/* Left Endplate */}
        <mesh position={[-0.82, 0.08, 0]}>
          <boxGeometry args={[0.04, 0.22, 0.38]} />
          <primitive object={primaryMat} attach="material" />
        </mesh>
        {/* Right Endplate */}
        <mesh position={[0.82, 0.08, 0]}>
          <boxGeometry args={[0.04, 0.22, 0.38]} />
          <primitive object={primaryMat} attach="material" />
        </mesh>
      </group>

      {/* 7. Rear Wing Assembly */}
      <group position={[0, 0.65, -1.3]}>
        {/* Main Aerofoil */}
        <mesh>
          <boxGeometry args={[1.3, 0.08, 0.3]} />
          <primitive object={primaryMat} attach="material" />
        </mesh>
        {/* DRS Flap / Secondary Accent */}
        <mesh position={[0, 0.06, -0.04]}>
          <boxGeometry args={[1.2, 0.04, 0.12]} />
          <primitive object={secondaryMat} attach="material" />
        </mesh>
        {/* Endplates */}
        <mesh position={[-0.65, -0.12, 0]}>
          <boxGeometry args={[0.05, 0.35, 0.36]} />
          <primitive object={carbonMat} attach="material" />
        </mesh>
        <mesh position={[0.65, -0.12, 0]}>
          <boxGeometry args={[0.05, 0.35, 0.36]} />
          <primitive object={carbonMat} attach="material" />
        </mesh>
      </group>

      {/* 8. 4 Wheels (Low-poly Cylinders) */}
      {/* Front-Left */}
      <mesh position={[-0.72, 0.2, 1.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.24, 12]} />
        <primitive object={tireMat} attach="material" />
      </mesh>
      {/* Front-Right */}
      <mesh position={[0.72, 0.2, 1.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.24, 12]} />
        <primitive object={tireMat} attach="material" />
      </mesh>
      {/* Rear-Left */}
      <mesh position={[-0.78, 0.25, -1.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 0.32, 12]} />
        <primitive object={tireMat} attach="material" />
      </mesh>
      {/* Rear-Right */}
      <mesh position={[0.78, 0.25, -1.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 0.32, 12]} />
        <primitive object={tireMat} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * Fallback SVG silhouette in case WebGL context is unavailable
 */
function FallbackCarSilhouette({ primaryColor, secondaryColor }) {
  return (
    <svg viewBox="0 0 160 50" className="w-full h-full" fill="none">
      <path
        d="M20 38 L38 38 L45 32 L75 32 L85 24 L105 24 L125 32 L150 34 L152 38 L15 38 Z"
        fill={primaryColor}
        opacity="0.8"
      />
      <path d="M85 24 L105 24 L115 32 L80 32 Z" fill={secondaryColor || "#FFFFFF"} opacity="0.9" />
      <circle cx="38" cy="38" r="10" fill="#0A0C0E" stroke="#2C3240" strokeWidth="2" />
      <circle cx="130" cy="38" r="9" fill="#0A0C0E" stroke="#2C3240" strokeWidth="2" />
      <rect x="8" y="24" width="8" height="14" fill="#12151B" rx="1" />
      <rect x="145" y="32" width="12" height="4" fill="#12151B" rx="1" />
    </svg>
  );
}

/**
 * TeamCar3D
 * Card embeddable 3D low-poly car silhouette.
 * Uses frameloop="always" during hover for dynamic tilt, and frameloop="demand" when idle.
 */
export default function TeamCar3D({
  teamName,
  primaryColor = "#E10600",
  secondaryColor = null,
  className = ""
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasWebGlError, setHasWebGlError] = useState(false);

  const meta = getTeamMetadata(teamName, primaryColor);
  const pColor = primaryColor || meta.primary;
  const sColor = secondaryColor || meta.secondary;

  return (
    <div
      className={`relative w-full h-16 flex items-center justify-center overflow-hidden select-none pointer-events-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!hasWebGlError ? (
        <Canvas
          frameloop={isHovered ? "always" : "demand"}
          camera={{ position: [-3.8, 2.2, 3.6], fov: 42 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "low-power"
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
          onError={() => setHasWebGlError(true)}
          className="w-full h-full"
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 8, 5]} intensity={1.8} castShadow={false} />
          <directionalLight position={[-5, 3, -4]} intensity={0.8} color={sColor} />
          <pointLight position={[0, 4, 0]} intensity={0.6} />

          <TeamCarMesh
            primaryColor={pColor}
            secondaryColor={sColor}
            isHovered={isHovered}
          />
        </Canvas>
      ) : (
        <FallbackCarSilhouette primaryColor={pColor} secondaryColor={sColor} />
      )}
    </div>
  );
}
