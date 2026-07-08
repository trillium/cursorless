// Syntax-highlight enrichment — a LOGIC-stage step consumed by RENDER.
//
// Shiki tokenizes source into multi-character syntactic spans; our model is
// per-grapheme (one Token per grapheme after tokenizeLine). This module bridges
// the two: it asks Shiki for a per-line color map (line-local UTF-16 offset →
// hex color) over the SAME document text, then stamps `token.color` on each
// model Token by looking up the color covering the token's start offset.
//
// Layering: this file lives in logic/ and imports ONLY the model contract
// (Line/Token) plus Shiki. It never touches render/ — so `render ⊥ logic` holds
// and RENDER stays the sole consumer of the enrichment (via Token.color).
//
// Async boundary: Shiki loads its WASM engine + grammar/theme lazily, so the
// map builder is async. The core stamping step (applyColorMap) is PURE + SYNC,
// which lets the sync render pipeline consume a pre-resolved map with no async
// creep. See render-command.ts (renderCommandHighlighted) for the opt-in path.

import { codeToTokens, type BundledLanguage } from "shiki";
import type { Line, Token } from "../model/columns";

/** One covering color span within a line, in line-local UTF-16 offsets. */
export interface ColorSpan {
  /** inclusive start offset within the line */
  start: number;
  /** exclusive end offset within the line */
  end: number;
  /** 6/8-digit hex color, e.g. "#c0caf5" */
  color: string;
}

/** Per-line color map: colorMap[lineIdx] = ordered, non-overlapping spans. */
export type ColorMap = ColorSpan[][];

/**
 * The Shiki theme used for command-visualizer highlighting. Matches the theme
 * cursorless already ships in app-web-docs (Code.tsx → theme: "nord"), so the
 * palette is consistent across the two surfaces.
 */
export const HIGHLIGHT_THEME = "nord";

/**
 * Map a language id to one Shiki recognizes. Mirrors app-web-docs/Code.tsx's
 * getFallbackLanguage so both surfaces resolve languages identically.
 */
export function resolveHighlightLang(languageId: string): string {
  switch (languageId) {
    case "javascriptreact":
      return "jsx";
    case "typescriptreact":
      return "tsx";
    case "scm":
      return "scheme";
    case "talon-list":
      return "talon";
    default:
      return languageId;
  }
}

/**
 * Build a per-line color map for `text` in `languageId` using Shiki.
 *
 * Shiki reports each themed token's `offset` relative to the WHOLE input; we
 * re-base it to a line-local offset so lookups align with model Token ranges
 * (which are line-local). Tokens with no explicit color are skipped (they fall
 * through to "no fill", preserving the default look for unstyled text).
 *
 * Throws if Shiki cannot tokenize (e.g. an unknown language) — the caller
 * decides whether to fall back to the uncolored path.
 */
export async function buildColorMap(
  text: string,
  languageId: string,
): Promise<ColorMap> {
  const lang = resolveHighlightLang(languageId);
  // Shiki's bundled `codeToTokens` types `lang` as the BundledLanguage string
  // union, but our language ids are resolved dynamically at runtime. The cast is
  // Shiki's documented pattern for dynamic ids; an unknown id throws at runtime
  // (caught by the caller), which is the correct fail-loud behavior for a spike.
  const { tokens } = await codeToTokens(text, {
    lang: lang as BundledLanguage,
    theme: HIGHLIGHT_THEME,
  });

  return tokens.map((lineTokens) => {
    // Shiki emits one line array per source line, in document order, with
    // absolute offsets. The first token's offset is the line's absolute start.
    const lineStart = lineTokens.length > 0 ? lineTokens[0].offset : 0;
    const spans: ColorSpan[] = [];
    for (const t of lineTokens) {
      if (t.color === undefined || t.content.length === 0) {
        continue;
      }
      const start = t.offset - lineStart;
      spans.push({ start, end: start + t.content.length, color: t.color });
    }
    return spans;
  });
}

/** Look up the color covering a line-local char offset, or undefined. */
export function colorAt(
  spans: ColorSpan[] | undefined,
  charOffset: number,
): string | undefined {
  if (spans === undefined) {
    return undefined;
  }
  for (const s of spans) {
    if (charOffset >= s.start && charOffset < s.end) {
      return s.color;
    }
    // Spans are ordered by start; nothing further can cover this offset.
    if (s.start > charOffset) {
      break;
    }
  }
  return undefined;
}

/**
 * Stamp `token.color` on each Token whose start offset is covered by a span.
 * PURE + SYNC: returns fresh Line/Token objects, leaving the input untouched so
 * the same tokenized frames can be rendered with and without highlighting.
 *
 * A Token's color is decided by the span covering its `range.start`. Because the
 * real pipeline tokenizes one Token per grapheme, this lands per-grapheme-exact:
 * each grapheme gets the color of the syntactic span it sits inside.
 */
export function applyColorMap(lines: Line[], map: ColorMap): Line[] {
  return lines.map((line, lineIdx) => {
    const spans = map[lineIdx];
    return {
      ...line,
      tokens: line.tokens.map((token): Token => {
        const color = colorAt(spans, token.range.start);
        return color === undefined ? token : { ...token, color };
      }),
    };
  });
}
