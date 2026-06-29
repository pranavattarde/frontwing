import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/** Shimmer skeleton block — design_system.md §9 */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />;
}

/** Skeleton text line */
export function SkeletonText({ width = '100%' }: { width?: string }) {
  return <div className="skeleton h-3.5 rounded-sm" style={{ width }} />;
}

/** Skeleton paragraph — 3 lines */
export function SkeletonParagraph() {
  return (
    <div className="flex flex-col gap-2">
      <SkeletonText width="100%" />
      <SkeletonText width="92%" />
      <SkeletonText width="78%" />
    </div>
  );
}

/** Skeleton card — evidence card placeholder */
export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div
      className="skeleton border border-fw-border rounded-card"
      style={{ height }}
    />
  );
}

/** Skeleton pill chips */
export function SkeletonPills({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-6 rounded-card"
          style={{ width: `${60 + i * 20}px` }}
        />
      ))}
    </div>
  );
}

/** Mono data skeleton — ░░ ░░░ ░░ */
export function SkeletonMonoData() {
  return (
    <span className="font-mono text-mono-meta text-text-muted animate-cursor-pulse">
      ░░ ░░░ ░░
    </span>
  );
}
