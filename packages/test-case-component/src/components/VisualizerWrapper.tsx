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
  const code = fixture.initialState.documentContents;

  // Combine final state with flashes for DURING state visualization
  // This shows both the marks/selections AND the flash highlights
  // Flashes are relative to FINAL state positions
  const duringDecorations = fixture.flashes
    ? convertFixtureStateWithFlashes(fixture.finalState, fixture.flashes)
    : undefined;

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
              {fixture.finalState.documentContents}
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
