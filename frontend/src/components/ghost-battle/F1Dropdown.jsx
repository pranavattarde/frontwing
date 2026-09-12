import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * F1Broadcast Dropdown Component
 * Fully custom styled dark F1 theme dropdown adhering to design_tokens.css:
 * - Matte charcoal / carbon surface (#12151B / #181C24)
 * - F1 Racing Red (#FF1801) or DRS Cyan (#00E5FF) accent borders and highlights
 * - High-contrast crisp typography (#FFFFFF / #9BA4B5)
 * - Custom animated chevron and scrollable dark popover
 */
export default function F1Dropdown({
  id,
  value,
  onChange,
  options = [],
  disabled = false,
  placeholder = "Select...",
  accentColor = "red", // "red" | "cyan"
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

  const accentBorderClass =
    accentColor === "cyan"
      ? "focus:border-[#00E5FF] focus:shadow-[0_0_12px_rgba(0,229,255,0.25)]"
      : "focus:border-[#FF1801] focus:shadow-[0_0_12px_rgba(255,24,1,0.25)]";

  const activeBorderClass =
    isOpen
      ? accentColor === "cyan"
        ? "border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.2)]"
        : "border-[#FF1801] shadow-[0_0_12px_rgba(255,24,1,0.2)]"
      : "border-white/10 hover:border-white/20";

  return (
    <div ref={containerRef} className={`relative w-full select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm bg-[#12151B] border transition-all duration-150 text-left font-mono text-xs ${activeBorderClass} ${accentBorderClass} ${
          disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className="truncate text-white font-medium">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#9BA4B5] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {/* Popover Options List */}
      {isOpen && !disabled && (
        <div
          id={`${id}-popover`}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#181C24] border border-white/15 rounded-sm shadow-[0_12px_32px_rgba(0,0,0,0.85)] max-h-64 overflow-y-auto divide-y divide-white/5 animate-fadeIn"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#3E4553 #181C24"
          }}
        >
          {options.length === 0 ? (
            <div className="px-3 py-3 text-xs font-mono text-[#5E6676] text-center">
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
                  className={`flex items-center justify-between px-3 py-2.5 text-xs font-mono cursor-pointer transition-colors duration-100 ${
                    isSelected
                      ? accentColor === "cyan"
                        ? "bg-[#00E5FF]/15 text-white font-bold border-l-2 border-[#00E5FF]"
                        : "bg-[#FF1801]/15 text-white font-bold border-l-2 border-[#FF1801]"
                      : "text-[#D1D5DB] hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <div className="flex flex-col gap-0.5 truncate pr-2">
                    <span className="truncate">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-[10px] text-[#9BA4B5] font-sans">
                        {option.sublabel}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 ${
                        accentColor === "cyan" ? "text-[#00E5FF]" : "text-[#FF1801]"
                      }`}
                    />
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
