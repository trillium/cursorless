# Fixture Generation Tooling Documentation

## Overview

Cursorless uses two primary types of test fixtures:

1. **.scope files** - Test scope definitions for language queries (in `data/fixtures/scopes/`)
2. **Recorded test fixtures** - Command execution tests (in `data/fixtures/recorded/`)

Both are **automatically generated** using voice commands and update mechanisms. Manual editing is discouraged.

---

## .scope File Generation

### Generation Method: **Automated** (via bulk recorder + auto-update)

### Complete Workflow

```
Developer Decision: "We need to add a new scope type"
  ↓
Say "cursorless record scope" (in debug mode)
  ↓
Select target language from quick pick
  ↓
System creates temporary file with facet slots
  (e.g., "Fill in code example for xmlBothTags.domain")
  ↓
Developer fills in code examples for each facet
  ↓
Say "cursorless save scope" to save
  ↓
File saved to data/fixtures/scopes/{language}/{scopeType}.scope
  (Contains code + visual markers, but ranges are EMPTY)
  ↓
Developer implements tree-sitter patterns in queries/{language}/*.scm
  ↓
Run "Update fixtures subset" launch configuration
  (Sets CURSORLESS_TEST_UPDATE_FIXTURES=true)
  ↓
Test runner executes, tree-sitter queries populate ranges
  ↓
.scope file automatically updated with correct ranges
  ↓
Visual markers (>, <) generated from computed ranges
  ↓
File ready for consumption by ScopeVisualizer
```

### Key Quote from Documentation

> "The format is automatically generated, so you shouldn't need to edit it yourself. The test harness will generate the comments and markers based on the ranges you select."
>
> — `packages/cursorless-org-docs/src/docs/contributing/scope-test-format.md`

### Tools Unique to .scope Files

#### 1. **Bulk Scope Recorder** (`cursorless.recordScopeTests.showUnimplementedFacets`)

- **Command**: "cursorless record scope"
- **Location**: Registered in `packages/cursorless-vscode/package.json`
- **Purpose**: Creates template files with slots for all unimplemented facets
- **Input**: Language selection
- **Output**: Temporary `.scope` file with empty ranges

#### 2. **Scope Test Saver** (`cursorless.recordScopeTests.saveActiveDocument`)

- **Command**: "cursorless save scope"
- **Purpose**: Saves filled-in scope test to `data/fixtures/scopes/`
- **Output**: `.scope` file with code examples but empty ranges

#### 3. **Tree-sitter Query Files** (`.scm` files)

- **Location**: `packages/cursorless-*/queries/{language}/*.scm`
- **Purpose**: Define patterns that compute scope ranges
- **Format**: Tree-sitter S-expression query language
- **Example**:
  ```scheme
  (function_declaration) @namedFunction
  (arrow_function) @anonymousFunction
  ```

#### 4. **Fixture Auto-Updater** (for scopes)

- **Trigger**: Launch config "Update fixtures subset"
- **Environment Variable**: `CURSORLESS_TEST_UPDATE_FIXTURES=true`
- **Purpose**: Runs tree-sitter queries and populates ranges in `.scope` files
- **Process**:
  1. Loads `.scope` file
  2. Runs tree-sitter parser on code
  3. Executes queries to find scope ranges
  4. Writes ranges back to `.scope` file
  5. Generates visual markers from ranges

#### 5. **Scope Tests Plugin** (`scope-tests-plugin.ts`)

- **Location**: `packages/cursorless-org-docs/src/plugins/scope-tests-plugin.ts`
- **Purpose**: Docusaurus plugin that loads and parses `.scope` files
- **Key Functions**:
  - `parseTest()` - Parses `.scope` file format
  - `parseLine()` - Extracts ranges from visual markers
- **Output**: Fixture data consumed by ScopeVisualizer

---

## Recorded Test Fixture Generation

### Generation Method: **Automated** (via voice recording)

### Complete Workflow

