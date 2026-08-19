import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
export function formatLapTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}
export function formatDelta(seconds) {
  const sign = seconds >= 0 ? "+" : "";
  return `${sign}${seconds.toFixed(3)}s`;
}
export function formatPosition(pos) {
  return `P${pos}`;
}
export function getTireColor(compound) {
  const colors = {
    soft: "#FF2B49",
    medium: "#FFD600",
    hard: "#E5E7EB",
    inter: "#1BC944",
    wet: "#0D6EFD"
  };
  return colors[compound] ?? "#5C6470";
}
export function getTireLabel(compound) {
  const labels = {
    soft: "S",
    medium: "M",
    hard: "H",
    inter: "I",
    wet: "W"
  };
  return labels[compound] ?? "?";
}
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
