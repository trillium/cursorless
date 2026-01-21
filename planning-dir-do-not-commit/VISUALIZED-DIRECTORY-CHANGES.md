# Visualized Directory Integration

## Changes Made

Updated `packages/cursorless-org-docs/src/plugins/recorded-tests-plugin.ts` to:

1. **Filter to visualized directory only**
2. **Transform new `ide.flashes` format to old `decorations` format**

---

## What Changed

### 1. Directory Filtering

```typescript
// Only load tests from the visualized directory
const visualizedTests = getRecordedTestPaths().filter((test) =>
  test.path.includes(path.sep + "visualized" + path.sep),
);
```

**Before**: Loaded all 3,286+ recorded test fixtures from entire `data/fixtures/recorded/` tree

**After**: Only loads fixtures from `data/fixtures/recorded/visualized/` directory

**Current files** (3 total):

- `bringAirAndBatAndCap.yml`
- `bringAirAndBatAndCap2.yml`
- `bringEachAndFineAndGust.yml`

### 2. Data Format Transformation

```typescript
// Transform ide.flashes to decorations format for visualization
let decorations: TestCaseFixture["decorations"] = undefined;
if (data.ide?.flashes) {
  decorations = data.ide.flashes.map((flash: any) => {
    const range = flash.range;
    return {
      name: flash.style,
      type: range.type || "character",
      start: range.start || { line: range.start, character: 0 },
      end: range.end || { line: range.end, character: 0 },
    };
  });
} else if (data.decorations) {
  // Fallback to old decorations format if present
  decorations = data.decorations;
}
```

**New format** (from fixtures with `isDecorationsTest: true`):

```yaml
ide:
  flashes:
    - style: referenced
      range:
        type: character
        start: { line: 0, character: 0 }
        end: { line: 0, character: 1 }
    - style: pendingModification0
      range:
        type: character
        start: { line: 2, character: 0 }
        end: { line: 2, character: 5 }
```

**Old format** (expected by VisualizerWrapper):

```typescript
decorations: [
  {
    name: "referenced",
    type: "character",
    start: { line: 0, character: 0 },
    end: { line: 0, character: 1 },
  },
  {
    name: "pendingModification0",
    type: "character",
    start: { line: 2, character: 0 },
    end: { line: 2, character: 5 },
  },
];
```

---

## Why These Changes

### Problem 1: Too Many Fixtures

Loading all 3,286+ test fixtures was:

- Slow to build
- Large bundle size
- Unnecessary for visualization purposes

### Problem 2: Format Mismatch

The new comprehensive config captures data in `ide.flashes` format, but the visualizer expects the old `decorations` format.

### Solution

1. **Filter**: Only load fixtures explicitly created for visualization
2. **Transform**: Convert new format to old format automatically

---

## How It Works

### Data Flow

```
YAML File (data/fixtures/recorded/visualized/*.yml)
  ↓
recorded-tests-plugin.ts (filters + transforms)
  ↓
TestCaseFixture (with decorations field)
  ↓
VisualizerWrapper.tsx (renders BEFORE/DURING/AFTER)
  ↓
Display on website
```

### Highlight Visualization

The `decorations` field is used to create the "DURING" state showing:

1. **Referenced ranges** (source targets being copied/moved)
   - Style: `referenced`
   - Example: The `e`, `f`, `g` tokens in "bring each and fine and gust"

2. **Pending modifications** (destination targets)
   - Style: `pendingModification0`, `pendingModification1`, etc.
   - Example: The insertion point where text will be pasted

---

## Current State

### Fixtures in visualized/

| File                          | Command                        | Highlights Captured            |
| ----------------------------- | ------------------------------ | ------------------------------ |
| `bringAirAndBatAndCap.yml`    | "bring air and bat and cap"    | ❌ No (recorded before config) |
| `bringAirAndBatAndCap2.yml`   | Unknown                        | Unknown                        |
| `bringEachAndFineAndGust.yml` | "bring each and fine and gust" | ✅ Yes (5 flashes)             |

### Config Status

**Active config**: `data/fixtures/recorded/config.json`

```json
{
  "isDecorationsTest": true,
  "captureFinalThatMark": true,
  "extraSnapshotFields": ["timeOffsetSeconds"]
}
```

**Applies to**: All new recordings in `data/fixtures/recorded/` and subdirectories

---

## Testing

### Verify Plugin Loading

