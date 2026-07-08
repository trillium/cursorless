# Proposal: `cursorless.getScopeSupport` RPC

**Status:** Draft proposal — not yet implemented.
**Author:** Trillium Smith (fork)
**Created:** 2026-06-10
**Target packages:** `cursorless-engine`, `cursorless-vscode`, `cursorless-talon`

---

## Problem

Cursorless computes a live, language-aware "what scopes are usable in the active editor right now" list every time the editor, document, or language definition changes. The computation already exists in `packages/cursorless-engine/src/scopeProviders/ScopeSupportWatcher.ts` (lines 86–116) and produces a `ScopeSupportInfo[]` keyed off `editor.document.languageId`. Its consumers today are all **in-process** — the VS Code `ScopeTreeProvider`, the scope visualizer, and so on.

Out-of-process consumers — Talon scripts, sidecar UIs, voice-driven HUDs, MCP servers, accessibility tooling — currently have access to:

- **`user.cursorless_scope_type`** (Talon registry list, populated from `spoken_forms.json` via `cursorless-talon/src/spoken_forms.py:82`) — the **static catalog** of every scope spoken form that *exists*. Not language-aware. Doesn't tell you whether `function` is actually targetable in your current Markdown buffer.
- **`cursorless.showCheatsheet`** RPC — takes a payload *from Talon to the engine* and writes an HTML file. The RPC direction is wrong for "give me the live state."

Result: a voice-first user cannot ask "what scopes work in the file I'm focused on right now?" from outside the VS Code process. The data exists; it just doesn't cross the IPC boundary.

## Goal

Add one new VS Code command, `cursorless.getScopeSupport`, that returns a JSON payload of `SerializedScopeSupportInfo[]` describing the active editor's live scope support. Add a thin Talon-side helper that wraps the RPC. Keep the engine surface additive, the VS Code surface minimal, and the Talon-side ergonomic.

## Non-Goals

