import {
  Range,
  Position,
  generateDecorationsForCharacterRange,
  BorderStyle,
  useSingleCornerBorderRadius,
  type DecorationStyle,
} from "@cursorless/common";
import type { DecorationItem } from "shiki";
import { flattenHighlights } from "./flattenHighlights";
import { highlightColors } from "./highlightColors";
import { highlightsToDecorations } from "./highlightsToDecorations";
import type { Highlight, SelectionType } from "./types";

/**
 * Represents a test case fixture state from a .yml recorded fixture file
 */
export interface CursorlessFixtureState {
  documentContents: string;
  marks?: Record<
    `${string}.${string}`,
    { start: { line: number; character: number } }
  >;
  decorations?: CursorlessFixtureSelection[];
  selections?: CursorlessFixtureSelection[];
  thatMark?: [CursorlessFixtureSelection];
  sourceMark?: [CursorlessFixtureSelection];
}

export interface CursorlessFixtureSelection {
  type: "line" | "selection";
  name?: string;
  anchor: { line: number; character: number };
  active: { line: number; character: number };
}

/**
 * Converts a CursorlessFixtureState to Highlights for rendering with ScopeVisualizer
 */
export function convertFixtureStateToHighlights(
  state: CursorlessFixtureState,
  code: string,
): Highlight[] {
  const highlights: Highlight[] = [];

  // Convert all selection types
  if (state.decorations) {
    highlights.push(
      ...convertSelectionsToHighlights(state.decorations, "decoration", code),
    );
  }
  if (state.selections) {
    highlights.push(
      ...convertSelectionsToHighlights(state.selections, "selection", code),
    );
  }
  if (state.thatMark) {
    highlights.push(
      ...convertSelectionsToHighlights(state.thatMark, "thatMark", code),
    );
  }
  if (state.sourceMark) {
    highlights.push(
      ...convertSelectionsToHighlights(state.sourceMark, "sourceMark", code),
    );
  }

  return highlights;
}

/**
 * Converts fixture selections to highlights with appropriate colors
 */
function convertSelectionsToHighlights(
  selections: CursorlessFixtureSelection[],
  selectionType: SelectionType,
  code: string,
): Highlight[] {
  const colors = highlightColors[selectionType];
  const highlights: Highlight[] = [];

  for (const selection of selections) {
    if (!selection.anchor || !selection.active) {
      continue;
    }

    if (selection.type === "line") {
      // Convert line selection to full-line character range
      highlights.push(
        ...convertLineSelectionToHighlights(selection, colors, code),
      );
    } else {
      // Standard character range selection
      const range = new Range(
        new Position(selection.anchor.line, selection.anchor.character),
        new Position(selection.active.line, selection.active.character),
      );
      const codeLineRanges = getCodeLineRanges(code);
      const decorations = getDecorations(codeLineRanges, [range]);

      for (const decoration of decorations) {
        highlights.push(
          getHighlight(colors, decoration.range, decoration.style),
        );
      }
    }
  }

  return highlights;
}

/**
 * Converts a line-based selection to highlights spanning full line width
 */
function convertLineSelectionToHighlights(
  selection: CursorlessFixtureSelection,
  colors: {
    background: string;
    borderSolid: string;
    borderPorous: string;
  },
  code: string,
): Highlight[] {
  const lines = code.split("\n");
  const highlights: Highlight[] = [];

  const startLine = selection.anchor.line;
  const endLine = selection.active.line;

  for (let lineIndex = startLine; lineIndex <= endLine; lineIndex++) {
    const lineLength = lines[lineIndex]?.length ?? 0;
    const range = new Range(
      new Position(lineIndex, 0),
      new Position(lineIndex, lineLength),
    );

    const borderStyle: DecorationStyle = {
      top: lineIndex === startLine ? BorderStyle.solid : BorderStyle.none,
      bottom: lineIndex === endLine ? BorderStyle.solid : BorderStyle.none,
      left: BorderStyle.solid,
      right: BorderStyle.solid,
    };

    highlights.push(getHighlight(colors, range, borderStyle));
  }

  return highlights;
}

/**
 * Converts hat marks to Shiki decorations using single-character ranges
 */
