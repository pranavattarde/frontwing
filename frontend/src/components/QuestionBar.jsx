import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function QuestionBar({
  placeholder = "Ask about any driver, lap, or strategy...",
  suggestedQuestions = [],
  disabled = false,
  contextLabel = null,
  variant = "inline",
  onSubmit,
  onSuggestionClick,
  prefillValue = ""
}) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (prefillValue) {
      setValue(prefillValue);
      inputRef.current?.focus();
    }
  }, [prefillValue]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSubmit?.(trimmed);
      setValue("");
    }
  }, [value, disabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") {
        setValue("");
        inputRef.current?.blur();
      }
    },
    [handleSubmit]
  );

  const handleSuggestionClick = useCallback(
    (suggestion) => {
      if (!disabled) {
        setValue(suggestion);
        inputRef.current?.focus();
        onSuggestionClick?.(suggestion);
      }
    },
    [disabled, onSuggestionClick]
  );

  const isHero = variant === "hero";

  return (
    <div className="w-full">
      {/* Suggestion Chips */}
      <AnimatePresence>
        {suggestedQuestions.length > 0 && isFocused && (
          <motion.div
            className="flex flex-wrap gap-2 mb-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            aria-live="polite"
          >
            {suggestedQuestions.map((q, i) => (
              <motion.button
                key={q}
                role="option"
                className="font-mono text-xs text-text-muted hover:text-text-primary px-3 py-1.5 rounded border border-border-subtle bg-surface-raised hover:bg-surface-elevated hover:border-border-strong transition-all duration-fast"
                onClick={() => handleSuggestionClick(q)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                {q}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div
        role="search"
        aria-label="Ask the AI Race Engineer"
        className={cn(
          "relative flex items-center border rounded bg-surface-base transition-all duration-fast",
          isFocused && !disabled ? "border-border-focus ring-1 ring-border-focus" : "border-border-subtle",
          disabled && "opacity-50 cursor-not-allowed",
          isHero ? "h-14 text-base px-5" : "h-11 text-sm px-4"
        )}
      >
        {/* Context Label */}
        {contextLabel && (
          <span className="font-mono text-xs text-accent-primary font-bold mr-3 shrink-0 border-r border-border-subtle pr-3 uppercase tracking-wider">
            {contextLabel}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Generating response..." : placeholder}
          disabled={disabled}
          aria-busy={disabled}
          className={cn(
            "flex-1 bg-transparent outline-none placeholder:text-text-muted text-text-primary font-sans",
            isHero ? "text-base" : "text-sm"
          )}
        />
        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Submit question"
          className={cn(
            "ml-2 p-1.5 rounded transition-all duration-fast",
            value.trim() && !disabled
              ? "text-accent-primary hover:bg-accent-primary/10 hover:text-accent-primary-hover"
              : "text-text-muted/40"
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>

      {/* Character Count */}
      {value.length > 200 && (
        <p className="font-mono text-[10px] text-text-muted mt-1 text-right tabular-nums">
          {value.length}/500
        </p>
      )}
    </div>
  );
}