- **Push notifications.** v1 is pull-only. A push variant (engine writes `scope-support.json` mirroring the `spoken_forms.json` pattern, Talon watches the file) is sketched in [Future Work](#future-work) but explicitly out of scope here.
- **`cursorless-everywhere-talon-core` support.** The Everywhere engine runs cursorless outside VS Code; it has its own command surface and would need parallel plumbing. Deferred to v2.
- **Neovim parity.** `cursorless.nvim` has its own command-server bridge; v1 is VS-Code-only.
- **Exposing `ScopeRanges` / `IterationScopeRanges` over RPC.** Range data is large, editor-frame-dependent, and best left to in-process consumers like the visualizer.
- **Modifying existing commands.** `cursorless.showCheatsheet` is untouched. The `user.cursorless_scope_type` registry list is untouched.

## Background — what already exists

```
ScopeInfoProvider          (packages/cursorless-engine/src/scopeProviders/ScopeInfoProvider.ts)
  └─ emits ScopeTypeInfo[] — "every scope that exists, with spoken form"

ScopeSupportChecker        (packages/cursorless-engine/src/scopeProviders/ScopeSupportChecker.ts)
  └─ getScopeSupport(editor, scopeType) -> ScopeSupport      (lines 32–43)
  └─ getIterationScopeSupport(editor, scopeType) -> ScopeSupport

ScopeSupportWatcher        (packages/cursorless-engine/src/scopeProviders/ScopeSupportWatcher.ts)
  └─ private getSupportLevels() -> ScopeSupportInfo[]        (lines 86–116)
  └─ onDidChangeScopeSupport(callback) -> Disposable         (lines 63–73)
  └─ Already wired to onDidChangeActiveTextEditor,
     onDidChangeTextDocument, onDidChangeDefinition.

ScopeProvider              (packages/common/src/types/ScopeProvider.ts:10–115)
  └─ Public engine-facing interface, includes:
       getScopeSupport(editor, scopeType) -> ScopeSupport
       getIterationScopeSupport(editor, scopeType) -> ScopeSupport
       onDidChangeScopeSupport(callback) -> Disposable
```

The "produce the live list" work is **done**. This proposal is purely about exposure.

## Design

### 1. New engine method

Add one method to `ScopeProvider` in `packages/common/src/types/ScopeProvider.ts`:

```typescript
/**
 * Get the scope support list for the currently active editor, as a single
 * synchronous snapshot. Returns an empty array when there is no active editor.
 * Equivalent to what {@link onDidChangeScopeSupport} would emit at this moment.
 */
getCurrentScopeSupport(): ScopeSupportInfo[];
```

Implementation: factor `ScopeSupportWatcher.getSupportLevels()` out so it can be shared.

**Option A (preferred):** promote the body of `getSupportLevels()` to a public method on `ScopeSupportChecker` named `getCurrentScopeSupportInfos()`. `ScopeSupportWatcher` calls it internally; the new RPC handler calls it too. No duplication.

**Option B:** add `getCurrentScopeSupport()` to the `ScopeProvider` instance built by `createScopeProvider()` in `packages/cursorless-engine/src/cursorlessEngine.ts:123–127`, delegating to a shared helper. Same logic, different injection seam.

Either way, the existing private `ScopeSupportWatcher.getSupportLevels()` becomes a one-line delegate.

### 2. Wire-format type

`ScopeSupportInfo` and its nested `ScopeType` are TypeScript types. `ScopeType` is a discriminated union — some variants carry parameters (e.g. surrounding pairs, regex scopes). For the wire format, define:

```typescript
// packages/common/src/types/command/CommandV0Types.ts (or new sibling file)
export interface SerializedScopeSupportInfo {
  scopeType: ScopeType;                // already JSON-friendly: discriminated union of plain objects
  spokenForm: SpokenForm;              // { type: "spoken" | "missing", ... }
  humanReadableName: string;
  isLanguageSpecific: boolean;
  support: "supportedAndPresentInEditor"
         | "supportedButNotPresentInEditor"
         | "supportedLegacy"
         | "unsupported";              // ScopeSupport enum -> string for JSON stability
  iterationScopeSupport: SerializedScopeSupportInfo["support"];
}
```

**Serialization concern:** `ScopeSupport` is a numeric enum (see `ScopeProvider.ts:218–223`). Numeric enum values are not stable across reorderings. The RPC handler converts the enum to its string name before returning. The Talon side gets a stable string ("supportedAndPresentInEditor"), not the integer `0`.

`ScopeType` is already a structured union of plain objects (e.g. `{ type: "line" }`, `{ type: "surroundingPair", delimiter: "..." }`, etc.) and round-trips through `JSON.stringify` cleanly. No transformation needed.

### 3. VS Code command registration

In `packages/cursorless-vscode/src/registerCommands.ts` (around line 48 where `showCheatsheet` is registered), add:

```typescript
["cursorless.getScopeSupport"]: getScopeSupport,
```

Handler signature:

```typescript
// packages/cursorless-vscode/src/getScopeSupport.ts (new)
import type { ScopeProvider, SerializedScopeSupportInfo, ScopeSupportInfo } from "@cursorless/common";

export function createGetScopeSupport(scopeProvider: ScopeProvider) {
  return (): SerializedScopeSupportInfo[] =>
    scopeProvider.getCurrentScopeSupport().map(serialize);
}

const SUPPORT_NAMES = [
  "supportedAndPresentInEditor",
  "supportedButNotPresentInEditor",
  "supportedLegacy",
  "unsupported",
] as const;

function serialize(info: ScopeSupportInfo): SerializedScopeSupportInfo {
  return {
    scopeType: info.scopeType,
    spokenForm: info.spokenForm,
    humanReadableName: info.humanReadableName,
    isLanguageSpecific: info.isLanguageSpecific,
    support: SUPPORT_NAMES[info.support],
    iterationScopeSupport: SUPPORT_NAMES[info.iterationScopeSupport],
  };
}
```

The factory pattern (`createGetScopeSupport(scopeProvider)`) keeps the handler closed over its dependency and matches the wiring style already used for other engine-driven commands in `registerCommands.ts`.

### 4. package.json contribution

In `packages/cursorless-vscode/package.json` `contributes.commands`, add:

```json
{
  "command": "cursorless.getScopeSupport",
  "title": "Cursorless: Get scope support for the active editor",
  "enablement": "false"
}
```

`enablement: "false"` mirrors `cursorless.showCheatsheet` — the command is RPC-only, not shown in the command palette.

### 5. Talon-side helper

In `cursorless-talon/src/`, add a new module `scope_support.py`:

```python
from talon import Module, actions

mod = Module()

@mod.action_class
class Actions:
    def cursorless_get_scope_support() -> list[dict]:
        """Return the live scope-support list for the active VS Code editor.

        Each entry has keys: scopeType, spokenForm, humanReadableName,
        isLanguageSpecific, support, iterationScopeSupport. `support` and
        `iterationScopeSupport` are strings: one of
        'supportedAndPresentInEditor', 'supportedButNotPresentInEditor',
        'supportedLegacy', 'unsupported'.
        """
        return actions.user.private_cursorless_run_rpc_command_get(
            "cursorless.getScopeSupport"
        ) or []
```

This is the **first cursorless command that returns structured JSON to Talon.** The plumbing for it already exists (`private_cursorless_run_rpc_command_get` in `cursorless_command_server.py:30–41`, used by `command.py:36` and `command.py:52`). The novelty is that until now the only callers consumed scalar / non-domain return values.

### 6. Behavior with no active editor

The existing `ScopeSupportWatcher.getSupportLevels()` already handles `activeTextEditor == null` by mapping every scope to `ScopeSupport.unsupported`. For the RPC, we instead return `[]` — an empty list is a clearer "no editor focused" signal across the IPC boundary than a list of `unsupported` rows. The shared `ScopeSupportChecker.getCurrentScopeSupportInfos()` should take an optional `{ emptyWhenNoEditor: boolean }` flag so the watcher can keep its current behavior while the RPC opts into the empty-array semantics.

### 7. Lifecycle: pull v1, push v2

**v1 is pull.** Talon calls the RPC on demand — typically right after an editor switch, or before showing a UI that depends on the list. Single roundtrip, no state.

A push variant (engine writes `~/.cursorless/scope-support.json` whenever `onDidChangeScopeSupport` fires; Talon watches the file like it already watches `state.json`) is sketched in [Future Work](#future-work). It would need a debounce policy (the existing `Debouncer` in `packages/cursorless-engine/src/core/Debouncer.ts` is already used by `ScopeSupportWatcher` and is reusable) and a documented schema. We defer it to v2 to keep v1 surgical.

## Implementation Steps

A reviewer should be able to follow this list top to bottom without further investigation.

1. **`packages/common/src/types/ScopeProvider.ts`** — add `getCurrentScopeSupport(): ScopeSupportInfo[]` to the `ScopeProvider` interface. Export `SerializedScopeSupportInfo` alongside (or in a sibling `command/` types file).
2. **`packages/common/src/index.ts`** — re-export `SerializedScopeSupportInfo` if added in a new file.
3. **`packages/cursorless-engine/src/scopeProviders/ScopeSupportChecker.ts`** — add `getCurrentScopeSupportInfos(options?: { emptyWhenNoEditor?: boolean }): ScopeSupportInfo[]` containing the body lifted from `ScopeSupportWatcher.getSupportLevels()`.
4. **`packages/cursorless-engine/src/scopeProviders/ScopeSupportWatcher.ts`** — replace the body of `getSupportLevels()` with a single call to the new checker method. Behavior unchanged for existing in-process consumers.
5. **`packages/cursorless-engine/src/cursorlessEngine.ts`** — in `createScopeProvider()` (lines 123–127), wire `getCurrentScopeSupport: () => scopeSupportChecker.getCurrentScopeSupportInfos({ emptyWhenNoEditor: false })`.
6. **`packages/cursorless-vscode/src/getScopeSupport.ts`** (new file) — implement `createGetScopeSupport(scopeProvider)` returning the serialized handler. Calls `scopeProvider.getCurrentScopeSupport()` with `{ emptyWhenNoEditor: true }` semantics by passing `[]` through when the array is all-`unsupported` *and* there is no active editor — or by adding a second engine entry point that takes the flag. Pick the cleaner of the two during code review.
7. **`packages/cursorless-vscode/src/registerCommands.ts`** — register `"cursorless.getScopeSupport": createGetScopeSupport(scopeProvider)` alongside `showCheatsheet` (around line 48).
8. **`packages/cursorless-vscode/package.json`** — add the command contribution (see [§4](#4-packagejson-contribution)).
9. **`cursorless-talon/src/scope_support.py`** (new file) — add the `cursorless_get_scope_support` action.
10. **`cursorless-talon/src/__init__.py`** — import the new module so Talon picks it up.
11. **`CHANGELOG.md`** — under "Unreleased", add a "Features" entry: `cursorless.getScopeSupport: new RPC returning live, language-aware scope support for the active editor`.
12. **`docs/contributing/architecture/`** — add a short `scope-support-rpc.md` once the feature ships, describing the resulting architecture (this proposal doc moves to "implemented" status at that point).

## Test Plan

| Test | File | Asserts |
|------|------|---------|
| Engine unit | `packages/cursorless-engine/src/test/scopeProviders/ScopeSupportChecker.test.ts` (new or extend existing) | `getCurrentScopeSupportInfos()` returns one entry per `ScopeTypeInfo`; entries have correct `support` per a mocked `scopeHandlerFactory`; no-active-editor option returns `[]` |
| Engine unit | same file | Numeric `ScopeSupport` enum maps 1:1 to the four expected string names — guards against enum reordering |
| VS Code e2e | `packages/cursorless-vscode-e2e/src/suite/getScopeSupport.test.ts` (new) | Open a `.ts` fixture, run `vscode.commands.executeCommand("cursorless.getScopeSupport")`, assert a `line` entry exists with `support: "supportedAndPresentInEditor"`; open a `.md` fixture, assert `function` is `unsupported` |
| Talon e2e | `packages/cursorless-everywhere-talon-e2e/` (optional) | RPC roundtrip from Talon-side, assert payload shape — only if v2 lands Everywhere support |

## Open Questions

1. **Method name.** `getCurrentScopeSupport()` is descriptive but verbose. Alternatives: `getActiveScopeSupport()`, `snapshotScopeSupport()`. Pick during PR review.
2. **Empty-vs-unsupported policy.** Should the RPC return `[]` when there is no active editor, or the full list with everything marked `unsupported`? The latter is more uniform; the former is unambiguous. This proposal leans empty array; reviewers may prefer otherwise.
3. **Should `humanReadableName` be locale-aware?** Today it's hardcoded English. The RPC just forwards what the engine produces — but if i18n ever lands, the RPC payload inherits it automatically.
4. **Talon-side caching.** Should the helper cache the last result and refetch only on editor-change events? For v1, keep it dumb — let callers cache. Add a thin watcher in v2 if usage justifies it.
5. **Should we also expose `getScopeInfo()` over RPC?** This would give callers "every scope that exists, with spoken form" without the per-editor support computation. Possibly cheaper. Out of scope for v1 — but ~10 lines if reviewers want both in one PR.

## Future Work

- **v2: Push via `~/.cursorless/scope-support.json`.** Mirror the existing `spoken_forms.json` → `state.json` pattern. Engine subscribes to `onDidChangeScopeSupport`, writes JSON to disk on every (debounced) change. Talon adds a file-watcher and surfaces a live registry list `user.cursorless_active_scope_type`. Avoids polling. Requires deciding when to *not* write (e.g. when no Talon process is listening).
- **v2: Everywhere-Talon-core parity.** Replicate the RPC at the `cursorless-everywhere-talon-core` layer so non-VS-Code Talon hosts get the same surface.
- **v2: `cursorless.getScopeRanges`.** A heavier RPC returning live `ScopeRanges` for a given scope type. Enables out-of-process visualizers (HUDs, mini-maps).
- **v2: Neovim parity.** Implement the same command on the neovim command-server bridge.
- **Adoption guide.** Once shipped, write a short user-facing doc page (`docs/user/scope-support-rpc.md`) showing how to consume the API from Talon — useful for the broader community building voice-first tooling on top of cursorless.

## Implementation Notes

- **Recommended agent at build time:** Forge (Claude Opus, stricter system prompt). The work is multi-file, surgical, and needs zero shortcuts on the serialization-correctness front. The enum-to-string mapping is exactly the kind of place a less-rigorous agent would let a bug slip in.
- **No new dependencies.** `lodash` (used by `ScopeSupportWatcher`) is already present. The serialization helper is a 4-element constant array. No npm/pnpm changes.
- **Branch hygiene.** Trillium currently has uncommitted hat-allocation work on `generate-examples`. This feature should land on a fresh branch (`feat/scope-support-rpc` or similar) and never touch those files.

## References

- `packages/common/src/types/ScopeProvider.ts` — interface, 10–115
- `packages/cursorless-engine/src/scopeProviders/ScopeSupportWatcher.ts:86–116` — the function to reuse
- `packages/cursorless-engine/src/scopeProviders/ScopeSupportChecker.ts:32–43` — per-scope support computation
- `packages/cursorless-engine/src/scopeProviders/ScopeInfoProvider.ts:1–104` — scope info catalog
- `packages/cursorless-engine/src/cursorlessEngine.ts:123–127` — `createScopeProvider` factory
- `packages/cursorless-vscode/src/registerCommands.ts:22–108` — VS Code command registration
- `packages/cursorless-vscode/package.json:67–180` — existing `contributes.commands`
- `cursorless-talon/src/cursorless_command_server.py:10–41` — RPC client helpers
- `cursorless-talon/src/command.py:36,52` — prior `run_rpc_command_get` callers
- `cursorless-talon/src/spoken_forms.py:82` — `spoken_forms.json` loader (prior art for v2 push)
- `cursorless-talon/src/modifiers/scopes.py:5–6` — the static `cursorless_scope_type` registry list
