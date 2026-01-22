import React from "react";
import { convertFixtureStateWithFlashes } from "../fixtureAdapter";
import { JumbotronView } from "./JumbotronView";
import { StaticView } from "./StaticView";
import type { VisualizerWrapperProps, SimpleVisualizerProps } from "./types";
import "./VisualizerWrapper.css";

/**
 * VisualizerWrapper component renders multiple temporal states of a test case
 *
 * This component displays BEFORE, DURING (optional), and AFTER states of a
 * Cursorless command execution, using the unified ScopeVisualizer rendering engine.
 *
 * @param fixture - The complete test case fixture data from a .yml file
 * @param showCommand - Whether to display the command spoken form (default: true)
 * @param animated - Whether to use the animated jumbotron view (default: false)
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

  const maxLines = animated
    ? Math.max(
        code.split("\n").length,
        fixture.finalState.documentContents.split("\n").length,
        duringCode ? duringCode.split("\n").length : 0,
      )
    : 0;

  if (animated) {
    return (
      <JumbotronView
        fixture={fixture}
        showCommand={showCommand}
        duringDecorations={duringDecorations}
        duringCode={duringCode}
        _duringState={duringState}
        maxLines={maxLines}
      />
    );
  }

  return (
    <StaticView
      fixture={fixture}
      showCommand={showCommand}
      duringDecorations={duringDecorations}
      duringCode={duringCode}
    />
  );
}

/**
 * Simplified wrapper for rendering just before/after states
 */
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
