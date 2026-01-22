# How to Add Tracked Properties to Recorded Test Fixtures

## Overview

This guide explains how to add new properties to Cursorless recorded test fixtures. Recorded fixtures are YAML files that capture the before/after state of commands for testing and documentation.

**Location**: `data/fixtures/recorded/` (3,286+ YAML files)

---

## Current Tracked Properties

### TestCaseSnapshot Interface

**File**: `packages/common/src/testUtil/TestCaseSnapshot.ts:13-27`

```typescript
export interface TestCaseSnapshot {
  documentContents: string; // ✅ Always captured
  selections: SelectionPlainObject[]; // ✅ Always captured (anchor/active positions)
  clipboard?: string; // ✅ Captured for clipboard actions
  visibleRanges?: RangePlainObject[]; // ⚠️ Captured but NOT asserted (see issue #160)
  marks?: SerializedMarks; // ✅ Hat positions (e.g., default.w)
  timeOffsetSeconds?: number; // ✅ Opt-in via extraSnapshotFields (only example in codebase)
  metadata?: unknown; // ✅ Custom data (rarely used)

  // Dynamic mark fields (e.g., thatMark, sourceMark)
  [K in `${StoredTargetKey}Mark`]?: TargetPlainObject[];
}
```

### Currently Used Config Options

Based on actual `config.json` files in the repo:

**`data/fixtures/recorded/decorations/config.json`**:

```json
{
  "isDecorationsTest": true
}
```

**`data/fixtures/recorded/hatTokenMap/config.json`**:

```json
{
  "isHatTokenMapTest": true
}
```

**`data/fixtures/recorded/actions/config.json`**:

```json
{
  "captureFinalThatMark": true
}
```

**Note**: While `extraSnapshotFields` is fully implemented and working (see `takeSnapshot.ts:57-68`), it's **not currently used** in any config files in the repo. The only property that checks `extraSnapshotFields` is `timeOffsetSeconds`, which was likely added for video calibration but isn't actively used in recorded tests.

### Example Fixture Format

```yaml
languageId: plaintext
command:
  version: 6
  spokenForm: bring line before whale
  action:
    name: replaceWithTarget
    source:
      type: primitive
      modifiers:
        - type: containingScope
          scopeType: { type: line }
    destination:
      type: primitive
      insertionMode: before
      target:
        type: primitive
        mark: { type: decoratedSymbol, symbolColor: default, character: w }
  usePrePhraseSnapshot: true
initialState:
  documentContents: |-
    hello world
    whatever now
  selections:
    - anchor: { line: 1, character: 12 }
      active: { line: 1, character: 12 }
  marks:
    default.w:
      start: { line: 0, character: 6 }
      end: { line: 0, character: 11 }
finalState:
  documentContents: |-
    whatever now
    hello world
    whatever now
  selections:
    - anchor: { line: 2, character: 12 }
      active: { line: 2, character: 12 }
```

---

## How Recording Works

### Recording Flow

```
Voice: "cursorless record"
  ↓
Select directory (e.g., actions/, languages/)
  ↓
Voice: "take funk air" (or any command)
  ↓
preCommandHook()
  ↓
takeSnapshot() → creates initialState
  ↓
Execute command
  ↓
postCommandHook()
  ↓
takeSnapshot() → creates finalState
  ↓
testCase.toYaml() → saves to data/fixtures/recorded/{dir}/{name}.yml
  ↓
Voice: "cursorless record" (stop)
```

### Key Components

1. **`TestCaseRecorder`** - `packages/test-case-recorder/src/TestCaseRecorder.ts`
   - Main recording orchestrator
   - Wraps command execution with hooks
   - Manages recording state

2. **`TestCase`** - `packages/test-case-recorder/src/TestCase.ts`
   - Represents a single test case
   - Calls `takeSnapshot()` for initial and final states
   - Serializes to YAML via `toYaml()`

3. **`takeSnapshot()`** - `packages/test-case-recorder/src/takeSnapshot.ts:18-71`
   - Captures current editor/IDE state
   - Returns a `TestCaseSnapshot` object
   - **This is where you add capture logic**

4. **`TestCaseSnapshot`** - `packages/common/src/testUtil/TestCaseSnapshot.ts`
   - Type definition for snapshot data
   - **This is where you add new fields**

