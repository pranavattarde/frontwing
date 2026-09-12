import React from "react";

/**
 * Geometric Team Badges
 * Original stylized abstract geometric insignias and monograms.
 * STRICTLY NO copyrighted sponsor liveries or official trademarked logos.
 * Uses team colors as factual data.
 */

const TEAM_METADATA = {
  ferrari: {
    shape: "shield",
    monogram: "SF",
    primary: "#ED1131",
    secondary: "#FFE800",
    name: "Scuderia Ferrari"
  },
  mercedes: {
    shape: "octagon",
    monogram: "MB",
    primary: "#00D7B6",
    secondary: "#C0C0C0",
    name: "Mercedes-AMG"
  },
  "red bull": {
    shape: "diamond",
    monogram: "RBR",
    primary: "#3671C6",
    secondary: "#FF1801",
    name: "Red Bull Racing"
  },
  "red bull racing": {
    shape: "diamond",
    monogram: "RBR",
    primary: "#3671C6",
    secondary: "#FF1801",
    name: "Red Bull Racing"
  },
  mclaren: {
    shape: "crescent",
    monogram: "MCL",
    primary: "#FF8000",
    secondary: "#47C7FC",
    name: "McLaren"
  },
  "aston martin": {
    shape: "wings",
    monogram: "AMR",
    primary: "#229971",
    secondary: "#CEDC00",
    name: "Aston Martin"
  },
  alpine: {
    shape: "delta",
    monogram: "ALP",
    primary: "#0093CC",
    secondary: "#FF69B4",
    name: "Alpine"
  },
  williams: {
    shape: "chevron",
    monogram: "WIL",
    primary: "#1868DB",
    secondary: "#64C4FF",
    name: "Williams"
  },
  rb: {
    shape: "rhombus",
    monogram: "RB",
    primary: "#6692FF",
    secondary: "#FFFFFF",
    name: "Racing Bulls"
  },
  "racing bulls": {
    shape: "rhombus",
    monogram: "RB",
    primary: "#6692FF",
    secondary: "#FFFFFF",
    name: "Racing Bulls"
  },
  haas: {
    shape: "square",
    monogram: "HAS",
    primary: "#9C9FA2",
    secondary: "#E6002B",
    name: "Haas F1 Team"
  },
  "haas f1 team": {
    shape: "square",
    monogram: "HAS",
    primary: "#9C9FA2",
    secondary: "#E6002B",
    name: "Haas F1 Team"
  },
  sauber: {
    shape: "hexagon",
    monogram: "SAU",
    primary: "#52E252",
    secondary: "#181C24",
    name: "Kick Sauber"
  },
  "kick sauber": {
    shape: "hexagon",
    monogram: "SAU",
    primary: "#52E252",
    secondary: "#181C24",
    name: "Kick Sauber"
  },
  audi: {
    shape: "rings",
    monogram: "AUD",
    primary: "#F50537",
    secondary: "#D0D4DC",
    name: "Audi F1 Team"
  },
  cadillac: {
    shape: "crest",
    monogram: "CAD",
    primary: "#909090",
    secondary: "#CC9900",
    name: "Cadillac F1 Team"
  }
};

export function getTeamMetadata(teamName = "", teamColor = "#00E5FF") {
  const lower = (teamName || "").toLowerCase().trim();
  for (const [k, v] of Object.entries(TEAM_METADATA)) {
    if (lower.includes(k)) {
      return {
        ...v,
        primary: teamColor || v.primary
      };
    }
  }

  // Fallback generic monogram from first letters
  const words = (teamName || "F1").trim().split(/\s+/);
  const monogram = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : teamName.slice(0, 3).toUpperCase();
  return {
    shape: "hexagon",
    monogram: monogram || "F1",
    primary: teamColor || "#00E5FF",
    secondary: "#FFFFFF",
    name: teamName || "Formula 1 Team"
  };
}

