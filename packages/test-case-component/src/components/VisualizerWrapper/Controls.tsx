import React from "react";

interface ControlsProps {
  isPaused: boolean;
  onTogglePause: () => void;
  showHighlights: boolean;
  onToggleHighlights: () => void;
}

export function Controls({
  isPaused,
  onTogglePause,
  showHighlights,
  onToggleHighlights,
}: ControlsProps) {
  return (
    <div className="jumbotron-controls">
      <button
        className="jumbotron-control-button"
        onClick={onTogglePause}
        aria-label={isPaused ? "Play animation" : "Pause animation"}
      >
        <span className="jumbotron-control-icon">{isPaused ? "▶️" : "⏸️"}</span>
        <span className="jumbotron-control-label">
          {isPaused ? "Play" : "Pause"}
        </span>
      </button>
      <button
        className="jumbotron-control-button"
        onClick={onToggleHighlights}
        aria-label={showHighlights ? "Hide highlights" : "Show highlights"}
      >
        <span className="jumbotron-control-icon jumbotron-highlight-toggle-icon">
          🟨
          {!showHighlights && (
            <span className="jumbotron-highlight-toggle-overlay">🚫</span>
          )}
        </span>
        <span className="jumbotron-control-label">
          {showHighlights ? "Hide" : "Show"}
        </span>
      </button>
    </div>
  );
}
