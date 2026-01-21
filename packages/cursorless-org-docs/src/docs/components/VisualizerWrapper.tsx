import React from "react";
import { Code } from "./Code";
import type { CursorlessFixtureState } from "./fixtureAdapter";
import "./VisualizerWrapper.css";

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
  decorations?: Array<{
    name?: string;
    type: string;
    start: { line: number; character: number };
    end: { line: number; character: number };
  }>;
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

  // Convert decorations to the fixture state format for DURING state
  const duringState: CursorlessFixtureState | undefined = fixture.decorations
    ? {
        ...fixture.initialState,
        decorations: fixture.decorations
          .filter((decoration) => decoration.start && decoration.end)
          .map((decoration) => ({
            name: decoration.name,
            type: "selection" as const,
            anchor: decoration.start,
            active: decoration.end,
          })),
      }
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

        {duringState && (
          <div className="visualizer-state">
            <h3 className="visualizer-state-title">During</h3>
            <Code languageId={fixture.languageId} fixtureState={duringState}>
              {code}
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
