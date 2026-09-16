import React from "react";
import { Play, Pause, RotateCcw, FastForward } from "lucide-react";

export function GhostBattleControls({
  isPlaying,
  onTogglePlay,
  currentTime,
  maxTime,
  onSeek,
  playbackSpeed,
  onChangeSpeed,
  onReset
}) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs.toFixed(3)}`;
  };

  const speeds = [0.5, 1, 2, 4];

  return (
    <div className="flex flex-col gap-3 p-4 rounded border border-border-subtle bg-surface-base/95 backdrop-blur-md shadow-xl">
      {/* Scrubber and Timing Bar */}
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-accent-primary font-bold min-w-[70px] type-tabular">
          {formatTime(currentTime)}
        </span>

        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min="0"
            max={maxTime || 100}
            step="0.05"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-surface-raised rounded appearance-none cursor-pointer accent-accent-primary focus:outline-none"
          />
        </div>

        <span className="font-mono text-xs text-text-muted min-w-[70px] text-right type-tabular">
          {formatTime(maxTime)}
        </span>
      </div>

      {/* Playback Controls Row */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border-subtle text-xs font-mono">
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className="btn-f1-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="btn-f1-secondary flex items-center gap-1 px-3 py-1.5 text-xs"
            title="Reset to Lap Start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-1">
          <span className="text-text-muted text-[11px] mr-1 hidden sm:inline">Speed:</span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                playbackSpeed === s
                  ? "bg-accent-primary/20 border border-accent-primary text-accent-primary font-bold"
                  : "bg-surface-raised border border-border-subtle text-text-muted hover:text-text-primary"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

