import React from "react";
import type { TestCaseFixture, AnimationState } from "./types";

interface VisualizerMetadataProps {
  fixture: TestCaseFixture;
  currentState?: AnimationState;
  inline?: boolean;
}

export function VisualizerMetadata({
  fixture,
  currentState,
  inline = false,
}: VisualizerMetadataProps) {
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

  if (inline && currentState) {
    // Inline metadata for static view
    if (!hasClipboard) {
      return null;
    }

    return (
      <div className="visualizer-metadata-inline">
        <strong>Clipboard:</strong>
        <code>{getClipboardForState(currentState) || "(empty)"}</code>
      </div>
    );
  }

  // Block metadata for jumbotron view
  if (!hasClipboard && !snippetDescription) {
    return null;
  }

  return (
    <div className="visualizer-metadata">
      {hasClipboard && currentState && (
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
  );
}
