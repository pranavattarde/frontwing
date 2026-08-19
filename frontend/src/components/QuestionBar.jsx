import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
export function QuestionBar({
  placeholder = "Ask about any driver, lap, or strategy...",
  suggestedQuestions = [],
  disabled = false,
  contextLabel = null,
  variant = "inline",
  onSubmit,
  onSuggestionClick
}) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
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
        onSuggestionClick?.(suggestion);
        onSubmit?.(suggestion);
      }
    },
    [disabled, onSuggestionClick, onSubmit]
  );
  const isHero = variant === "hero";
  return <div className="w-full">{
    /* Suggestion Chips */
  }<AnimatePresence>{suggestedQuestions.length > 0 && isFocused && <motion.div
    className="flex flex-wrap gap-2 mb-3"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    aria-live="polite"
  >{suggestedQuestions.map((q, i) => <motion.button
    key={q}
    role="option"
    className="text-mono-meta font-mono text-text-muted px-3 py-1.5 rounded-card border border-fw-border bg-panel hover:bg-elevated hover:text-text-secondary hover:border-fw-border-active transition-all duration-[80ms]"
    onClick={() => handleSuggestionClick(q)}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.05, duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
  >{q}</motion.button>)}</motion.div>}</AnimatePresence>{
    /* Input Bar */
  }<div
    role="search"
    aria-label="Ask the AI Race Engineer"
    className={cn(
      "relative flex items-center border rounded-card bg-panel transition-all duration-[80ms]",
      isFocused && !disabled ? "border-[#5C6470] shadow-[0_0_0_1px_rgba(0,229,255,0.15)]" : "border-fw-border",
      disabled && "opacity-50 cursor-not-allowed",
      isHero ? "h-14 text-base px-5" : "h-11 text-sm px-4"
    )}
  >{
    /* Context Label */
  }{contextLabel && <span className="text-mono-meta font-mono text-text-muted mr-3 shrink-0 border-r border-fw-border pr-3">{contextLabel}</span>}<input
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
  />{
    /* Submit Button */
  }<button
    onClick={handleSubmit}
    disabled={disabled || !value.trim()}
    aria-label="Submit question"
    className={cn(
      "ml-2 p-1.5 rounded-button transition-all duration-[80ms]",
      value.trim() && !disabled ? "text-drs-cyan hover:bg-drs-cyan/10" : "text-text-muted"
    )}
  ><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg></button></div>{
    /* Character Count */
  }{value.length > 200 && <p className="text-mono-meta font-mono text-text-muted mt-1 text-right">{value.length}/500
        </p>}</div>;
}