5. **`runRecordedTest()`** - `packages/node-common/src/runRecordedTest.ts`
   - Test execution engine
   - Compares actual state to expected state
   - **This is where you add assertion logic**

---

## Step-by-Step: Adding a New Property

### Step 1: Add Field to `TestCaseSnapshot` Interface

**File**: `packages/common/src/testUtil/TestCaseSnapshot.ts`

Add your new property to the interface:

```typescript
export interface TestCaseSnapshot extends MarkKeys {
  documentContents: string;
  selections: SelectionPlainObject[];
  clipboard?: string;
  visibleRanges?: RangePlainObject[];
  marks?: SerializedMarks;
  timeOffsetSeconds?: number;
  metadata?: unknown;

  // Add your new property here:
  myNewProperty?: MyNewType;
}
```

**Tips**:

- Use optional (`?`) for properties that aren't always present
- Ensure the type is JSON-serializable (primitives, arrays, plain objects)
- Import types from `@cursorless/common` if needed

### Step 2: Capture the Property in `takeSnapshot()`

**File**: `packages/test-case-recorder/src/takeSnapshot.ts`

Add capture logic in the `takeSnapshot()` function:

```typescript
export async function takeSnapshot(
  storedTargets: StoredTargetMap | undefined,
  excludeFields: ExcludableSnapshotField[] = [],
  extraFields: ExtraSnapshotField[] = [],
  editor: TextEditor,
  ide: IDE,
  marks?: SerializedMarks,
  extraContext?: ExtraContext,
  metadata?: unknown,
) {
  const snapshot: TestCaseSnapshot = {
    documentContents: editor.document.getText(),
    selections: editor.selections.map(selectionToPlainObject),
  };

  // Existing capture logic...
  if (marks != null) {
    snapshot.marks = marks;
  }

  if (metadata != null) {
    snapshot.metadata = metadata;
  }

  if (!excludeFields.includes("clipboard")) {
    snapshot.clipboard = await ide.clipboard.readText();
  }

  if (!excludeFields.includes("visibleRanges")) {
    snapshot.visibleRanges = editor.visibleRanges.map(rangeToPlainObject);
  }

  // Add your capture logic here:
  if (!excludeFields.includes("myNewProperty")) {
    snapshot.myNewProperty = getMyNewProperty(editor, ide);
  }

  // ... rest of function
}
```

**Important**:

- Respect `excludeFields` to allow conditional capture
- Use `editor` for document/selection data
- Use `ide` for IDE-level data (clipboard, decorations, etc.)
- Make async calls if needed (snapshot function is async)

### Step 3: Add Exclusion Logic (Optional)

**File**: `packages/test-case-recorder/src/TestCase.ts:104-135`

If your property should only be captured for certain commands, add exclusion logic:

```typescript
private getExcludedFields(isInitialSnapshot: boolean) {
  const clipboardActions: ActionType[] = isInitialSnapshot
    ? ["pasteFromClipboard"]
    : ["copyToClipboard", "cutToClipboard"];

  const visibleRangeActions: ActionType[] = [
    "foldRegion",
    "unfoldRegion",
    "scrollToBottom",
    "scrollToCenter",
    "scrollToTop",
  ];

  // Add your action list here:
  const myNewPropertyActions: ActionType[] = [
    "actionThatNeedsIt",
    "anotherAction",
  ];

  const excludedFields = {
    clipboard: !clipboardActions.includes(this.command.action.name),
    visibleRanges: !visibleRangeActions.includes(this.command.action.name),
    thatMark: /* ... */,
    sourceMark: /* ... */,

    // Add your exclusion logic here:
    myNewProperty: !myNewPropertyActions.includes(this.command.action.name),
  };

  return unsafeKeys(excludedFields).filter((field) => excludedFields[field]);
}
```

**When to use exclusion logic**:

- Property is expensive to capture (e.g., large data structures)
- Property is only relevant for specific actions
- Property would add noise to most test fixtures

**Example**: Clipboard is excluded from initial state unless the command is `pasteFromClipboard`

### Step 4: Make Property Opt-In via Config (Optional)

