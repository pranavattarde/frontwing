import { cn } from "@/lib/utils";
export function InlineCallout({ text, type = "neutral" }) {
  return <span
    className={cn(
      "inline-flex items-center mx-1 select-all font-mono text-xs px-1.5 py-0.5 rounded-badge border leading-none type-tabular",
      type === "gain" && "bg-timing-green/10 text-timing-green border-timing-green/30 font-semibold",
      type === "loss" && "bg-accent-danger/10 text-accent-danger border-accent-danger/30 font-semibold",
      type === "neutral" && "bg-timing-yellow/10 text-timing-yellow border-timing-yellow/30"
    )}
  >{text}</span>;
}
