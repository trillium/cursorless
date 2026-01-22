import { useState, useEffect } from "react";
import type { AnimationState } from "./types";

interface UseAnimationStateProps {
  animated: boolean;
  states: AnimationState[];
}

interface UseAnimationStateReturn {
  currentState: AnimationState;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  goToNextState: () => void;
  goToPrevState: () => void;
  goToState: (state: AnimationState) => void;
}

export function useAnimationState({
  animated,
  states,
}: UseAnimationStateProps): UseAnimationStateReturn {
  const [currentState, setCurrentState] = useState<AnimationState>("before");
  const [isPaused, setIsPaused] = useState(false);

  const currentStateIndex = states.indexOf(currentState);

  const goToNextState = () => {
    const nextIndex = (currentStateIndex + 1) % states.length;
    setCurrentState(states[nextIndex]);
  };

  const goToPrevState = () => {
    const prevIndex = (currentStateIndex - 1 + states.length) % states.length;
    setCurrentState(states[prevIndex]);
  };

  const goToState = (state: AnimationState) => {
    setCurrentState(state);
  };

  // Auto-cycle through states
  useEffect(() => {
    if (!animated || isPaused) {
      return;
    }

    const cycleDurations = {
      before: 3000,
      during: 500,
      after: 3000,
    };

    const timer = setTimeout(() => {
      goToNextState();
    }, cycleDurations[currentState]);

    return () => clearTimeout(timer);
  }, [currentState, animated, isPaused]);

  // Keyboard navigation
  useEffect(() => {
    if (!animated) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIsPaused(true);
        goToPrevState();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIsPaused(true);
        goToNextState();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [animated, currentStateIndex, states]);

  return {
    currentState,
    isPaused,
    setIsPaused,
    goToNextState,
    goToPrevState,
    goToState,
  };
}
