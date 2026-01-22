import React from "react";
import { Code } from "../Code";
import { VisualizerMetadata } from "./VisualizerMetadata";
import type { TestCaseFixture } from "./types";

interface StaticViewProps {
  fixture: TestCaseFixture;
  showCommand: boolean;
  duringDecorations?: any[];
  duringCode: string;
}

export function StaticView({
  fixture,
  showCommand,
  duringDecorations,
  duringCode,
}: StaticViewProps) {
  const code = fixture.initialState.documentContents;
  const snippetDescription = fixture.command?.action?.snippetDescription;

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
            showCopyButton={false}
          >
            {code}
          </Code>
          <VisualizerMetadata
            fixture={fixture}
            currentState="before"
            inline={true}
          />
        </div>

        {duringDecorations && (
          <div className="visualizer-state">
            <h3 className="visualizer-state-title">During</h3>
            <Code
              languageId={fixture.languageId}
              decorations={duringDecorations}
              showCopyButton={false}
            >
              {duringCode}
            </Code>
            <VisualizerMetadata
              fixture={fixture}
              currentState="during"
              inline={true}
            />
          </div>
        )}

        <div className="visualizer-state">
          <h3 className="visualizer-state-title">After</h3>
          <Code
            languageId={fixture.languageId}
            fixtureState={fixture.finalState}
            showCopyButton={false}
          >
            {fixture.finalState.documentContents}
          </Code>
          <VisualizerMetadata
            fixture={fixture}
            currentState="after"
            inline={true}
          />
        </div>
      </div>

      {snippetDescription && <VisualizerMetadata fixture={fixture} />}
    </div>
  );
}
