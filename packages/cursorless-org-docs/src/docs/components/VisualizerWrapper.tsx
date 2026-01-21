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
    action?: {
      name: string;
      snippetDescription?: {
        type: string;
        body?: string;
        name?: string;
        [key: string]: any;
      };
      [key: string]: any;
    };
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
  // Validate fixture has required data
  if (!fixture.initialState || !fixture.initialState.documentContents) {
    console.error(
      "Invalid fixture: missing initialState.documentContents",
      fixture,
    );
    return (
      <div className="visualizer-wrapper">Error: Invalid fixture data</div>
    );
  }

  if (!fixture.finalState || !fixture.finalState.documentContents) {
    console.error(
      "Invalid fixture: missing finalState.documentContents",
      fixture,
    );
    return (
      <div className="visualizer-wrapper">Error: Invalid fixture data</div>
    );
  }

  const code = fixture.initialState.documentContents;

  // Debug: Check if flashes exist
  console.log(
    `[DEBUG VisualizerWrapper] Fixture:`,
    fixture.command?.spokenForm,
  );
  console.log(`  Has flashes:`, !!fixture.flashes);
  console.log(`  Flashes count:`, fixture.flashes?.length || 0);
  console.log(`  Flashes data:`, fixture.flashes);

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

  // Debug: Log when DURING state is rendered
  if (duringDecorations) {
    console.log(
      `[DEBUG] Rendering DURING state with ${duringDecorations.length} decorations for:`,
      fixture.command?.spokenForm || "unknown command",
    );
  } else {
    console.log(
      `[DEBUG] NO DURING state - duringDecorations is:`,
      duringDecorations,
    );
  }

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

  const snippetDescription = fixture.command?.action?.snippetDescription;
  const actionName = fixture.command?.action?.name;

  const hasClipboard = !!(
    fixture.initialState?.clipboard || fixture.finalState?.clipboard
  );
  const clipboardProduced =
    actionName === "cutToClipboard" || actionName === "copyToClipboard";
  const clipboardConsumed = actionName === "pasteFromClipboard";

  const getClipboardForState = (
    state: "before" | "during" | "after",
  ): string | undefined => {
    if (clipboardProduced) {
      return state === "after" ? fixture.finalState?.clipboard : undefined;
    } else if (clipboardConsumed) {
      return fixture.initialState?.clipboard;
    }
    return undefined;
  };

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

        {(hasClipboard || snippetDescription) && (
          <div className="visualizer-metadata">
            {hasClipboard && (
              <div className="visualizer-metadata-item">
                <strong>Clipboard:</strong>
                <code>{getClipboardForState(currentState) || "(empty)"}</code>
              </div>
            )}
            {snippetDescription && (
              <div className="visualizer-metadata-item">
                <strong>Snippet:</strong>
                <pre>{JSON.stringify(snippetDescription, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
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
          {hasClipboard && (
            <div className="visualizer-metadata-inline">
              <strong>Clipboard:</strong>
              <code>{getClipboardForState("before") || "(empty)"}</code>
            </div>
          )}
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
            {hasClipboard && (
              <div className="visualizer-metadata-inline">
                <strong>Clipboard:</strong>
                <code>{getClipboardForState("during") || "(empty)"}</code>
              </div>
            )}
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
          {hasClipboard && (
            <div className="visualizer-metadata-inline">
              <strong>Clipboard:</strong>
              <code>{getClipboardForState("after") || "(empty)"}</code>
            </div>
          )}
        </div>
      </div>

      {snippetDescription && (
        <div className="visualizer-metadata">
          <div className="visualizer-metadata-item">
            <strong>Snippet:</strong>
            <pre>{JSON.stringify(snippetDescription, null, 2)}</pre>
          </div>
        </div>
      )}
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
