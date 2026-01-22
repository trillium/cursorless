import React, { useState } from "react";
import { Code } from "../Code";
import { Controls } from "./Controls";
import { StateNavigationDots } from "./StateNavigationDots";
import { VisualizerMetadata } from "./VisualizerMetadata";
import { useAnimationState } from "./useAnimationState";
import type { TestCaseFixture, AnimationState } from "./types";

interface JumbotronViewProps {
  fixture: TestCaseFixture;
  showCommand: boolean;
  duringDecorations?: any[];
  duringCode: string;
  _duringState: any;
  maxLines: number;
}

export function JumbotronView({
  fixture,
  showCommand,
  duringDecorations,
  duringCode,
  _duringState: _,
  maxLines,
}: JumbotronViewProps) {
  const code = fixture.initialState.documentContents;

  // Get available states based on whether DURING exists
  const states: AnimationState[] = duringDecorations
    ? ["before", "during", "after"]
    : ["before", "after"];

  const { currentState, isPaused, setIsPaused, goToState } = useAnimationState({
    animated: true,
    states,
  });

  // Visibility toggles
  const [showHighlights, setShowHighlights] = useState(true);

  const snippetDescription = fixture.command?.action?.snippetDescription;

  // Build container class names based on visibility toggles
  const containerClassNames = [
    "jumbotron-container",
    !showHighlights && "hide-highlights",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="visualizer-wrapper visualizer-jumbotron">
      {showCommand && fixture.command && (
        <div className="visualizer-command">
          <strong>Command:</strong> {fixture.command.spokenForm}
        </div>
      )}
      {snippetDescription && (
        <div className="visualizer-command">
          <strong>Snippet:</strong> {snippetDescription.body}
        </div>
      )}

      <div className={containerClassNames}>
        <Controls
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(!isPaused)}
          showHighlights={showHighlights}
          onToggleHighlights={() => setShowHighlights(!showHighlights)}
        />

        <div
          className={`jumbotron-state ${currentState === "before" ? "active" : ""}`}
        >
          <Code
            languageId={fixture.languageId}
            fixtureState={fixture.initialState}
            minLines={maxLines}
            showCopyButton={false}
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
              showCopyButton={false}
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
            showCopyButton={false}
          >
            {fixture.finalState.documentContents}
          </Code>
        </div>
      </div>

      <VisualizerMetadata fixture={fixture} currentState={currentState} />

      <StateNavigationDots
        states={states}
        currentState={currentState}
        onStateChange={(state) => {
          setIsPaused(true);
          goToState(state);
        }}
      />
    </div>
  );
}
