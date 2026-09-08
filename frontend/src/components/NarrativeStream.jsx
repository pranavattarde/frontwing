import { useEffect, useState } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";

export function NarrativeStream({ content, isStreaming = false }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(content || "");
      return;
    }
    setDisplayedText("");
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < (content || "").length) {
        setDisplayedText((prev) => prev + content.charAt(idx));
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 10);
    return () => clearInterval(interval);
  }, [content, isStreaming]);

  return (
    <div className="relative">
      <MarkdownContent content={displayedText} />
      {isStreaming && (
        <span
          className="inline-block text-drs-cyan font-mono font-bold animate-cursor-pulse ml-0.5"
          aria-hidden="true"
        >
          ▋
        </span>
      )}
    </div>
  );
}