For properties that should be opt-in (like `timeOffsetSeconds`), use `extraSnapshotFields`.

**Infrastructure Status**: ✅ **The `extraSnapshotFields` mechanism is fully implemented and working**, though only one property (`timeOffsetSeconds`) currently uses it in the codebase.

**Implementation**:

1. The type is already defined in `TestCaseSnapshot.ts`:

   ```typescript
   export type ExtraSnapshotField = keyof TestCaseSnapshot;
   ```

2. `TestCaseRecorder` reads it from config (line 213, 228):

   ```typescript
   ((extraSnapshotFields = []), // default value
     (this.extraSnapshotFields = extraSnapshotFields)); // stored
   ```

3. It's passed to `takeSnapshot()` (line 151):
   ```typescript
   this.active ? this.extraSnapshotFields : undefined;
   ```

**To use it for your property**:

**Check for inclusion in `takeSnapshot()`**:

```typescript
if (extraFields.includes("myNewProperty")) {
  snapshot.myNewProperty = getMyNewProperty(editor, ide);
}
```

**Enable via config.json**:

Create or edit `data/fixtures/recorded/{directory}/config.json`:

```json
{
  "extraSnapshotFields": ["myNewProperty"]
}
```

**Working Example**: The `timeOffsetSeconds` property (`takeSnapshot.ts:57-68`):

```typescript
if (extraFields.includes("timeOffsetSeconds")) {
  const startTimestamp = extraContext?.startTimestamp;
  if (startTimestamp == null) {
    throw new Error(
      "No start timestamp provided but time offset was requested",
    );
  }
  const offsetNanoseconds = process.hrtime.bigint() - startTimestamp;
  snapshot.timeOffsetSeconds = hrtimeBigintToSeconds(offsetNanoseconds);
}
```

Though no config files currently use it, this pattern is tested and functional.

### Step 5: Update Test Assertion Logic

**File**: `packages/node-common/src/runRecordedTest.ts`

Add assertion logic to verify your new property during test execution:

```typescript
// Example: Compare expected vs actual state
if (expectedFinalState.myNewProperty !== undefined) {
  assert.deepStrictEqual(
    actualFinalState.myNewProperty,
    expectedFinalState.myNewProperty,
    "myNewProperty mismatch",
  );
}
```

**Important**:

- Handle undefined/null values gracefully
- Use appropriate comparison (deep equal for objects/arrays)
- Provide clear error messages for test failures

### Step 6: Update Existing Fixtures (if needed)

If you're adding a property that should be present in existing fixtures:

**Option A: Bulk Update**

Run the fixture auto-updater:

1. Open VS Code launch configurations
2. Run **"VSCode: Update test fixtures"**
3. Set `CURSORLESS_TEST_UPDATE_FIXTURES=true`
4. Tests will re-run and overwrite fixtures with new data

**Option B: Transform Script**

Use the transform script for custom logic:

```bash
pnpm transform-recorded-tests --custom path/to/transform.ts
```

**Option C: Manual Re-recording**

Re-record specific tests by:

1. Delete the old fixture file
2. Say "cursorless record"
3. Re-execute the voice command
4. Say "cursorless record" to stop

---

## Recording Modes and Config Options

### Recording Commands

Different recording commands capture different properties:

| Command                        | Extra Properties                               |
| ------------------------------ | ---------------------------------------------- |
| `cursorless record`            | Standard (selections, marks, documentContents) |
| `cursorless record highlights` | `decorations` (flash highlights)               |
| `cursorless record error`      | `errors` (expected errors)                     |
| `cursorless record that mark`  | `thatMark` (that mark behavior)                |
| `cursorless record navigation` | Full navigation map (all hats)                 |

### Config File Options

**Location**: `data/fixtures/recorded/{directory}/config.json`

```json
{
  "isHatTokenMapTest": false,
  "isDecorationsTest": false,
  "isSilent": false,
  "extraSnapshotFields": [],
  "showCalibrationDisplay": false,
  "recordErrors": false,
  "captureFinalThatMark": false
}
```

**Options**:

