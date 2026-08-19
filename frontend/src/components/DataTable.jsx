import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
export function DataTable({ columns, rows, sortable = true, className }) {
  const [sortConfig, setSortConfig] = useState(null);
  const handleSort = (key) => {
    if (!sortable) return;
    let direction = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };
  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;
    const { key, direction } = sortConfig;
    const sorted = [...rows].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
      if (typeof valA === "number" && typeof valB === "number") {
        return valA - valB;
      }
      return String(valA).localeCompare(String(valB));
    });
    if (direction === "desc") sorted.reverse();
    return sorted;
  }, [rows, sortConfig]);
  return <div className={cn("w-full border border-fw-border rounded-card bg-panel overflow-hidden select-none", className)}><div className="overflow-x-auto"><table role="table" className="w-full text-left border-collapse font-mono text-xs">{
    /* Table Header */
  }<thead><tr className="border-b border-fw-border bg-elevated/20 text-text-muted">{columns.map((col) => {
    const alignRight = col.align === "right";
    const isSorted = sortConfig?.key === col.key;
    return <th
      key={col.key}
      onClick={() => handleSort(col.key)}
      className={cn(
        "px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider",
        alignRight ? "text-right" : "text-left",
        sortable && "cursor-pointer hover:text-text-secondary transition-colors"
      )}
      aria-sort={isSorted ? sortConfig.direction === "asc" ? "ascending" : "descending" : void 0}
    ><div className={cn("flex items-center gap-1.5", alignRight ? "justify-end" : "justify-start")}><span>{col.label}</span>{isSorted && <span className="text-drs-cyan text-[9px]">{sortConfig.direction === "asc" ? "\u25B2" : "\u25BC"}</span>}</div></th>;
  })}</tr></thead>{
    /* Table Body */
  }<tbody className="divide-y divide-fw-border/60">{sortedRows.map((row, rIdx) => <tr key={rIdx} className="hover:bg-elevated/10 transition-colors">{columns.map((col) => {
    const alignRight = col.align === "right";
    const val = row[col.key];
    return <td
      key={col.key}
      className={cn(
        "px-4 py-2 text-text-secondary font-data",
        alignRight ? "text-right" : "text-left"
      )}
    >{col.type === "delta" ? <span className={val >= 0 ? "text-f1-red" : "text-tire-inter"}>{val > 0 ? `+${val.toFixed(3)}` : val.toFixed(3)}</span> : col.type === "number" && typeof val === "number" ? val.toFixed(0) : val}</td>;
  })}</tr>)}</tbody></table></div></div>;
}