```
Developer starts extension in debug mode ("debug extension")
  ↓
Say "cursorless record" (or variant)
  ↓
Pick target directory (e.g., actions/, decorations/, languages/)
  ↓
System enters recording mode
  ↓
Developer performs voice commands
  (e.g., "take funk air", "chuck line")
  ↓
For each command:
  - Capture initial state (documentContents, selections, marks)
  - Execute command
  - Capture final state (documentContents, selections)
  - (Optional) Capture decorations state if recording highlights
  ↓
System generates YAML file per command
  ↓
File saved to data/fixtures/recorded/{directory}/{commandName}.yml
  ↓
Say "cursorless record" again to stop recording
  ↓
(Optional) Run transform script to normalize/upgrade fixtures
  ↓
Files ready for test execution and visualization
```

### Recording Modes

| Command                        | Captures                               | Use Case                    |
| ------------------------------ | -------------------------------------- | --------------------------- |
| `cursorless record`            | Before/after states, selections, marks | Standard command tests      |
| `cursorless record error`      | Error conditions                       | Testing error handling      |
| `cursorless record highlights` | Decoration states                      | Testing visual feedback     |
| `cursorless record that mark`  | "that" mark behavior                   | Testing mark persistence    |
| `cursorless record navigation` | Navigation targets                     | Testing navigation commands |

### Tools Unique to Recorded Tests

#### 1. **Test Case Recorder** (`cursorless.recordTestCase`)

- **Command**: "cursorless record" (and variants)
- **Location**: Registered in `packages/cursorless-vscode/package.json`
- **Purpose**: Records command execution as YAML fixtures
- **Captures**:
  - `documentContents` - Code before/after
  - `selections` - Cursor positions (anchor/active)
  - `marks` - Hat positions (e.g., `default.a`)
  - `command` - Spoken form and parsed command structure
  - `decorations` - Flash highlights (if recording highlights)
  - `returnValue` - Command return value
  - `clipboard` - Clipboard contents (for copy/paste commands)
  - `errors` - Expected errors (if recording errors)

#### 2. **Transform Script** (`transform-recorded-tests`)

- **Command**: `pnpm transform-recorded-tests`
- **Location**: Referenced in `packages/cursorless-org-docs/src/docs/contributing/test-case-recorder.md`
- **Purpose**: Post-process recorded fixtures
- **Flags**:
  - `--canonicalize` - Normalize fixture format
  - `--upgrade` - Upgrade to latest command version
  - `--custom <path>` - Apply custom transformation
- **Use Cases**:
  - Normalizing whitespace
  - Upgrading command schema versions
  - Bulk refactoring of fixture data

#### 3. **Fixture Auto-Updater** (for recorded tests)

- **Trigger**: Launch config "VSCode: Update test fixtures"
- **Environment Variable**: `CURSORLESS_TEST_UPDATE_FIXTURES=true`
- **Purpose**: Re-runs tests and overwrites fixtures with new behavior
- **Process**:
  1. Loads existing `.yml` file
  2. Sets up initial state
  3. Executes command
  4. Captures new final state
  5. Overwrites `.yml` file with updated state
- **Use Case**: Bulk updating fixtures after engine changes

#### 4. **Test Case Loader** (for test-case-component)

- **Location**: `packages/test-case-component/src/loadFixture.ts`
- **Purpose**: Loads YAML fixture and generates HTML for visualization
- **Key Function**: `loadFixture(data: any): Promise<object>`
- **Output**:
  ```typescript
  {
    language: string,
    command: string,
    before: string,  // HTML
    during?: string, // HTML (if decorations present)
    after: string    // HTML
  }
  ```

---

## Shared Tools and Infrastructure

### Tools Used by Both Fixture Types

#### 1. **Voice Command System**

- **Component**: Cursorless Talon integration
- **Purpose**: Both systems rely on voice commands to trigger actions
- **.scope files**: "cursorless record scope", "cursorless save scope"
- **Recorded tests**: "cursorless record", voice commands during recording

#### 2. **VSCode Command Palette**

- **Purpose**: Programmatic access to recording commands
- **Common Pattern**: Both use `vscode.commands.executeCommand()`
- **Registration**: Both register commands in `package.json`

#### 3. **Fixture Update Infrastructure**

- **Environment Variable**: `CURSORLESS_TEST_UPDATE_FIXTURES=true`
- **Launch Configurations**:
  - "VSCode: Update test fixtures" - For all fixtures
  - "VSCode: Update test fixtures (subset)" - For subset
  - "Unit tests: Update test fixtures" - For unit tests