- `isHatTokenMapTest` - Capture full hat map for navigation tests
- `isDecorationsTest` - Record decoration/highlight states
- `isSilent` - Suppress recording notifications
- `extraSnapshotFields` - Opt-in properties to capture
- `showCalibrationDisplay` - Flash screen for timing calibration
- `recordErrors` - Capture expected errors
- `captureFinalThatMark` - Track "that" mark in final state

**Config inheritance**: Config files are merged from parent directories, so you can set defaults at the root level.

---

## Example: Adding Selection Metadata

Let's walk through a complete example of adding selection metadata tracking.

### Goal

Track whether each selection is forward or backward, and its length.

### Step 1: Add Type and Interface

**File**: `packages/common/src/testUtil/TestCaseSnapshot.ts`

```typescript
export interface SelectionMetadata {
  direction: "forward" | "backward";
  length: number;
}

export interface TestCaseSnapshot extends MarkKeys {
  documentContents: string;
  selections: SelectionPlainObject[];
  selectionMetadata?: SelectionMetadata[]; // Add this
  // ... other fields
}
```

### Step 2: Capture Logic

**File**: `packages/test-case-recorder/src/takeSnapshot.ts`

```typescript
export async function takeSnapshot() {
// ... parameters
  const snapshot: TestCaseSnapshot = {
    documentContents: editor.document.getText(),
    selections: editor.selections.map(selectionToPlainObject),
  };

  // Add capture logic
  if (!excludeFields.includes("selectionMetadata")) {
    snapshot.selectionMetadata = editor.selections.map((sel) => {
      const anchorOffset = editor.document.offsetAt(sel.anchor);
      const activeOffset = editor.document.offsetAt(sel.active);
      return {
        direction: activeOffset >= anchorOffset ? "forward" : "backward",
        length: Math.abs(activeOffset - anchorOffset),
      };
    });
  }

  // ... rest of function
}
```

### Step 3: Make It Opt-In

**File**: `data/fixtures/recorded/selections/config.json`

```json
{
  "extraSnapshotFields": ["selectionMetadata"]
}
```

### Step 4: Add Assertion

**File**: `packages/node-common/src/runRecordedTest.ts`

```typescript
if (expectedFinalState.selectionMetadata !== undefined) {
  assert.deepStrictEqual(
    actualFinalState.selectionMetadata,
    expectedFinalState.selectionMetadata,
    "Selection metadata mismatch",
  );
}
```

### Step 5: Record a Test

```
Say: "cursorless record"
Pick: "selections" directory
Say: "take air" (or any command)
Say: "cursorless record" (stop)
```

Result: `data/fixtures/recorded/selections/takeAir.yml` now includes:

```yaml
finalState:
  selections:
    - anchor: { line: 0, character: 0 }
      active: { line: 0, character: 5 }
  selectionMetadata:
    - direction: forward
      length: 5
```

---

## Debugging Tips

### 1. Check Snapshot Capture

Add console.log in `takeSnapshot()`:

```typescript
console.log("Capturing snapshot:", snapshot);
```

Run a recording and check the terminal output.

### 2. Inspect Generated YAML

After recording, open the generated `.yml` file and verify your property appears:

```bash
code data/fixtures/recorded/{directory}/{testName}.yml
```

### 3. Test Assertion

Run a single test to verify assertion logic:

```bash
pnpm test -- --filter="testName"
```

### 4. Update Mode

If tests fail after adding a property, use update mode to regenerate fixtures:

```bash
CURSORLESS_TEST_UPDATE_FIXTURES=true pnpm test
```

---

## Common Pitfalls

### 1. Non-Serializable Types

**Problem**: Your type contains functions, circular references, or other non-JSON data.

**Solution**: Convert to plain objects using serialization helpers:

- `rangeToPlainObject()`
- `selectionToPlainObject()`
- `marksToPlainObject()`

### 2. Forgetting Exclusion Logic

**Problem**: Property is captured for all tests, adding noise.

**Solution**: Add exclusion logic in `getExcludedFields()` to limit capture to relevant actions.

### 3. Missing Assertion

**Problem**: Property is captured but never verified during tests.

**Solution**: Add assertion logic in `runRecordedTest()` to fail tests when property doesn't match.

### 4. Breaking Existing Tests

**Problem**: Adding a required (non-optional) field breaks all existing fixtures.

**Solution**:

