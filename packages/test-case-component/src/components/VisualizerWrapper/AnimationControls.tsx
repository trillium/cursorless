import React from "react";

interface AnimationControlsProps {
  isPaused: boolean;
  onTogglePause: () => void;
}

export function AnimationControls({
  isPaused,
  onTogglePause,
}: AnimationControlsProps) {
  return (
    <div className="jumbotron-controls">
      <button
        className="jumbotron-play-pause"
        onClick={onTogglePause}
        aria-label={isPaused ? "Play" : "Pause"}
        title={isPaused ? "Play" : "Pause"}
      >
        {isPaused ? "▶️" : "⏸️"}
      </button>
    </div>
  );
}
