import React from "react";
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