export default function TeamBadge({ teamName, teamColor, size = 32, className = "" }) {
  const meta = getTeamMetadata(teamName, teamColor);
  const p = meta.primary;
  const s = meta.secondary;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      title={`${meta.name} Badge`}
    >
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        <defs>
          <linearGradient id={`grad-${meta.monogram}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={p} />
            <stop offset="100%" stopColor={s} />
          </linearGradient>
          <filter id={`glow-${meta.monogram}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor={p} floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Dynamic Abstract Geometry Background */}
        {meta.shape === "shield" && (
          <path
            d="M20 3 L35 8 V22 C35 30 20 37 20 37 C20 37 5 30 5 22 V8 Z"
            fill="#12151B"
            stroke={`url(#grad-${meta.monogram})`}
            strokeWidth="2"
          />
        )}

        {meta.shape === "diamond" && (
          <path
            d="M20 3 L37 20 L20 37 L3 20 Z"
            fill="#12151B"
            stroke={`url(#grad-${meta.monogram})`}
            strokeWidth="2"
          />
        )}

        {meta.shape === "crescent" && (
          <path
            d="M20 3 C30 3 37 10 37 20 C37 29 30 37 20 37 C15 37 10 34 7 30 C15 32 25 28 27 18 C28 11 25 5 20 3 Z"
            fill="#12151B"
            stroke={`url(#grad-${meta.monogram})`}
            strokeWidth="2"
          />
        )}

        {meta.shape === "wings" && (
          <path
            d="M3 14 L20 6 L37 14 L33 26 L20 34 L7 26 Z"
            fill="#12151B"
            stroke={`url(#grad-${meta.monogram})`}
            strokeWidth="2"
          />
        )}

        {meta.shape === "delta" && (
          <path
            d="M20 4 L37 34 L20 28 L3 34 Z"
            fill="#12151B"
            stroke={`url(#grad-${meta.monogram})`}
            strokeWidth="2"
          />
        )}

        {meta.shape === "chevron" && (
          <path
            d="M6 10 L20 4 L34 10 V26 L20 36 L6 26 Z"
            fill="#12151B"
            stroke={`url(#grad-${meta.monogram})`}
            strokeWidth="2"
          />
        )}

        {meta.shape === "rhombus" && (
          <path
            d="M12 4 L36 8 L28 36 L4 32 Z"
            fill="#12151B"
            stroke={`url(#grad-${meta.monogram})`}
            strokeWidth="2"
          />
        )}

        {meta.shape === "square" && (
          <rect
            x="5"
            y="5"
            width="30"
            height="30"
            rx="4"
            fill="#12151B"
            stroke={`url(#grad-${meta.monogram})`}
            strokeWidth="2"
          />
        )}

        {meta.shape === "octagon" && (
          <path
            d="M12 4 L28 4 L36 12 L36 28 L28 36 L12 36 L4 28 L4 12 Z"
            fill="#12151B"
            stroke={`url(#grad-${meta.monogram})`}
            strokeWidth="2"
          />
        )}

        {meta.shape === "rings" && (
          <g>
            <rect
              x="4"
              y="6"
              width="32"
              height="28"
              rx="6"
              fill="#12151B"
              stroke={`url(#grad-${meta.monogram})`}
              strokeWidth="2"
            />
            <circle cx="15" cy="20" r="5" stroke={p} strokeWidth="1.5" />
            <circle cx="25" cy="20" r="5" stroke={s} strokeWidth="1.5" />
          </g>
        )}

        {meta.shape === "crest" && (
          <path
            d="M6 6 L34 6 L30 26 L20 36 L10 26 Z"
            fill="#12151B"
            stroke={`url(#grad-${meta.monogram})`}
            strokeWidth="2"
          />
        )}

        {meta.shape === "hexagon" && (
          <path
            d="M20 4 L35 12 V28 L20 36 L5 28 V12 Z"
            fill="#12151B"
            stroke={`url(#grad-${meta.monogram})`}
            strokeWidth="2"
          />
        )}

        {/* Inner Accent Line */}
        <line x1="12" y1="28" x2="28" y2="28" stroke={s} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

        {/* Monogram Text */}
        <text
          x="20"
          y="23"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="'Titillium Web', 'Outfit', sans-serif"
          fontWeight="900"
          fontSize={meta.monogram.length > 2 ? "10" : "11"}
          letterSpacing="0.5"
          filter={`url(#glow-${meta.monogram})`}
        >
          {meta.monogram}
        </text>
      </svg>
    </div>
  );
}