After restarting the dev server, check console output:

```
Loaded 3 recorded test fixtures from visualized/ directory for 1 languages
  plaintext: 3 fixtures
```

### Verify Decorations

Check that fixtures with `ide.flashes` are transformed:

```typescript
// In browser console or React DevTools
console.log(fixturesByLanguage.plaintext[2].decorations);
// Should show array of decoration objects with name, type, start, end
```

---

## Adding More Visualized Tests

### Recording New Tests

1. **Record in visualized directory**:

   ```
   Voice: "cursorless record"
   Pick: "visualized" directory
   Voice: <your command>
   Voice: "cursorless record" (stop)
   ```

2. **Verify highlights captured**:

   ```bash
   cat data/fixtures/recorded/visualized/<your-test>.yml | grep -A 20 "ide:"
   ```

3. **Restart dev server** to reload fixtures

### Manual Creation

If creating fixtures manually, use this format:

```yaml
languageId: plaintext
command:
  version: 7
  spokenForm: your command here
  action: { ... }
initialState:
  documentContents: "..."
  selections: [...]
  marks: { ... }
finalState:
  documentContents: "..."
  selections: [...]
ide:
  flashes:
    - style: referenced
      range:
        type: character
        start: { line: 0, character: 0 }
        end: { line: 0, character: 5 }
```

---

## Troubleshooting

### Decorations Not Showing

**Symptoms**: "DURING" state doesn't appear in visualization

**Check**:

1. Fixture has `ide.flashes` field: `grep -A 10 "ide:" <file>.yml`
2. Plugin transformation is working: Check browser console for errors
3. VisualizerWrapper is receiving decorations: Use React DevTools

### Wrong Fixtures Loading

**Symptoms**: Seeing tests from other directories

**Check**:

1. Filter logic is correct: `test.path.includes(path.sep + "visualized" + path.sep)`
2. File is actually in visualized/: `ls data/fixtures/recorded/visualized/`

### Plugin Not Loading

**Symptoms**: No fixtures available on website

**Check**:

1. Plugin is registered in Docusaurus config
2. Build logs show fixture loading: "Loaded X recorded test fixtures..."
3. No YAML parsing errors in console

---

## Future Enhancements

### Potential Improvements

1. **Highlight types**: Support `ide.highlights` in addition to `ide.flashes`
2. **Configurable directory**: Allow specifying which directories to load via plugin options
3. **Performance**: Lazy load fixtures on demand rather than at build time
4. **Type safety**: Add proper TypeScript types for flash/decoration transformation

### Type Definition Updates Needed

If we want full type safety, update `TestCaseFixture` interface to support new format:

```typescript
export interface TestCaseFixture {
  languageId: string;
  command?: { spokenForm: string };
  initialState: CursorlessFixtureState;
  finalState: CursorlessFixtureState;
  // Old format (deprecated but still supported)
  decorations?: Array<{
    name?: string;
    type: string;
    start: { line: number; character: number };
    end: { line: number; character: number };
  }>;
  // New format (preferred)
  ide?: {
    flashes?: Array<{
      style: string;
      range: {
        type: "character" | "line";
        start: { line: number; character: number } | number;
        end: { line: number; character: number } | number;
      };
    }>;
    highlights?: Array<{
      highlightId: string;
      ranges: Array<{...}>;
    }>;
  };
}
```

---

## Related Files

- **Plugin**: `packages/cursorless-org-docs/src/plugins/recorded-tests-plugin.ts`
- **Visualizer**: `packages/cursorless-org-docs/src/docs/components/VisualizerWrapper.tsx`
- **Config**: `data/fixtures/recorded/config.json`
- **Fixtures**: `data/fixtures/recorded/visualized/*.yml`
- **Docs**:
  - `planning-dir-do-not-commit/CAPTURE-ALL-FIXTURE-DATA.md`
  - `planning-dir-do-not-commit/HOW-TO-ADD-TRACKED-PROPERTIES-TO-FIXTURES.md`
  - `planning-dir-do-not-commit/QUICK-REF-MAXIMUM-CAPTURE.md`

---

## Summary

✅ **Plugin updated** to load only visualized directory fixtures
✅ **Format transformation** converts `ide.flashes` to `decorations`
✅ **Backward compatible** with old `decorations` format
✅ **Ready to use** for new recorded test visualizations

Next step: Restart dev server and verify fixtures load correctly!
