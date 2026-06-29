import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format lap time: 78.240 → "1:18.240" */
export function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

/** Format delta: +1.400 → "+1.400s", -0.320 → "-0.320s" */
export function formatDelta(seconds: number): string {
  const sign = seconds >= 0 ? '+' : '';
  return `${sign}${seconds.toFixed(3)}s`;
}

/** Format position: 1 → "P1" */
export function formatPosition(pos: number): string {
  return `P${pos}`;
}

/** Get tire compound color from design_system.md §4 */
export function getTireColor(compound: string): string {
  const colors: Record<string, string> = {
    soft: '#FF2B49',
    medium: '#FFD600',
    hard: '#E5E7EB',
    inter: '#1BC944',
    wet: '#0D6EFD',
  };
  return colors[compound] ?? '#5C6470';
}

/** Get tire compound short label */
export function getTireLabel(compound: string): string {
  const labels: Record<string, string> = {
    soft: 'S',
    medium: 'M',
    hard: 'H',
    inter: 'I',
    wet: 'W',
  };
  return labels[compound] ?? '?';
}

/** Generate unique ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
