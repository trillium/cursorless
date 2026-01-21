import React, { useState, useEffect } from "react";
import { Code } from "./Code";
import type { CursorlessFixtureState } from "./fixtureAdapter";
import { convertFixtureStateWithFlashes } from "./fixtureAdapter";
import "./VisualizerWrapper.css";

/**
 * Represents a flash highlight from ide.flashes in the fixture
 */
export interface FlashDecoration {
  style: string;
  type: string;
  start: { line: number; character: number };
  end: { line: number; character: number };
}

/**
 * Represents a complete test case fixture from a .yml recorded test file
 */
export interface TestCaseFixture {
  languageId: string;
  command?: {
    spokenForm: string;
  };
  initialState: CursorlessFixtureState;
  finalState: CursorlessFixtureState;
  flashes?: FlashDecoration[];
}

interface VisualizerWrapperProps {
  fixture: TestCaseFixture;
  showCommand?: boolean;
  animated?: boolean;
}

/**
 * VisualizerWrapper component renders multiple temporal states of a test case
 *
 * This component displays BEFORE, DURING (optional), and AFTER states of a
 * Cursorless command execution, using the unified ScopeVisualizer rendering engine.
 *
 * @param fixture - The complete test case fixture data from a .yml file
 * @param showCommand - Whether to display the command spoken form (default: true)
 */
export function VisualizerWrapper({
  fixture,
  showCommand = true,
  animated = false,
}: VisualizerWrapperProps) {
  const code = fixture.initialState.documentContents;

  // Determine which document state to use for DURING visualization
  // - pendingDelete flashes reference INITIAL state positions (what's being deleted)
  // - other flashes (referenced, pendingModification) reference FINAL state positions
  const hasPendingDelete = fixture.flashes?.some(
    (flash) => flash.style === "pendingDelete",
  );
  const duringState = hasPendingDelete
    ? fixture.initialState
    : fixture.finalState;
  const duringCode = duringState.documentContents;

  const duringDecorations = fixture.flashes
    ? convertFixtureStateWithFlashes(duringState, fixture.flashes)
    : undefined;

  // Animation state for jumbotron mode
  type AnimationState = "before" | "during" | "after";
  const [currentState, setCurrentState] = useState<AnimationState>("before");
  const [isPaused, setIsPaused] = useState(false);

  // Get available states based on whether DURING exists
  const states: AnimationState[] = duringDecorations
    ? ["before", "during", "after"]
    : ["before", "after"];

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
  }, [currentState, animated, isPaused, duringDecorations]);

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

  const maxLines = animated
    ? Math.max(
        code.split("\n").length,
        fixture.finalState.documentContents.split("\n").length,
        duringCode ? duringCode.split("\n").length : 0,
      )
    : undefined;

  if (animated) {
    return (
      <div className="visualizer-wrapper visualizer-jumbotron">
        {showCommand && fixture.command && (
          <div className="visualizer-command">
            <strong>Command:</strong> {fixture.command.spokenForm}
          </div>
        )}

        <div className="jumbotron-container">
          <div className="jumbotron-controls">
            <button
              className="jumbotron-play-pause"
              onClick={() => setIsPaused(!isPaused)}
              aria-label={isPaused ? "Play" : "Pause"}
              title={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? "▶️" : "⏸️"}
            </button>
          </div>

          <div
            className={`jumbotron-state ${currentState === "before" ? "active" : ""}`}
          >
            <Code
              languageId={fixture.languageId}
              fixtureState={fixture.initialState}
              minLines={maxLines}
            >
              {code}
            </Code>
          </div>

          {duringDecorations && (
            <div
              className={`jumbotron-state ${currentState === "during" ? "active" : ""}`}
            >
              <Code
                languageId={fixture.languageId}
                decorations={duringDecorations}
                minLines={maxLines}
              >
                {duringCode}
              </Code>
            </div>
          )}

          <div
            className={`jumbotron-state ${currentState === "after" ? "active" : ""}`}
          >
            <Code
              languageId={fixture.languageId}
              fixtureState={fixture.finalState}
              minLines={maxLines}
            >
              {fixture.finalState.documentContents}
            </Code>
          </div>
        </div>

        <div
          className="jumbotron-dots"
          role="radiogroup"
          aria-label="Navigation"
        >
          {states.map((state) => (
            <button
              key={state}
              className={`jumbotron-dot ${currentState === state ? "active" : ""}`}
              onClick={() => {
                setIsPaused(true);
                goToState(state);
              }}
              role="radio"
              aria-checked={currentState === state}
              aria-label={`Go to ${state} state`}
              tabIndex={currentState === state ? 0 : -1}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="visualizer-wrapper">
      {showCommand && fixture.command && (
        <div className="visualizer-command">
          <strong>Command:</strong> {fixture.command.spokenForm}
        </div>
      )}

      <div className="visualizer-states">
        <div className="visualizer-state">
          <h3 className="visualizer-state-title">Before</h3>
          <Code
            languageId={fixture.languageId}
            fixtureState={fixture.initialState}
          >
            {code}
          </Code>
        </div>

        {duringDecorations && (
          <div className="visualizer-state">
            <h3 className="visualizer-state-title">During</h3>
            <Code
              languageId={fixture.languageId}
              decorations={duringDecorations}
            >
              {duringCode}
            </Code>
          </div>
        )}

        <div className="visualizer-state">
          <h3 className="visualizer-state-title">After</h3>
          <Code
            languageId={fixture.languageId}
            fixtureState={fixture.finalState}
          >
            {fixture.finalState.documentContents}
          </Code>
        </div>
      </div>
    </div>
  );
}

/**
 * Simplified wrapper for rendering just before/after states
 */
interface SimpleVisualizerProps {
  languageId: string;
  before: CursorlessFixtureState;
  after: CursorlessFixtureState;
  command?: string;
}

export function SimpleVisualizer({
  languageId,
  before,
  after,
  command,
}: SimpleVisualizerProps) {
  return (
    <VisualizerWrapper
      fixture={{
        languageId,
        initialState: before,
        finalState: after,
        command: command ? { spokenForm: command } : undefined,
      }}
      showCommand={!!command}
    />
  );
}

/**
 * Animated jumbotron wrapper - cycles through states automatically
 */
export function AnimatedVisualizer({
  fixture,
  showCommand = true,
}: Omit<VisualizerWrapperProps, "animated">) {
  return (
    <VisualizerWrapper
      fixture={fixture}
      showCommand={showCommand}
      animated={true}
    />
  );
}