- Always make new fields optional (`?`)
- Use update mode to regenerate existing fixtures
- Or use `extraSnapshotFields` to make it opt-in

### 5. Async Data Race

**Problem**: Property depends on async data that isn't available yet.

**Solution**: Use `await` in `takeSnapshot()` to ensure data is ready:

```typescript
snapshot.myProperty = await ide.someAsyncOperation();
```

---

## Related Documentation

- `FIXTURE-GENERATION-TOOLING.md` - Overview of fixture generation systems
- `test-case-recorder.md` - How to record test cases
- `RECORDED-FIXTURES-VS-SCOPE-FILES.md` - Comparison of fixture types
- `packages/cursorless-org-docs/src/docs/contributing/test-case-recorder.md` - User-facing docs

---

## Summary Checklist

When adding a new tracked property:

- [ ] Add field to `TestCaseSnapshot` interface (optional type)
- [ ] Add capture logic in `takeSnapshot()`
- [ ] Add exclusion logic in `getExcludedFields()` (if needed)
- [ ] Add to `ExtraSnapshotField` type (if opt-in)
- [ ] Add assertion logic in `runRecordedTest()`
- [ ] Test by recording a new fixture
- [ ] Update existing fixtures (if needed)
- [ ] Document the new property in this file

---

## Architecture Reference

```
TestCaseRecorder (orchestrator)
    ↓
  wraps CommandRunner
    ↓
  preCommandHook()
    ↓
  TestCase.recordInitialState()
    ↓
  takeSnapshot() ← YOU ADD CAPTURE LOGIC HERE
    ↓
  returns TestCaseSnapshot ← YOU ADD FIELDS HERE
    ↓
  Execute command
    ↓
  TestCase.recordFinalState()
    ↓
  takeSnapshot()
    ↓
  TestCase.toYaml()
    ↓
  Write YAML file to disk
    ↓
  runRecordedTest() ← YOU ADD ASSERTION LOGIC HERE
    ↓
  Compare expected vs actual state
```

---

## Verification Status

Based on code inspection (as of this writing):

### ✅ Confirmed Working

These mechanisms are **actively used** and **verified** by existing config files:

| Mechanism              | Config File               | Property Tracked         |
| ---------------------- | ------------------------- | ------------------------ |
| `isDecorationsTest`    | `decorations/config.json` | Decoration states        |
| `isHatTokenMapTest`    | `hatTokenMap/config.json` | Full hat token map       |
| `captureFinalThatMark` | `actions/config.json`     | That mark in final state |

### ✅ Implemented but Unused

These mechanisms are **fully implemented** in code but **not currently used** in any config files:

| Mechanism                          | Implementation                                         | Notes                                                   |
| ---------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| `extraSnapshotFields`              | `takeSnapshot.ts:57-68`, `TestCaseRecorder.ts:213,228` | Works for `timeOffsetSeconds`, ready for new properties |
| `showCalibrationDisplay`           | `TestCaseRecorder.ts:214,241-268`                      | Timing calibration for video recording                  |
| `recordErrors` (aka `isErrorTest`) | `TestCaseRecorder.ts:215,452-458`                      | Capture expected errors                                 |
| `isSilent`                         | `TestCaseRecorder.ts:212,363`                          | Suppress recording notifications                        |

### Properties Without Config Support

These properties are **always captured** (no config needed):

- `documentContents` - Always captured
- `selections` - Always captured
- `marks` - Captured when command references marks
- `clipboard` - Captured based on action type (exclusion logic)
- `visibleRanges` - Always captured but not asserted

### Config File Locations

Only **3 config files** exist in the entire repo:

1. `data/fixtures/recorded/decorations/config.json`
2. `data/fixtures/recorded/hatTokenMap/config.json`
3. `data/fixtures/recorded/actions/config.json`

All other test directories use default settings.

---

## Questions?

If you're unsure about:

- **What property to add**: Check existing `TestCaseSnapshot` fields for patterns
- **Where to capture data**: Look at `takeSnapshot()` implementation
- **How to serialize**: Use helpers from `@cursorless/common/util/toPlainObject`
- **When to exclude**: Look at `getExcludedFields()` examples in `TestCase.ts`
- **Whether a mechanism works**: Check the "Verification Status" section above
