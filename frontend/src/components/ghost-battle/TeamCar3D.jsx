import React from "react";
import { getTeamMetadata } from "./TeamBadge";

// A static side profile keeps team selection lightweight. The selected laps
// are rendered in the single interactive 3D circuit viewport.
export default function TeamCar3D({
  teamName,
  primaryColor,
  secondaryColor,
  className = "",
}) {
  const meta = getTeamMetadata(teamName, primaryColor);
  const body = primaryColor || meta.primary;
  const detail = secondaryColor || meta.secondary;

  return (
    <div
      className={`w-full h-16 flex items-center justify-center select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 240 76" className="w-full h-full" fill="none">
        <path d="M26 51h28l14-9h33l14-16h31l22 17 39 5 13 8H25Z" fill={body} />
        <path d="m107 41 12-12h23l18 14Z" fill={detail} />
        <path
          d="M95 42h-9m15-3 9-15h16"
          stroke="var(--text-primary)"
          strokeWidth="3"
        />
        <path
          d="M24 53h11V26H23v30m175-2h28v7h-29"
          fill="var(--surface-base)"
        />
        <path d="M65 48h112l12 10H54Z" fill={detail} opacity=".65" />
        <circle
          cx="57"
          cy="55"
          r="17"
          fill="var(--surface-base)"
          stroke="var(--border-subtle)"
          strokeWidth="3"
        />
        <circle
          cx="189"
          cy="55"
          r="16"
          fill="var(--surface-base)"
          stroke="var(--border-subtle)"
          strokeWidth="3"
        />
        <circle
          cx="57"
          cy="55"
          r="7"
          stroke="var(--text-muted)"
          strokeWidth="2"
        />
        <circle
          cx="189"
          cy="55"
          r="6"
          stroke="var(--text-muted)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
