import { useEffect, useState, useMemo } from "react";
import { InlineCallout } from "@/components/InlineCallout";
export function NarrativeStream({ content, isStreaming = false }) {
  const [displayedText, setDisplayedText] = useState("");
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(content);
      return;
    }
    setDisplayedText("");
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < content.length) {
        setDisplayedText((prev) => prev + content.charAt(idx));
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 10);
    return () => clearInterval(interval);
  }, [content, isStreaming]);
  const parsedBlocks = useMemo(() => {
    const regex = /\[([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(displayedText)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          value: displayedText.substring(lastIndex, match.index)
        });
      }
      const rawCallout = match[1];
      const [calloutText, calloutType] = rawCallout.split("|");
      parts.push({
        type: "callout",
        value: calloutText,
        calloutType: calloutType || "neutral"
      });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < displayedText.length) {
      parts.push({
        type: "text",
        value: displayedText.substring(lastIndex)
      });
    }
    return parts;
  }, [displayedText]);
  return <div className="text-body text-text-secondary leading-relaxed whitespace-pre-wrap">{parsedBlocks.map((block, idx) => {
    if (block.type === "callout") {
      return <InlineCallout
        key={idx}
        text={block.value}
        type={block.calloutType}
      />;
    }
    return <span key={idx}>{block.value}</span>;
  })}{isStreaming && <span
    className="inline-block text-drs-cyan font-mono font-bold animate-cursor-pulse ml-0.5"
    aria-hidden="true"
  >
          ▋
        </span>}</div>;
}
