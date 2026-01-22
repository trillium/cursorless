import React from "react";
import type { AnimationState } from "./types";

interface StateNavigationDotsProps {
  states: AnimationState[];
  currentState: AnimationState;
  onStateChange: (state: AnimationState) => void;
}

export function StateNavigationDots({
  states,
  currentState,
  onStateChange,
}: StateNavigationDotsProps) {
  return (
    <div className="jumbotron-dots" role="radiogroup" aria-label="Navigation">
      {states.map((state) => (
        <button
          key={state}
          className={`jumbotron-dot ${currentState === state ? "active" : ""}`}
          onClick={() => onStateChange(state)}
          role="radio"
          aria-checked={currentState === state}
          aria-label={`Go to ${state} state`}
          tabIndex={currentState === state ? 0 : -1}
        />
      ))}
    </div>
  );
}
