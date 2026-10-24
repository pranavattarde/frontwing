import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function QuestionBar({
  placeholder = "Ask about a driver, lap or strategy…",
  suggestedQuestions = [],
  disabled = false,
  contextLabel = null,
  variant = "inline",
  onSubmit,
  onSuggestionClick,
  prefillValue = "",
}) {
  const [value, setValue] = useState("");
  const input = useRef(null);
  useEffect(() => {
    if (prefillValue) {
      setValue(prefillValue);
      input.current?.focus();
    }
  }, [prefillValue]);
  useEffect(() => {
    const focus = () => {
      input.current?.focus();
      input.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
    };
    window.addEventListener("frontwing-focus-input", focus);
    return () => window.removeEventListener("frontwing-focus-input", focus);
  }, []);
  const submit = useCallback(
    (event) => {
      event.preventDefault();
      if (!value.trim() || disabled) return;
      onSubmit?.(value.trim());
      setValue("");
    },
    [value, disabled, onSubmit],
  );
  return (
    <div className="w-full">
      {!!suggestedQuestions.length && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              type="button"
              disabled={disabled}
              className="border border-border-medium p-3 text-xs text-left"
              onClick={() => {
                setValue(question);
                input.current?.focus();
                onSuggestionClick?.(question);
              }}
            >
              {question}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={submit}
        role="search"
        aria-label="Ask the race engineer"
        className={cn(
          "flex items-center border border-border-medium bg-surface-base px-4",
          variant === "hero" ? "h-16" : "h-12",
          disabled && "opacity-50",
        )}
      >
        {contextLabel && (
          <span className="font-mono text-[10px] text-accent-primary mr-3 pr-3 border-r border-border-medium shrink-0">
            {contextLabel}
          </span>
        )}
        <input
          ref={input}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setValue("");
              input.current?.blur();
            }
          }}
          placeholder={disabled ? "Analyzing the race…" : placeholder}
          aria-label="Your race question"
          disabled={disabled}
          maxLength={2000}
          className="flex-1 min-w-0 bg-transparent text-sm text-text-primary placeholder:text-text-muted py-3"
        />
        <button
          type="submit"
          aria-label="Submit question"
          disabled={disabled || !value.trim()}
          className="ml-3 p-2 text-accent-primary disabled:opacity-40"
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M5 19 19 5M5 5h14v14" />
          </svg>
        </button>
      </form>
      {value.length > 1800 && (
        <p className="font-mono text-[10px] text-text-muted mt-2 text-right tabular-nums">
          {value.length}/2000
        </p>
      )}
    </div>
  );
}
