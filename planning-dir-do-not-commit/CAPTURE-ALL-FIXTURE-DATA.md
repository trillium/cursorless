# Capturing All Possible Fixture Data

## Goal

This guide shows how to configure recording to capture **every possible piece of data** in test fixtures.

---

## Complete Data Inventory

### TestCaseSnapshot Properties (Per State)

These are captured for both `initialState` and `finalState`:

| Property                | Always Captured           | Notes                                         |
| ----------------------- | ------------------------- | --------------------------------------------- |
| `documentContents`      | ✅ Yes                    | The full text of the document                 |
| `selections`            | ✅ Yes                    | Cursor positions (anchor/active)              |
| `marks`                 | Conditional               | Hat positions referenced in command           |
| `clipboard`             | Conditional               | Based on action type (see exclusion logic)    |
| `visibleRanges`         | ✅ Yes (but not asserted) | Currently captured but not validated in tests |
| `timeOffsetSeconds`     | Opt-in                    | Requires `extraSnapshotFields`                |
| `thatMark`              | Conditional               | Stored "that" target                          |
| `sourceMark`            | Conditional               | Stored "source" target                        |
| `instanceReferenceMark` | Conditional               | Stored "instanceReference" target             |
| `keyboardMark`          | Conditional               | Stored "keyboard" target                      |
| `metadata`              | Rarely used               | Custom JSON-serializable data                 |

### TestCaseFixture Top-Level Properties

| Property                    | Always Captured | Notes                                       |
| --------------------------- | --------------- | ------------------------------------------- |
| `languageId`                | ✅ Yes          | Programming language                        |
| `command`                   | ✅ Yes          | Full command structure + spoken form        |
| `initialState`              | ✅ Yes          | State before command                        |
| `finalState`                | ✅ Yes          | State after command                         |
| `returnValue`               | ✅ Yes          | Command return value                        |
| `fallback`                  | Conditional     | If command uses fallback                    |
| `thrownError`               | Conditional     | If recording error tests                    |
| `ide`                       | Conditional     | SpyIDE data (messages, flashes, highlights) |
| `spokenFormError`           | Conditional     | If spoken form generation has issues        |
| `marksToCheck`              | Conditional     | For hatTokenMap tests                       |
| `focusedElementType`        | Conditional     | If not default textEditor                   |
| `postEditorOpenSleepTimeMs` | Rarely used     | Timing delays                               |
| `postCommandSleepTimeMs`    | Rarely used     | Timing delays                               |

### IDE State (via SpyIDE)

Captured in `ide` field when `isDecorationsTest: true`:

| Property     | Type                     | Description                                   |
| ------------ | ------------------------ | --------------------------------------------- |
| `messages`   | `Message[]`              | User notifications/messages                   |
| `flashes`    | `PlainFlashDescriptor[]` | Flash decorations (e.g., deletion highlights) |
| `highlights` | `PlainHighlight[]`       | Highlight decorations by ID                   |

---

## Configuration for Maximum Data Capture

### Option 1: Root-Level Config (Affects All Tests)

Create `data/fixtures/recorded/config.json`:

```json
{
  "isDecorationsTest": true,
  "captureFinalThatMark": true,
  "extraSnapshotFields": ["timeOffsetSeconds"],
  "showCalibrationDisplay": false,
  "recordErrors": false,
  "isSilent": false
}
```

### Option 2: Directory-Specific Config

For specific test directories, create `data/fixtures/recorded/{directory}/config.json`.

**Example for comprehensive capture**:

```json
{
  "isHatTokenMapTest": false,
  "isDecorationsTest": true,
  "captureFinalThatMark": true,
  "extraSnapshotFields": ["timeOffsetSeconds"],
  "showCalibrationDisplay": false,
  "recordErrors": false,
  "isSilent": false
}
```

### Option 3: Programmatic Recording

If you're calling recording programmatically via VSCode commands:

```typescript
await vscode.commands.executeCommand("cursorless.recordTestCase", {
  directory: "path/to/directory",
  isDecorationsTest: true,
  captureFinalThatMark: true,
  extraSnapshotFields: ["timeOffsetSeconds"],
  showCalibrationDisplay: false,
  recordErrors: false,
  isSilent: false,
});
```

---

## Config Options Explained

### Core Capture Options

#### `isDecorationsTest: true`

**What it captures**: IDE decorations (flashes and highlights)

**Location in fixture**: `ide.flashes`, `ide.highlights`

**Use case**: Testing visual feedback like deletion highlights, flash animations

**Example output**:

```yaml
ide:
  flashes:
    - style: referencedFlash
      range:
        start: { line: 0, character: 0 }
        end: { line: 0, character: 5 }
  highlights:
    - highlightId: pendingModification
      ranges:
        - start: { line: 1, character: 0 }
          end: { line: 1, character: 10 }
```

#### `isHatTokenMapTest: true`

**What it captures**: Full hat token map (all decorated symbols)

**Location in fixture**: `initialState.marks`, `finalState.marks`, `marksToCheck`

**Use case**: Testing that hat positions update correctly after edits

**Example output**:

```yaml
marksToCheck: ["default.a", "default.b"]
initialState:
  marks:
    default.a:
      start: { line: 0, character: 0 }
      end: { line: 0, character: 5 }
    default.b:
      start: { line: 1, character: 0 }
      end: { line: 1, character: 3 }
```

#### `captureFinalThatMark: true`

**What it captures**: The "that" mark in final state

**Location in fixture**: `finalState.thatMark`, `finalState.sourceMark`

**Use case**: Testing that "that" and "source" marks are properly updated

**Example output**:

```yaml
finalState:
  thatMark:
    - contentRange:
        start: { line: 0, character: 0 }
        end: { line: 0, character: 5 }
```

#### `extraSnapshotFields: ["timeOffsetSeconds"]`

**What it captures**: Timing data relative to recording start

**Location in fixture**: `initialState.timeOffsetSeconds`, `finalState.timeOffsetSeconds`

**Use case**: Video calibration, performance testing

**Example output**:

```yaml
initialState:
  timeOffsetSeconds: 0.0
finalState:
  timeOffsetSeconds: 0.123
```

### Auxiliary Options

#### `showCalibrationDisplay: true`

**What it does**: Flashes the entire screen white before recording

**Purpose**: Provides a visual timestamp for syncing video recordings

**Duration**: 50ms flash

**Use case**: Creating demo videos with synchronized code changes

#### `recordErrors: true`

**What it captures**: Expected errors instead of successful commands

**Location in fixture**: `thrownError`

**Use case**: Testing error handling

**Example output**:

```yaml
thrownError:
  name: "NoContainingScopeError"
```

#### `isSilent: true`

**What it does**: Suppresses "Test case saved" notifications

**Use case**: Bulk recording without UI interruptions

---

## What Gets Excluded by Default

### Clipboard Exclusions

**Initial state**: Clipboard is excluded UNLESS action is `pasteFromClipboard`

**Final state**: Clipboard is excluded UNLESS action is `copyToClipboard` or `cutToClipboard`

**Reason**: Reduces noise in fixtures

### Mark Exclusions

**thatMark/sourceMark in initial state**: Only captured if command references them

**thatMark/sourceMark in final state**: Only captured if `captureFinalThatMark: true`

**Reason**: Most commands don't care about these marks

### Visible Ranges

**Status**: Always captured but NOT asserted in tests

