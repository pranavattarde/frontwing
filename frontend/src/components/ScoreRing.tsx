import { useEffect, useState, memo } from 'react';
import { cn } from '@/lib/utils';

interface ScoreRingProps {
  value: number;          // 0-100
  label: string;
  color?: string;         // ring fill color (defaults to DRS Cyan)
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const SIZE_MAP = {
  sm: { diameter: 32, stroke: 2.5, fontSize: 'text-[9px]', labelSize: 'text-[7px]' },
  md: { diameter: 48, stroke: 3, fontSize: 'text-mono-meta', labelSize: 'text-[8px]' },
  lg: { diameter: 64, stroke: 3.5, fontSize: 'text-mono-data', labelSize: 'text-mono-meta' },
};

/** component_library.md §15: ScoreRing */
export const ScoreRing = memo(function ScoreRing({
  value,
  label,
  color = '#00E5FF',
  size = 'md',
  onClick,
}: ScoreRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const config = SIZE_MAP[size];
  const radius = (config.diameter - config.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    // Animate from 0 to value
    const timer = setTimeout(() => setAnimatedValue(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <button
      onClick={onClick}
      className={cn('relative inline-flex flex-col items-center gap-0.5', onClick && 'cursor-pointer')}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} score: ${value.toFixed(1)}`}
      title={`${label}: ${value.toFixed(2)}`}
    >
      <svg
        width={config.diameter}
        height={config.diameter}
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-elevated"
        />
        {/* Value ring */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-[600ms] ease-fw"
        />
      </svg>
      {/* Value text overlay */}
      <span
        className={cn(
          'absolute font-mono font-medium tabular-nums',
          config.fontSize
        )}
        style={{
          color,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, calc(-50% - ${size === 'sm' ? '0px' : '4px'}))`,
        }}
      >
        {animatedValue.toFixed(0)}
      </span>
      {/* Label */}
      <span className={cn('font-mono text-text-muted', config.labelSize)}>
        {label}
      </span>
    </button>
  );
});
