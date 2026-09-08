import React, { useMemo } from "react";
import { InlineCallout } from "@/components/InlineCallout";
import { cn } from "@/lib/utils";

/**
 * MarkdownContent - F1 Broadcast Semantic Markdown & HTML Table Renderer
 *
 * Replaces literal markdown pipe characters (| col1 | col2 |) with responsive,
 * styled broadcast HTML tables, and formats headings, lists, bold accents, and badges.
 */
export function MarkdownContent({ content, className }) {
  const blocks = useMemo(() => {
    if (!content || typeof content !== "string") return [];

    const lines = content.split("\n");
    const parsed = [];
    let inTable = false;
    let tableRows = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        parsed.push({ type: "table", rows: tableRows });
        tableRows = [];
      }
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if line is a table row (starts and ends with | or contains multiple |)
      if (line.startsWith("|") && line.endsWith("|")) {
        // Check if it's a separator line like |---|---|---|
        const isSeparator = /^\|(\s*:?-+:?\s*\|)+$/.test(line);
        if (!isSeparator) {
          const cells = line
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());
          tableRows.push(cells);
        }
        inTable = true;
      } else {
        if (inTable) {
          flushTable();
        }
        if (line.length > 0) {
          if (line.startsWith("### ")) {
            parsed.push({ type: "h3", text: line.replace(/^###\s+/, "") });
          } else if (line.startsWith("## ")) {
            parsed.push({ type: "h2", text: line.replace(/^##\s+/, "") });
          } else if (line.startsWith("# ")) {
            parsed.push({ type: "h1", text: line.replace(/^#\s+/, "") });
          } else if (line.startsWith("- ") || line.startsWith("* ")) {
            parsed.push({ type: "list-item", text: line.replace(/^[-*]\s+/, "") });
          } else {
            parsed.push({ type: "paragraph", text: line });
          }
        }
      }
    }

    if (inTable) {
      flushTable();
    }

    return parsed;
  }, [content]);

  // Helper to format inline text (bold, callouts, winner badges)
  const renderFormattedText = (text) => {
    if (!text) return null;

    // First replace winner badges with styled spans
    // e.g. 🏆 NORRIS FASTER (-0.935s) or 🏆 VERSTAPPEN FASTER
    const parts = [];
    // Regex for inline callouts [text|type] or bold **text** or badges
    const regex = /(\*\*([^*]+)\*\*|\[([^\]]+)\]|(🏆\s*[^()\n]+(?:\([^)]+\))?))/g;
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.substring(lastIdx, match.index));
      }

      const [fullMatch, , boldText, rawCallout, badgeText] = match;

      if (boldText) {
        parts.push(
          <strong key={match.index} className="text-text-primary font-semibold">
            {boldText}
          </strong>
        );
      } else if (rawCallout) {
        const [cText, cType] = rawCallout.split("|");
        parts.push(
          <InlineCallout key={match.index} text={cText} type={cType || "neutral"} />
        );
      } else if (badgeText) {
        const isPurple = badgeText.includes("FASTER") && (badgeText.includes("-") || badgeText.includes("FASTEST"));
        parts.push(
          <span
            key={match.index}
            className={cn(
              "inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded border tracking-wide",
              isPurple
                ? "badge-sector-purple font-bold shadow-[0_0_8px_rgba(177,56,221,0.25)]"
                : "badge-sector-green font-bold shadow-[0_0_8px_rgba(0,210,106,0.2)]"
            )}
          >
            {badgeText}
          </span>
        );
      }

      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.substring(lastIdx));
    }

    return parts;
  };

  return (
    <div className={cn("flex flex-col gap-4 text-text-secondary text-sm leading-relaxed", className)}>
      {blocks.map((block, idx) => {
        if (block.type === "h1") {
          return (
            <h1 key={idx} className="font-f1 text-2xl font-bold text-text-primary tracking-wide border-b border-fw-border pb-2 mt-2">
              {block.text}
            </h1>
          );
        }
        if (block.type === "h2") {
          return (
            <h2 key={idx} className="font-f1 text-lg font-bold text-text-primary tracking-wide border-b border-fw-border pb-1 mt-2">
              {block.text}
            </h2>
          );
        }
        if (block.type === "h3") {
          return (
            <h3 key={idx} className="font-f1 text-sm uppercase tracking-widest text-drs-cyan font-semibold mt-2">
              {block.text}
            </h3>
          );
        }
        if (block.type === "list-item") {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-f1-red mt-2 shrink-0" />
              <span>{renderFormattedText(block.text)}</span>
            </div>
          );
        }
        if (block.type === "table") {
          const headers = block.rows[0] || [];
          const rows = block.rows.slice(1);

          return (
            <div key={idx} className="f1-table-container my-2 shadow-lg">
              <table className="f1-table">
                <thead>
                  <tr>
                    {headers.map((h, hIdx) => (
                      <th key={hIdx} className={cn(hIdx === 0 ? "text-left" : "text-left")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={cn(
                            cIdx === 0 ? "font-semibold text-text-primary" : "font-mono",
                            "py-2.5 px-3.5 border-b border-fw-border/60"
                          )}
                        >
                          {renderFormattedText(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={idx} className="text-text-secondary leading-relaxed">
            {renderFormattedText(block.text)}
          </p>
        );
      })}
    </div>
  );
}
