export function FrontWingLogo({
  variant = "full",
  size = "md",
  className = "",
  animated: _animated,
  ...props
}) {
  const height =
    typeof size === "number"
      ? size
      : { sm: 20, md: 28, lg: 40, xl: 56 }[size] || 28;
  const mark = variant === "mark" || variant === "compact";
  return (
    <svg
      width={mark ? height * 1.4 : height * 5.4}
      height={height}
      viewBox={mark ? "0 0 58 42" : "0 0 228 42"}
      fill="none"
      className={className}
      role="img"
      aria-label="FrontWing"
      {...props}
    >
      <path
        d="M7 5H33L29 13H16L14 19H27L23 27H11L7 37H0L11 5ZM29 16L32 28L40 13H47L47 28L56 5H64L49 37H39L39 25L32 37H24L22 25Z"
        fill="var(--accent-primary)"
        transform="scale(.86 1)"
      />
      {!mark && (
        <text
          x="65"
          y="31"
          fill="currentColor"
          fontFamily="var(--font-display)"
          fontWeight="800"
          fontSize="35"
          letterSpacing="-.8"
        >
          FRONTWING<tspan fill="var(--accent-primary)">.</tspan>
        </text>
      )}
    </svg>
  );
}
export default FrontWingLogo;
