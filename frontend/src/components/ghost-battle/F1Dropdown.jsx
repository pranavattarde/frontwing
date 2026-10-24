/** Native selection keeps the full season/GP controls accessible by keyboard and touch. */
export default function F1Dropdown({
  id,
  value,
  onChange,
  options = [],
  disabled = false,
  placeholder = "Select…",
  className = "",
}) {
  return (
    <div className={`relative w-full ${className}`}>
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full appearance-none bg-surface-raised text-text-primary border border-border-medium px-4 pr-10 py-3 text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.sublabel ? ` / ${option.sublabel}` : ""}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path d="m1 1 4 4 4-4" />
      </svg>
    </div>
  );
}
