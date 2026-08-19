import { cn } from "@/lib/utils";
export function InlineCallout({ text, type = "neutral" }) {
  return <span
    className={cn(
      "inline-flex items-center mx-1 select-all font-mono text-xs px-1.5 py-0.5 rounded-sm border leading-none",
      type === "gain" && "bg-drs-cyan/10 text-drs-cyan border-drs-cyan/20 font-semibold",
      type === "loss" && "bg-f1-red/10 text-f1-red border-f1-red/20 font-semibold",
      type === "neutral" && "bg-teammate-yellow/10 text-teammate-yellow border-teammate-yellow/20"
    )}
  >{text}</span>;
}