**Reason**: Known issue ([#160](https://github.com/cursorless-dev/cursorless/issues/160))

**Location in code**: `takeSnapshot.ts:45-47`

---

## Recommended Config for Your Use Case

Since you want **"literally all the data possible"**, here's the recommended config:

### `data/fixtures/recorded/config.json`

```json
{
  "isDecorationsTest": true,
  "captureFinalThatMark": true,
  "extraSnapshotFields": ["timeOffsetSeconds"]
}
```

### What This Captures

✅ **Always captured** (no config needed):

- Document contents (before/after)
- Selections (cursor positions)
- Marks referenced in command
- Language ID
- Command structure
- Return value
- Visible ranges (captured but not asserted)

✅ **Enabled by config**:

- IDE decorations (flashes, highlights)
- That/source marks in final state
- Timing data (timeOffsetSeconds)

✅ **Conditionally captured** (based on action type):

- Clipboard contents
- Stored target marks (that, source, instanceReference, keyboard)

❌ **Cannot currently be captured** (would require code changes):

- Full hat token map (use `isHatTokenMapTest: true` if needed, but changes test behavior)
- Custom metadata (requires modifying recording code)

---

## Limitations & Caveats

### 1. Hat Token Map Test Mode

Setting `isHatTokenMapTest: true` **changes test behavior**:

- Captures ALL hats, not just referenced ones
- Requires a follow-up command to filter marks
- Changes recording workflow

**Recommendation**: Don't use for normal recording unless specifically testing hat updates

### 2. Visible Ranges Not Asserted

`visibleRanges` is captured but **never validated** during test execution.

**Why**: Known issue #160

**Impact**: If you care about scroll position, you'll need to add assertion logic

### 3. Error Tests

Setting `recordErrors: true` changes recording mode to **only capture errors**.

**Workflow**: Command must throw an error, or recording fails

**Use case**: Specific to error testing, not general capture

### 4. Performance

Capturing decorations (`isDecorationsTest: true`) adds overhead:

- Spy wrappers around IDE calls
- Extra serialization

**Impact**: Minimal for most cases, but could slow bulk recording

---

## How to Apply Config

### Method 1: Create Config File

```bash
# Create root config
cat > data/fixtures/recorded/config.json << 'EOF'
{
  "isDecorationsTest": true,
  "captureFinalThatMark": true,
  "extraSnapshotFields": ["timeOffsetSeconds"]
}
EOF
```

### Method 2: Per-Directory

```bash
# Create directory-specific config
mkdir -p data/fixtures/recorded/my-tests
cat > data/fixtures/recorded/my-tests/config.json << 'EOF'
{
  "isDecorationsTest": true,
  "captureFinalThatMark": true,
  "extraSnapshotFields": ["timeOffsetSeconds"]
}
EOF
```

### Method 3: Config Inheritance

Configs are **merged** from parent directories:

```
data/fixtures/recorded/
├── config.json              # Base config
└── actions/
    ├── config.json          # Merged with base
    └── clipboard/
        └── config.json      # Merged with actions + base
```

---

## Verification

After creating config, verify it's working:

### 1. Record a Test

```
Voice: "cursorless record"
Pick: Directory with your config
Voice: "take air" (or any command)
Voice: "cursorless record" (stop)
```

### 2. Check Generated Fixture

```bash
# Open the generated file
code data/fixtures/recorded/{directory}/{testName}.yml
```

### 3. Verify Properties Present

Look for:

- `ide` field (decorations)
- `finalState.thatMark` (if applicable)
- `timeOffsetSeconds` in states

**Example fixture with all data**:

```yaml
languageId: typescript
command:
  version: 6
  spokenForm: take air
  action: { ... }
initialState:
  documentContents: "hello world"
  selections:
    - anchor: { line: 0, character: 0 }
      active: { line: 0, character: 5 }
  marks:
    default.a:
      start: { line: 0, character: 0 }
      end: { line: 0, character: 5 }
  visibleRanges:
    - start: { line: 0, character: 0 }
      end: { line: 10, character: 0 }
  timeOffsetSeconds: 0.0
finalState:
  documentContents: "world"
  selections:
    - anchor: { line: 0, character: 0 }
      active: { line: 0, character: 0 }
  thatMark:
    - contentRange:
        start: { line: 0, character: 0 }
        end: { line: 0, character: 5 }
  timeOffsetSeconds: 0.085
ide:
  messages: []
  flashes:
    - style: justAdded
      range:
        start: { line: 0, character: 0 }
        end: { line: 0, character: 5 }
  highlights:
    - highlightId: pendingModification
      ranges:
        - start: { line: 0, character: 0 }
          end: { line: 0, character: 5 }
returnValue: null
```

---

## Troubleshooting

### Config Not Taking Effect

**Check**:

1. JSON syntax is valid (use `jq` to verify)
2. Config file is in correct directory
3. Recording is happening in/under config directory
4. Restart extension after config changes

### Missing Properties

**Check**:

1. `isDecorationsTest: true` for `ide` field
2. `captureFinalThatMark: true` for `thatMark`/`sourceMark`
3. `extraSnapshotFields` includes property name
4. Property is relevant to command (e.g., clipboard for copy actions)

### Fixture Too Large

If capturing everything creates huge files:

1. Use directory-specific configs
2. Disable `timeOffsetSeconds` if not needed
3. Disable `isDecorationsTest` for non-visual tests

---

## Summary

### Minimal Config for Maximum Data

```json
{
  "isDecorationsTest": true,
  "captureFinalThatMark": true,
  "extraSnapshotFields": ["timeOffsetSeconds"]
}
```

This captures:

- ✅ All document/selection data (always)
- ✅ IDE decorations (flashes, highlights)
- ✅ That/source marks in final state
- ✅ Timing information
- ✅ All conditional data (clipboard, marks, etc.)

### What You Can't Capture (Without Code Changes)

- Full hat map (unless using `isHatTokenMapTest: true`)
- Custom metadata (requires code modification)
- Properties not defined in `TestCaseSnapshot`

### Next Steps

1. Create `data/fixtures/recorded/config.json` with above config
2. Record a test to verify
3. Check generated fixture has all expected fields
4. If missing data, refer to "Troubleshooting" section
