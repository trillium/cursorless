// Top-level orchestrator — the ONE legible, top-to-bottom view of the whole
// pipeline. Read this file to understand what the tool does, in four stages:
//
//   1. get what to render   (parse the fixture YAML)
//   2. tokenize each step    (documents → Frames: lines, hats, selections)
//   3. generate render object (Frames → CascadeState: flashes, during, overlays)
//   4. render from object     (CascadeState → animated SVG string)
//
// This module lives at the package ROOT (alongside index.ts), NOT inside
// logic/ or render/, because it is the ONE allowed composition point that spans
// BOTH scopes. The folder rule (logic/ ⊥ render/) is preserved: neither folder
// imports the other; only this root module and index.ts join them.

import {
  parseFixture,
  tokenizeStates,
  buildRenderObject,
  type PipelineOptions,
} from "./logic/pipeline";
import { detokenizeDoc } from "./logic/tokenize";
import { applyColorMap, buildColorMap } from "./logic/highlight";
import type { CascadeState } from "./model/frame-state";
import {
  serializeCascade,
  type CascadeRenderOptions,
} from "./render/serialize-cascade";
import { wrapCascadeSvg, type SvgWrapOptions } from "./render/svg-wrap";

/** Options for the end-to-end orchestrator: pipeline + render + SVG-wrap knobs. */
export interface RenderCommandOptions
  extends PipelineOptions,
    SvgWrapOptions,
    CascadeRenderOptions {}

/**
 * Render a single recorded fixture to a standalone animated SVG string.
 *
 * The four pipeline stages are visible at a glance below; each delegates to an
 * existing named function. Output is byte-identical to the equivalent
 * fixtureToCascade → serializeCascade → wrapCascadeSvg call chain.
 *
 * @param src        Fixture YAML text.
 * @param fixtureRel Relative fixture path (recorded into caption/meta).
 * @param opts       Pipeline + SVG-wrap options.
 */
export function renderCommand(
  src: string,
  fixtureRel: string,
  opts: RenderCommandOptions = {},
): string {
  const parsed = parseFixture(src, fixtureRel, opts); // 1. get what to render
  const tokenized = tokenizeStates(parsed, opts); //      2. tokenize each step
  const cascade = buildRenderObject(parsed, tokenized, opts); // 3. render object
  const inner = serializeCascade(cascade, { lineNumbers: opts.lineNumbers });
  return wrapCascadeSvg(cascade, inner, undefined, {
    flashPulseMs: opts.flashPulseMs,
  }); //                                                    4. render from object
}

/** Options for the highlighted render path: everything renderCommand takes, plus a language. */
export interface RenderCommandHighlightedOptions extends RenderCommandOptions {
  /**
   * Language id for Shiki (e.g. "typescript", "python", "typescriptreact").
   * Passed through resolveHighlightLang, so editor ids like "typescriptreact"
   * are accepted.
   */
  lang: string;
}

/**
 * Async, opt-in variant of {@link renderCommand} that runs Shiki syntax
 * highlighting over each frame's document text and emits per-character color
 * fills. This is a SEPARATE path on purpose: Shiki is async (it lazily loads a
 * WASM engine + grammar/theme), and the sync `renderCommand` must never become
 * async or change its byte-identical output.
 *
 * Design: stages 1–3 build the same CascadeState as the sync path; then, per
 * frame, we detokenize the frame's lines back to text, ask Shiki for a color
 * map over that exact text, and stamp `token.color` via the pure `applyColorMap`.
 * Every color map is resolved up front (async) so the actual serialize step
 * stays the same pure/sync render call — no async leaks into render/.
 *
 * @param src        Fixture YAML text.
 * @param fixtureRel Relative fixture path (recorded into caption/meta).
 * @param opts       Pipeline + SVG-wrap options, plus the required `lang`.
 */
export async function renderCommandHighlighted(
  src: string,
  fixtureRel: string,
  opts: RenderCommandHighlightedOptions,
): Promise<string> {
  const parsed = parseFixture(src, fixtureRel, opts); // 1. get what to render
  const tokenized = tokenizeStates(parsed, opts); //      2. tokenize each step
  const cascade = buildRenderObject(parsed, tokenized, opts); // 3. render object

  // Resolve one Shiki color map per frame (async), then stamp colors purely.
  const highlighted: CascadeState = {
    ...cascade,
    frames: await Promise.all(
      cascade.frames.map(async (frame) => {
        const text = detokenizeDoc(frame.lines);
        const map = await buildColorMap(text, opts.lang);
        return { ...frame, lines: applyColorMap(frame.lines, map) };
      }),
    ),
  };

  const inner = serializeCascade(highlighted, {
    lineNumbers: opts.lineNumbers,
  });
  return wrapCascadeSvg(highlighted, inner, undefined, {
    flashPulseMs: opts.flashPulseMs,
  }); //                                                    4. render from object
}
