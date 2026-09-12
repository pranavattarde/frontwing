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
    <div className="flex flex-col gap-3 p-4 rounded-card border border-fw-border bg-panel/70 backdrop-blur-md shadow-lg">
      {/* Scrubber and Timing Bar */}
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-drs-cyan font-bold min-w-[70px]">
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
            className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-drs-cyan focus:outline-none"
          />
        </div>

        <span className="font-mono text-xs text-text-muted min-w-[70px] text-right">
          {formatTime(maxTime)}
        </span>
      </div>

      {/* Playback Controls Row */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-fw-border/40 text-xs font-mono">
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-drs-cyan text-canvas font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-sm"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-surface border border-fw-border text-text-muted hover:text-text-primary hover:border-fw-border-active transition-colors"
            title="Reset to Lap Start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-1">
          <span className="text-text-muted text-[11px] mr-1 hidden sm:inline">SPEED:</span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-2 py-1 rounded-sm text-[11px] font-mono transition-colors ${
                playbackSpeed === s
                  ? "bg-drs-cyan/15 border border-drs-cyan text-drs-cyan font-bold"
                  : "bg-surface/50 border border-fw-border/60 text-text-muted hover:text-text-primary"
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
