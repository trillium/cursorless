# Context Dump: Cursorless VisualizerWrapper DURING State Implementation

## Problem

We're implementing DURING state visualization for Cursorless test fixtures. The DURING state should show flash highlights (from `ide.flashes` in YAML fixture files) overlaid on the initial code state, displaying what targets are being referenced and modified during command execution.

## Current Issue

Flash decorations reference positions that exist in BOTH initial and final states. Some flashes point to positions that only exist in the final state (after text insertion), causing Shiki errors when we try to render them on the initial state code.

Example:

- Initial state line 4: `const values = [e]` (19 chars)
- Final state line 4: `const values = [e, f, x, z]` (28 chars)
- Flash tries to highlight chars 19-26, which don't exist in initial state

## Architecture

### Key Files Modified

**cursorless-org-docs package:**

1. `packages/cursorless-org-docs/src/plugins/recorded-tests-plugin.ts`
   - Parses `ide.flashes` from YAML and stores as `flashes` in TestCaseFixture
   - Added debug logging showing fixtures with flashes

2. `packages/cursorless-org-docs/src/docs/components/VisualizerWrapper.tsx`
   - Updated to use `flashes` field instead of `decorations`
   - Calls `convertFixtureStateWithFlashes()` to merge initial state + flashes
   - Added debug logging to track rendering

3. `packages/cursorless-org-docs/src/docs/components/fixtureAdapter.ts`
   - Added `convertFixtureStateWithFlashes()` function (line 266-342)
   - Currently has bounds checking to filter invalid flash positions
   - Combines initial state highlights with flash highlights

4. `packages/cursorless-org-docs/src/docs/components/types.ts`
   - Added flash selection types: `referenced`, `pendingModification0`, `pendingModification1`

5. `packages/cursorless-org-docs/src/docs/components/highlightColors.ts`
   - Added color definitions for flash styles

**test-case-component package:**

- Similar changes made to keep both packages in sync

## Test Fixture Structure

Example: `data/fixtures/recorded/visualized/bringFineAndPlexAndZipAfterItemEach.yml`

```yaml
initialState:
  documentContents: |+
    f
    x
    z

    const values = [e]
  marks:
    default.f: { start: { line: 0, character: 0 } }
    # ... more marks

finalState:
  documentContents: |+
    f
    x
    z

    const values = [e, f, x, z]

ide:
  flashes:
    - style: referenced
      range:
        {
          type: character,
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        }
    # ... 3 referenced flashes for f, x, z
    - style: pendingModification0
      range:
        { start: { line: 4, character: 16 }, end: { line: 4, character: 17 } }
    - style: pendingModification0
      range: {
          start: { line: 4, character: 19 },
          end: { line: 4, character: 26 },
        } # INVALID in initial state!
```

## Current Implementation

`convertFixtureStateWithFlashes()` in fixtureAdapter.ts:

1. Gets code from initial state
2. Converts initial state to highlights (selections, marks)
3. Iterates through flashes and:
   - Validates positions against initial state code length
   - Skips flashes with out-of-bounds positions
   - Converts valid flashes to highlights
4. Combines and flattens all highlights
5. Converts to Shiki decorations

## Debug Output

Plugin shows 3 fixtures with flashes loaded correctly:

```
[DEBUG] Fixture with 5 flashes: bringFineAndPlexAndZipAfterItemEach.yml
  Command: bring fine and plex and zip after item each
  Flash styles: referenced, referenced, referenced, pendingModification0, pendingModification0
```

DURING panel renders but is empty (after bounds checking was added).

## Solution Needed

The flashes seem to represent different moments in time:

1. `referenced` flashes - point to source items in initial state (valid)
2. `pendingModification0` at char 16-17 - points to `e` in initial state (valid)
3. `pendingModification0` at char 19-26 - points to insertion range in final state (INVALID for initial state)

We need to determine:

1. Should DURING state show initial code or some intermediate state?
2. Should we filter out future-only positions, or map them to valid positions?
3. Is there additional data in the fixture that tells us what code state to use for DURING?

## Relevant Code Locations

- VisualizerWrapper rendering: `packages/cursorless-org-docs/src/docs/components/VisualizerWrapper.tsx:85-115`
- Flash conversion: `packages/cursorless-org-docs/src/docs/components/fixtureAdapter.ts:266-342`
- Flash parsing: `packages/cursorless-org-docs/src/plugins/recorded-tests-plugin.ts:71-97`

## Next Steps

Need to understand the intended semantics of DURING state - should it show:

1. Initial code with valid flashes only?
2. Some intermediate code state?
3. Multiple moments in time?

## Task we are doing now

We are evaluating the Shiki Error:

```
ShikiError: Invalid decoration position {"line":4,"character":26}. Line 4 length: 19
    at normalizePosition (index.mjs:375:19)
    at eval (index.mjs:387:14)
    at Array.map (<anonymous>)
    at getContext (index.mjs:384:61)
    at Object.tokens (index.mjs:403:19)
    at codeToHast (index.mjs:1323:34)
    at codeToHtml (index.mjs:1597:27)
    at Object.codeToHtml (index.mjs:2039:37)
    at codeToHtml (index.mjs:2183:20)
```

This error is indicating we are trying to generate tokens outside of the range

that is leading us to note that we may be trying to highlight ranges improperly. Are the ranges on the initialState of the doc? are the on the finalState of the doc?

the relevant doc we're handling: @data/fixtures/recorded/visualized/bringFineAndPlexAndZipAfterItemEach.yml

Evaluate the code as it stands now and see how the error could have been generated. A failure state is skipping highlight ranges that don't work -- ALL the highlight ranges are 100% true, so if we fail to render them that is a clear signal our code is not working.
