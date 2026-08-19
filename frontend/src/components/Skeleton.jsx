import { cn } from "@/lib/utils";
export function Skeleton({ className }) {
  return <div className={cn("skeleton", className)} />;
}
export function SkeletonText({ width = "100%" }) {
  return <div className="skeleton h-3.5 rounded-sm" style={{ width }} />;
}
export function SkeletonParagraph() {
  return <div className="flex flex-col gap-2"><SkeletonText width="100%" /><SkeletonText width="92%" /><SkeletonText width="78%" /></div>;
}
export function SkeletonCard({ height = 120 }) {
  return <div
    className="skeleton border border-fw-border rounded-card"
    style={{ height }}
  />;
}
export function SkeletonPills({ count = 3 }) {
  return <div className="flex gap-2">{Array.from({ length: count }).map((_, i) => <div
    key={i}
    className="skeleton h-6 rounded-card"
    style={{ width: `${60 + i * 20}px` }}
  />)}</div>;
}
export function SkeletonMonoData() {
  return <span className="font-mono text-mono-meta text-text-muted animate-cursor-pulse">
      ░░ ░░░ ░░
    </span>;
}
