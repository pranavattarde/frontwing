import React, { useState } from 'react';
import { Terminal, CornerDownLeft } from 'lucide-react';

interface ConsoleInputProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  suggestions?: string[];
}

const ConsoleInput: React.FC<ConsoleInputProps> = ({ placeholder, onSearch, suggestions }) => {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value.trim());
    }
  };

  const handleSuggestionClick = (sug: string) => {
    setValue(sug);
    onSearch(sug);
  };

  return (
    <div className="w-full flex flex-col gap-2.5">
      <form
        onSubmit={handleSubmit}
        className={`w-full relative flex items-center bg-[#0E1013] border border-[#1C2025] rounded transition-all duration-150 ${
          focused ? 'drs-glow' : ''
        }`}
      >
        {/* Prompt Indicator */}
        <div className="pl-3.5 pr-2.5 text-[#8B95A5] flex items-center justify-center select-none">
          <Terminal className="h-4 w-4 text-[#00E5FF]" />
        </div>

        {/* Input area */}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || "Search telemetry, ask strategy questions..."}
          className="w-full bg-transparent text-xs py-3.5 pr-12 text-[#F3F5F7] font-mono focus:outline-none placeholder:text-[#4E5E70]"
        />

        {/* Enter key shortcut button */}
        <button
          type="submit"
          className="absolute right-3.5 p-1 border border-[#1C2025] bg-[#16191E] rounded text-[#8B95A5] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-colors"
        >
          <CornerDownLeft className="h-3 w-3" />
        </button>
      </form>

      {/* Suggested Queries */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-[10px] font-mono text-[#4E5E70] uppercase select-none">Suggestions:</span>
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(sug)}
              className="px-2 py-1 bg-[#0E1013] border border-[#1C2025] rounded text-[10px] font-mono text-[#8B95A5] hover:text-[#F3F5F7] hover:border-[#8B95A5]/40 transition-all duration-100"
            >
              {sug}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConsoleInput;
