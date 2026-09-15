import React from "react";

/**
 * FrontWingLogo — Official Original FrontWing Brand Identity
 * 
 * Design Brief:
 * - Bold, heavily condensed, forward-italic letterforms conveying aerodynamic velocity.
 * - Connected 'FW' mark: the F and W merge into a continuous racing-wing silhouette.
 * - Uses --accent-primary Speed Red (#E10600) on dark carbon surfaces.
 * - Accepts `variant` ("mark" | "full") and `size` ("sm" | "md" | "lg" | "xl" | number).
 * - 100% original geometry: Zero trademarked F1 swoosh cuts, negative space '1's, or team emblems.
 */
export function FrontWingLogo({
  variant = "full",
  size = "md",
  className = "",
  animated = false,
  ...props
}) {
  // Preset size mapping
  const heights = {
    sm: 20,
    md: 28,
    lg: 40,
    xl: 56,
  };

  const h = typeof size === "number" ? size : heights[size] || 28;
  // Aspect ratio: Mark is 76:56 (1.357), Full wordmark is 280:56 (5.0)
  const isMark = variant === "mark" || variant === "compact";
  const viewBox = isMark ? "0 0 76 56" : "0 0 280 56";
  const w = isMark ? Math.round((h * 76) / 56) : Math.round((h * 280) / 56);

  return (
    <svg
      width={w}
      height={h}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="FrontWing Formula 1 Intelligence"
      role="img"
      {...props}
    >
      <defs>
        {/* Speed Red High-Velocity Gradient */}
        <linearGradient id="fw-red-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF2A14" />
          <stop offset="60%" stopColor="#E10600" />
          <stop offset="100%" stopColor="#B50500" />
        </linearGradient>

        {/* Subtle Aero Carbon Highlight */}
        <linearGradient id="fw-aero-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#9499A5" stopOpacity="0.80" />
        </linearGradient>

        {/* Dynamic Aerodynamic Shadow */}
        <filter id="fw-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#E10600" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* ====================================================================
          CONNECTED "FW" AERO MARK
          Forward slant of 13° (skewX(-13)).
          F upper wing plane + F mid plane bridging seamlessly into W dual-cascades.
          ==================================================================== */}
      <g transform="translate(8, 2) skewX(-13)" filter={animated ? "url(#fw-glow)" : undefined}>
        {/* Primary Connected Silhouette — Red High-Velocity Element */}
        <path
          d="
            M 4 4 
            L 28 4 
            L 26 12 
            L 14 12 
            L 12 21 
            L 24 21 
            L 22 28 
            L 10 28 
            L 5 48 
            L 13 48 
            L 19 28 
            L 26 48 
            L 34 48 
            L 40 28 
            L 47 48 
            L 55 48 
            L 64 12 
            L 55 12 
            L 49 34 
            L 43 15 
            L 35 15 
            L 30 34 
            L 25 15 
            L 23 4 
            Z
          "
          fill="url(#fw-red-grad)"
        />

        {/* Upper Aero Wing Blade (Top Cap of F extending forward) */}
        <path
          d="M 6 4 L 32 4 L 30 10 L 4 10 Z"
          fill="url(#fw-red-grad)"
        />

        {/* Aerodynamic Leading-Edge Carbon Endplate Accent */}
        <polygon
          points="2,4 6,4 4,12 0,12"
          fill="url(#fw-aero-grad)"
          opacity="0.9"
        />

        {/* Right Trailing Wingtip Fin (Top right tip of W) */}
        <polygon
          points="62,6 67,6 64,13 59,13"
          fill="url(#fw-aero-grad)"
          opacity="0.9"
        />
      </g>

      {/* ====================================================================
          WORDMARK & SUBTITLE (Rendered only for 'full' variant)
          ==================================================================== */}
      {!isMark && (
        <g transform="translate(82, 0)">
          {/* Main "FRONTWING" Wordmark */}
          <text
            x="0"
            y="34"
            fill="var(--text-primary, #FFFFFF)"
            style={{
              fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
              fontSize: "30px",
              fontWeight: "900",
              fontStyle: "italic",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            FRONT<tspan fill="url(#fw-red-grad)">WING</tspan>
          </text>

          {/* Subtitle / Broadcast Descriptor */}
          <text
            x="2"
            y="48"
            fill="var(--text-muted, #606675)"
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: "7.5px",
              fontWeight: "600",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            F1 // STRATEGY &amp; TELEMETRY
          </text>
        </g>
      )}
    </svg>
  );
}

export default FrontWingLogo;
