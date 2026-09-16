import React from "react";

/**
 * DriverAvatar Component
 * Generic stylized vector driver silhouette (aerodynamic F1 helmet & racing suit contour).
 * Dynamically color-coded with the driver's team accent color.
 * STRICTLY NO copyrighted photographs or official personal likenesses.
 */
export default function DriverAvatar({ teamColor = "#E10600", size = 36, isSelected = false, className = "" }) {
  const accent = teamColor || "#E10600";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-200"
      >
        <defs>
          <linearGradient id={`driver-grad-${accent.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#12151B" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`visor-grad-${accent.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
          <filter id={`driver-glow-${accent.replace("#", "")}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor={accent} floodOpacity={isSelected ? "0.6" : "0.25"} />
          </filter>
        </defs>

        {/* Circular Asphalt Base with Team Color Glow Border */}
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="#12151B"
          stroke={isSelected ? accent : "rgba(255, 255, 255, 0.12)"}
          strokeWidth={isSelected ? "2" : "1.5"}
          filter={`url(#driver-glow-${accent.replace("#", "")})`}
        />

        {/* Racing Suit Shoulders / Collarbone Contour */}
        <path
          d="M12 56 C12 45 22 42 32 42 C42 42 52 45 52 56"
          fill="#181C24"
          stroke={accent}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Racing Suit Neck Opening & HANS Device outline */}
        <path
          d="M26 42 L24 48 M38 42 L40 48"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.2"
        />

        {/* Aerodynamic Helmet Shell */}
        <path
          d="M20 28 C20 18 24 12 32 12 C40 12 44 18 44 28 C44 36 39 39 32 39 C25 39 20 36 20 28 Z"
          fill={`url(#driver-grad-${accent.replace("#", "")})`}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1.5"
        />

        {/* Aerodynamic Visor Strip */}
        <path
          d="M22 26 C23 23 27 22 32 22 C37 22 41 23 42 26 C41 29 38 30 32 30 C26 30 23 29 22 26 Z"
          fill="#0B0D10"
          stroke={`url(#visor-grad-${accent.replace("#", "")})`}
          strokeWidth="1.4"
        />

        {/* Visor Glare / Reflection Accent */}
        <path
          d="M25 25 C27 24 29 24 31 24"
          stroke="#FFFFFF"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Helmet Top Air Intake Vent */}
        <path
          d="M30 14 H34"
          stroke={accent}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