- **Purpose**: Both .scope files and recorded tests can be bulk-updated
- **Mechanism**: Tests run in "update mode" instead of "assert mode"

#### 4. **Debug Extension Mode**

- **Launch Config**: "Extension" (in `.vscode/launch.json`)
- **Purpose**: Both recording systems require extension to be running in debug mode
- **Why**: Enables VSCode command execution and file system access

#### 5. **YAML Parsing**

- **Libraries**: `js-yaml`, `yaml`
- **Purpose**:
  - Recorded tests: Written as YAML, parsed for test execution
  - .scope files: Contain embedded YAML metadata (though primary format is custom)
- **Usage**: Both systems serialize/deserialize fixture data

#### 6. **Test Harness**

- **Purpose**: Executes both types of fixtures as tests
- **For .scope files**: Runs tree-sitter queries, validates scope detection
- **For recorded tests**: Executes commands, validates state transitions
- **Common Infrastructure**: Jest test runner, assertion framework

---

## Tool Comparison Table

| Tool                     | .scope Files | Recorded Tests | Purpose                   |
| ------------------------ | ------------ | -------------- | ------------------------- |
| **Voice Commands**       | ✅           | ✅             | Trigger recording         |
| **VSCode Commands**      | ✅           | ✅             | Programmatic API          |
| **Debug Mode**           | ✅           | ✅             | Enable recording features |
| **Fixture Auto-Updater** | ✅           | ✅             | Bulk update fixtures      |
| **YAML Parsing**         | ✅           | ✅             | Data serialization        |
| **Test Harness**         | ✅           | ✅             | Execute fixtures as tests |
| **Bulk Recorder**        | ✅ (unique)  | ❌             | Generate facet slots      |
| **Scope Saver**          | ✅ (unique)  | ❌             | Save scope tests          |
| **Tree-sitter Queries**  | ✅ (unique)  | ❌             | Compute ranges            |
| **Scope Tests Plugin**   | ✅ (unique)  | ❌             | Load for docs site        |
| **Test Case Recorder**   | ❌           | ✅ (unique)    | Record commands           |
| **Transform Script**     | ❌           | ✅ (unique)    | Post-process fixtures     |
| **Test Case Loader**     | ❌           | ✅ (unique)    | Load for visualization    |

---

## Data Flow Diagrams

