import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * F1Broadcast Dropdown Component
 * Fully custom styled dark F1 broadcast theme dropdown:
 * - Semantic surface layers (--surface-raised / --surface-overlay)
 * - F1 Speed Red (--accent-primary) focus beacons and active selection states
 * - High-contrast crisp typography
 */
export default function F1Dropdown({
  id,
  value,
  onChange,
  options = [],
  disabled = false,
  placeholder = "Select...",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded bg-surface-raised border transition-all duration-fast text-left font-mono text-xs ${
          isOpen
            ? "border-accent-primary shadow-[0_0_12px_rgba(225,6,0,0.2)]"
            : "border-border-subtle hover:border-border-medium"
        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="truncate text-text-primary font-medium">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform duration-fast shrink-0 ${
            isOpen ? "rotate-180 text-text-primary" : ""
          }`}
        />
      </button>

      {/* Popover Options List */}
      {isOpen && !disabled && (
        <div
          id={`${id}-popover`}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface-overlay border border-border-medium rounded shadow-xl max-h-64 overflow-y-auto divide-y divide-border-subtle/40 animate-fadeIn"
        >
          {options.length === 0 ? (
            <div className="px-3 py-3 text-xs font-mono text-text-muted text-center">
              No options available
            </div>
          ) : (
            options.map((option) => {
              const isSelected = String(option.value) === String(value);
              return (
                <div
                  key={option.value}
                  id={`${id}-option-${String(option.value).toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 text-xs font-mono cursor-pointer transition-colors duration-fast ${
                    isSelected
                      ? "bg-accent-primary/15 text-text-primary font-bold border-l-2 border-accent-primary"
                      : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                  }`}
                >
                  <div className="flex flex-col gap-0.5 truncate pr-2">
                    <span className="truncate">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-[10px] text-text-muted font-sans">
                        {option.sublabel}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 shrink-0 text-accent-primary" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