export function convertHatMarksToDecorations(
  marks: Record<string, { start: { line: number; character: number } }>,
  _code: string,
): DecorationItem[] {
  const decorations: DecorationItem[] = [];

  for (const [key, mark] of Object.entries(marks)) {
    const [hatType, character] = key.split(".");
    const char = !character || character === "" ? "." : character;

    // Create a single-character range decoration
    // The CSS will add the hat visual using ::before pseudo-element
    decorations.push({
      start: mark.start,
      end: {
        line: mark.start.line,
        character: mark.start.character + 1,
      },
      alwaysWrap: true, // Force Shiki to wrap the character instead of applying to line
      properties: {
        class: `hat hat-${hatType}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "data-hat-char": char,
      },
    });
  }

  return decorations;
}

/**
 * Converts a complete fixture state to Shiki decorations
 * This is the main entry point for unified rendering
 */
export function convertFixtureStateToDecorations(
  state: CursorlessFixtureState,
): DecorationItem[] {
  const code = state.documentContents;

  // Convert selections/decorations to highlights
  const highlights = convertFixtureStateToHighlights(state, code);

  // Flatten overlapping highlights
  const flattenedHighlights = flattenHighlights(highlights);

  // Convert to Shiki decorations
  const decorations = highlightsToDecorations(flattenedHighlights);

  // Add hat decorations (these don't overlap with highlights)
  if (state.marks) {
    const hatDecorations = convertHatMarksToDecorations(state.marks, code);
    decorations.push(...hatDecorations);
  }

  return decorations;
}

// Helper functions from calculateHighlights.ts

function getHighlight(
  colors: {
    background: string;
    borderSolid: string;
    borderPorous: string;
  },
  range: Range,
  borders: DecorationStyle,
): Highlight {
  return {
    range,
    style: {
      backgroundColor: colors.background,
      borderColorSolid: colors.borderSolid,
      borderColorPorous: colors.borderPorous,
      borderStyle: borders,
      borderRadius: {
        topLeft: useSingleCornerBorderRadius(borders.top, borders.left),
        topRight: useSingleCornerBorderRadius(borders.top, borders.right),
        bottomRight: useSingleCornerBorderRadius(borders.bottom, borders.right),
        bottomLeft: useSingleCornerBorderRadius(borders.bottom, borders.left),
      },
    },
  };
}

function getDecorations(lineRanges: Range[], ranges: Range[]) {
  return ranges.flatMap((range) =>
    Array.from(
      generateDecorationsForCharacterRange(
        (range) => getLineRanges(lineRanges, range),
        new Range(range.start, range.end),
      ),
    ),
  );
}

function getCodeLineRanges(code: string): Range[] {
  return code
    .split("\n")
    .map(
      (line, index) =>
        new Range(new Position(index, 0), new Position(index, line.length)),
    );
}

function getLineRanges(lineRanges: Range[], range: Range): Range[] {
  return lineRanges.slice(range.start.line, range.end.line + 1);
}

/**
 * Combines a fixture state with flash decorations for DURING state
 * This creates a merged visualization showing both the initial state AND the flashes
 */
export function convertFixtureStateWithFlashes(
  state: CursorlessFixtureState,
  flashes: Array<{
    style: string;
    type: string;
    start: { line: number; character: number };
    end: { line: number; character: number };
  }>,
): DecorationItem[] {
  const code = state.documentContents;

  // Don't show initial state highlights during DURING state - only show flashes
  const stateHighlights: Highlight[] = [];

  // Convert flashes to highlights
  const flashHighlights: Highlight[] = [];
  for (const flash of flashes) {
    const colors =
      highlightColors[flash.style as SelectionType] ||
      highlightColors.decoration;

    const range = new Range(
      new Position(flash.start.line, flash.start.character),
      new Position(flash.end.line, flash.end.character),
    );
    const codeLineRanges = getCodeLineRanges(code);
    const decorations = getDecorations(codeLineRanges, [range]);

    for (const decoration of decorations) {
      flashHighlights.push(
        getHighlight(colors, decoration.range, decoration.style),
      );
    }
  }

  // Combine all highlights
  const allHighlights = [...stateHighlights, ...flashHighlights];

  // Flatten overlapping highlights
  const flattenedHighlights = flattenHighlights(allHighlights);

  // Convert to Shiki decorations
  const shikiDecorations = highlightsToDecorations(flattenedHighlights);

  // Add hat decorations (these don't overlap with highlights)
  if (state.marks) {
    const hatDecorations = convertHatMarksToDecorations(state.marks, code);
    shikiDecorations.push(...hatDecorations);
  }

  return shikiDecorations;
}