### .scope File Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Initial Recording                                      │
└─────────────────────────────────────────────────────────────────┘
  Developer Voice
      │
      ├─→ "cursorless record scope"
      │         ↓
      │   showUnimplementedFacets()
      │         ↓
      │   Generate template with facet slots
      │         ↓
      │   Developer fills in code examples
      │         ↓
      └─→ "cursorless save scope"
                ↓
          Save to data/fixtures/scopes/{lang}/{scope}.scope
          (Contains code + empty ranges)

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Pattern Implementation                                 │
└─────────────────────────────────────────────────────────────────┘
  Developer edits queries/{language}/*.scm
      │
      ├─→ Define tree-sitter patterns
      │   (e.g., "(function_declaration) @namedFunction")
      │
      └─→ Commit query file

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Auto-Update                                            │
└─────────────────────────────────────────────────────────────────┘
  Launch "Update fixtures subset"
      │
      ├─→ Set CURSORLESS_TEST_UPDATE_FIXTURES=true
      │         ↓
      │   Load .scope file
      │         ↓
      │   Parse code with tree-sitter
      │         ↓
      │   Execute queries from .scm files
      │         ↓
      │   Compute ranges for each facet
      │         ↓
      │   Write ranges back to .scope file
      │         ↓
      └─→ Generate visual markers (>, <)

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: Consumption                                            │
└─────────────────────────────────────────────────────────────────┘
  Docusaurus build
      │
      ├─→ scope-tests-plugin.ts loads .scope files
      │         ↓
      │   Parse visual markers into ranges
      │         ↓
      │   Convert to fixture data
      │         ↓
      │   ScopeVisualizer renders
      │         ↓
      └─→ Display on docs site
```

### Recorded Test Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Recording Session                                      │
└─────────────────────────────────────────────────────────────────┘
  Developer Voice
      │
      ├─→ "cursorless record" (or variant)
      │         ↓
      │   Pick target directory
      │         ↓
      │   Enter recording mode
      │         ↓
      │   ┌──────────────────────────────┐
      │   │ For each voice command:      │
      │   │   1. Capture initial state   │
      │   │   2. Execute command         │
      │   │   3. Capture final state     │
      │   │   4. Generate YAML file      │
      │   └──────────────────────────────┘
      │         ↓
      └─→ "cursorless record" (to stop)
                ↓
          Files saved to data/fixtures/recorded/

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Post-Processing (Optional)                             │
└─────────────────────────────────────────────────────────────────┘
  pnpm transform-recorded-tests --canonicalize
      │
      ├─→ Normalize whitespace
      ├─→ Upgrade command versions
      ├─→ Apply custom transformations
      │
      └─→ Overwrite YAML files

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Bulk Update (After Engine Changes)                     │
└─────────────────────────────────────────────────────────────────┘
  Launch "VSCode: Update test fixtures"
      │
      ├─→ Set CURSORLESS_TEST_UPDATE_FIXTURES=true
      │         ↓
      │   Load existing YAML fixture
      │         ↓
      │   Set up initial state
      │         ↓
      │   Execute command
      │         ↓
      │   Capture new final state
      │         ↓
      └─→ Overwrite YAML file

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: Consumption                                            │
└─────────────────────────────────────────────────────────────────┘

  Path A: Test Execution
      │
      ├─→ Test runner loads YAML
      ├─→ Sets up initial state
      ├─→ Executes command
      ├─→ Asserts final state matches
      └─→ Pass/Fail

  Path B: Visualization (test-case-component)
      │
      ├─→ loadFixture() loads YAML
      ├─→ generateHtml() for each state
      ├─→ ShikiComponent displays HTML
      └─→ Render on docs/demo page
```

---

## Key Differences in Generation Philosophy

### .scope Files: **Pattern-Driven**

- Developer provides **examples** (code snippets)
- System computes **ranges** (via tree-sitter)
- Focus: "Where is the scope in this code?"
- Validation: Does the query correctly identify the scope?

### Recorded Tests: **Execution-Driven**

- Developer performs **commands** (voice input)
- System captures **state changes** (before/after)
- Focus: "What does this command do?"
- Validation: Does the command produce the expected result?

---

## Manual Editing Policy

### .scope Files

> **Discouraged**: "The format is automatically generated, so you shouldn't need to edit it yourself."

**Why**: Visual markers are auto-generated from ranges. Manual edits will be overwritten.

**Exception**: Editing code examples before running auto-update is expected.

### Recorded Tests

> **Discouraged**: Use transform script instead.

**Why**: YAML structure has specific schema. Manual edits risk schema violations.

**Exception**: Quick fixes for obvious typos may be acceptable, but re-recording is preferred.

---

## File Counts

| Type           | Count      | Location                           |
| -------------- | ---------- | ---------------------------------- |
| .scope files   | ~thousands | `data/fixtures/scopes/{language}/` |
| Recorded tests | 3,286+     | `data/fixtures/recorded/`          |

**Source**: Mentioned in `RECORDED-FIXTURES-VS-SCOPE-FILES.md`

---

## Related Documentation

- `test-case-recorder.md` - How to record test cases
- `adding-a-new-scope.md` - How to add scope types
- `scope-test-format.md` - .scope file format specification
- `RECORDED-FIXTURES-VS-SCOPE-FILES.md` - Comparison of data formats
- `SCOPE-FILES-AND-VISUALIZATION-PIPELINE.md` - .scope file pipeline

---

## Summary

Both fixture types are **automatically generated** via voice-driven workflows:

- **.scope files**: Bulk recorder → manual code examples → tree-sitter auto-populate → auto-update
- **Recorded tests**: Voice commands → state capture → YAML generation → optional transform

**Shared infrastructure**:

- Voice command system
- Debug extension mode
- Fixture auto-updater (`CURSORLESS_TEST_UPDATE_FIXTURES=true`)
- YAML parsing
- Test harness

**Unique tools**:

- .scope: Bulk recorder, tree-sitter queries, scope tests plugin
- Recorded: Test case recorder, transform script, test case loader

Both discourage manual editing in favor of regeneration workflows.
