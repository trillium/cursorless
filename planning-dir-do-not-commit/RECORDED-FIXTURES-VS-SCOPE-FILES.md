# Recorded Test Fixtures (.yml) vs. Scope Files (.scope)

## Executive Summary

This document compares two types of test fixtures in Cursorless:

1. **Recorded Test Fixtures** (`.yml`/`.yaml`) - Test command execution end-to-end
2. **Scope Files** (`.scope`) - Test scope identification and parsing

Both can serve as data sources for visualization, but they have fundamentally different structures and purposes.

**Quick Stats**:

- **Recorded Fixtures**: ~3,286 files in `data/fixtures/recorded/`
- **Scope Files**: ~thousands in `data/fixtures/scopes/`

---

## Side-by-Side Comparison

### Format Comparison

#### Recorded Test Fixture (.yml)

```yaml
languageId: typescript
command:
  version: 6
  spokenForm: take item air
  action:
    name: setSelection
    target:
      type: primitive
      modifiers:
        - type: containingScope
          scopeType: { type: collectionItem }
      mark: { type: decoratedSymbol, symbolColor: default, character: a }
  usePrePhraseSnapshot: false
initialState:
  documentContents: |

    const value = { a: 1, b: 2, c: 3 };
  selections:
    - anchor: { line: 0, character: 0 }
      active: { line: 0, character: 0 }
  marks:
    default.a:
      start: { line: 1, character: 16 }
      end: { line: 1, character: 17 }
finalState:
  documentContents: |

    const value = { a: 1, b: 2, c: 3 };
  selections:
    - anchor: { line: 1, character: 16 }
      active: { line: 1, character: 20 }
```

---

#### Scope File (.scope)

```
{"aaa": 0, "bbb": 1}
---

[Content] =
[Domain] = 0:1-0:19
   >------------------<
0| {"aaa": 0, "bbb": 1}

[Insertion delimiter] = " "
```

---

## Detailed Comparison

| Aspect                | Recorded Test Fixtures (.yml) | Scope Files (.scope)        |
| --------------------- | ----------------------------- | --------------------------- |
| **Purpose**           | Test command execution        | Test scope identification   |
| **Format**            | YAML (structured)             | Custom (code + annotations) |
| **Location**          | `data/fixtures/recorded/`     | `data/fixtures/scopes/`     |
| **Count**             | ~3,286 files                  | ~thousands of files         |
| **File Size**         | Typically 20-50 lines         | Typically 10-30 lines       |
| **Human Readable**    | Moderate (YAML structure)     | High (visual markers)       |
| **Machine Parseable** | Easy (YAML parser)            | Custom parser needed        |

---

## Structural Differences

### What Recorded Fixtures Have (That Scope Files Don't)

#### 1. Command Information ✅

```yaml
command:
  version: 6
  spokenForm: take item air
  action:
    name: setSelection
    target:
      type: primitive
      modifiers:
        - type: containingScope
          scopeType: { type: collectionItem }
```

**Purpose**: Defines what voice command was issued
**Value for Visualization**: Can show command text as title

---

#### 2. Two Complete States ✅

```yaml
initialState:
  documentContents: |
    const value = { a: 1, b: 2, c: 3 };
  selections: [...]
  marks: { ... }

finalState:
  documentContents: |
    const value = { a: 1, b: 2, c: 3 };
  selections: [...]
```

**Purpose**: Before and after snapshots
**Value for Visualization**: Can show temporal progression (before → after)

---

#### 3. Marks (Hats) ✅

```yaml
marks:
  default.a:
    start: { line: 1, character: 16 }
    end: { line: 1, character: 17 }
```

**Purpose**: Shows hat decorations over characters
**Value for Visualization**: Can render hat indicators
**Format**: `{hatType}.{character}` → position

---

#### 4. Selections ✅

```yaml
selections:
  - anchor: { line: 0, character: 0 }
    active: { line: 0, character: 0 }
```

**Purpose**: Cursor positions
**Value for Visualization**: Can highlight selected ranges

---

#### 5. Action Metadata ✅

```yaml
action:
  name: setSelection
  target:
    type: primitive
    modifiers: [...]
```

**Purpose**: Describes what the command does
**Value for Visualization**: Can explain operation

---

### What Scope Files Have (That Recorded Fixtures Don't)

#### 1. Visual Range Markers ✅

```
   >------------------<
0| {"aaa": 0, "bbb": 1}
```

**Purpose**: Human-readable range visualization
**Value**: Makes .scope files easier to author/review

---

#### 2. Domain Ranges ✅

```
[Domain] = 0:1-0:19
```

**Purpose**: Shows containing scope context
**Value for Visualization**: Can highlight context separately

---

#### 3. Removal Ranges ✅

```
[Content] = 0:5-0:10
[Removal] = 0:4-0:12
```

**Purpose**: Shows what gets deleted vs. what's selected
**Value for Visualization**: Toggle between content/removal view

---

#### 4. Delimiter Information ⚠️

```
[Insertion delimiter] = " "
[Leading delimiter] = 1:0-1:4
[Trailing delimiter] = ...
```

**Purpose**: Testing scope delimiter handling
**Value for Visualization**: Not currently visualized (ignored)

---

## Similarities

### Both Have:

| Feature                | Recorded Fixtures        | Scope Files                   | Notes                          |
| ---------------------- | ------------------------ | ----------------------------- | ------------------------------ |
| **Language ID**        | `languageId: typescript` | Extracted from directory name | Same purpose                   |
| **Source Code**        | `documentContents`       | Above `---` delimiter         | Different formats              |
| **Range Notation**     | `{line, character}`      | `line:char-line:char`         | Same concept, different syntax |
| **Test Purpose**       | End-to-end testing       | Scope parsing testing         | Both validate behavior         |
| **Multiple Instances** | Numbered files           | Numbered files                | e.g., `foo2.yml`, `bar3.scope` |

---

## Data Structure Deep Dive

### Recorded Fixture Data Model

```typescript
interface RecordedFixture {
  // Metadata
  languageId: string;

  // Command definition
  command: {
    version: number;
    spokenForm: string;
    action: Action;
    usePrePhraseSnapshot: boolean;
  };

  // Initial state (before command)
  initialState: EditorState;

  // Final state (after command)
  finalState: EditorState;
}

interface EditorState {
  documentContents: string;
  selections: Selection[];
  marks?: Record<string, MarkPosition>;
  // May also have:
  clipboard?: string;
  returnValue?: any;
  asserts?: Assertion[];
}

interface Selection {
  anchor: Position;
  active: Position;
  selectionType?: "line" | "token" | "character";
}

interface Position {
  line: number;
  character: number;
}

interface MarkPosition {
  start: Position;
  end: Position;
}
```

---

### Scope File Data Model (After Parsing)

```typescript
interface ScopeFixture {
  // Metadata
  name: string; // e.g., "scopes/typescript/namedFunction"
  languageId: string;
  facet: string; // e.g., "namedFunction.iteration"

  // Single code sample
  code: string;

  // Scope definitions
  scopes: Scope[];
}

interface Scope {
  domain?: string; // e.g., "0:0-0:16" (concise notation)
  targets: Target[];
}

interface Target {
  content: string; // e.g., "0:5-0:10"
  removal?: string; // e.g., "0:4-0:12"
}
```

---

## Consumption Scenarios

### Scenario 1: Visualizing Command Execution (Recorded Fixtures)

**Use Case**: Show before/after states of a command

**Data Flow**:

```
Recorded Fixture (YAML)
  ↓ Parse YAML
RecordedFixture Object
  ↓ Extract states
{ initialState, finalState, command }
  ↓ Generate HTML for each state
{ before: HTML, after: HTML, command: string }
  ↓ Display in Component
ShikiComponent (before → after transition)
```

**Advantages**:

- ✅ Shows command effect
- ✅ Has hat decorations (marks)
- ✅ Temporal progression (before → after)
- ✅ Command name for context

**Challenges**:

- ⚠️ No "domain" concept (would need to infer from target modifiers)
- ⚠️ No explicit "removal" range (would need to compute diff)
- ⚠️ More complex structure (needs action parsing)

---

### Scenario 2: Visualizing Scope Support (Scope Files)

**Use Case**: Show scope parsing ranges

**Data Flow**:

```
Scope File (.scope)
  ↓ Parse custom format
ScopeFixture Object
  ↓ Extract ranges
{ domain, content, removal }
  ↓ Generate decorations
Shiki DecorationItem[]
  ↓ Render HTML
Code component (ScopeVisualizer)
```

**Advantages**:

- ✅ Explicit domain/content/removal ranges
- ✅ Simple, focused data
- ✅ Human-readable format
- ✅ Designed for documentation

**Challenges**:

- ❌ No hat decorations
- ❌ No command context
- ❌ Single state only (no before/after)

---

## Mapping Recorded Fixtures to Visualization

### Extracting Before/During/After States

**Recorded fixtures provide excellent "before" and "after" states**:

```typescript
// From YAML
const before = {
  code: fixture.initialState.documentContents,
  selections: fixture.initialState.selections,
  marks: fixture.initialState.marks,
};

const after = {
  code: fixture.finalState.documentContents,
  selections: fixture.finalState.selections,
  // marks typically not in finalState
};

const command = fixture.command.spokenForm;
```

**"During" state** (flash decorations) would need to be:

- Computed from action target
- Extracted from test execution (if available)
- Inferred from modifiers

---

### Converting Positions to Ranges

**Recorded fixtures use `{line, character}` format**:

```yaml
marks:
  default.a:
    start: { line: 1, character: 16 }
    end: { line: 1, character: 17 }
```

**Convert to concise notation**:

```typescript
function positionToRange(mark: MarkPosition): string {
  return `${mark.start.line}:${mark.start.character}-${mark.end.line}:${mark.end.character}`;
}
// "1:16-1:17"
```

**Already compatible** with Range.fromConcise()!

---

### Extracting Selections as Highlights

```yaml
selections:
  - anchor: { line: 0, character: 5 }
    active: { line: 0, character: 10 }
```

**Convert to highlight**:

```typescript
{
  range: new Range(
    { line: 0, character: 5 },
    { line: 0, character: 10 }
  ),
  style: getStyleForSelectionType("selection")
}
```

---

### Extracting Marks (Hats) as Decorations

```yaml
marks:
  default.a:
    start: { line: 1, character: 16 }
    end: { line: 1, character: 17 }
```

**Convert to hat decoration**:

```typescript
{
  range: new Range(mark.start, mark.end),
  style: {
    className: "hat-default",
    dataAttributes: { hat: "a" }
  }
}
```

**Rendered via CSS** (as discussed in migration doc):

```css
.hat-default::before {
  content: attr(data-hat);
  position: absolute;
  top: -1em;
  /* ... */
}
```

---

## Data Pipeline for Recorded Fixtures

### Proposed Pipeline (Similar to ScopeVisualizer)

```
┌─────────────────────────────────────────────────────────────────┐
│               Phase 1: File Discovery (Build Time)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  1. Scan data/fixtures/recorded/ recursively                    │
│  2. Filter files ending with .yml or .yaml                      │
│  3. Extract metadata from path:                                 │
│     • Directory structure indicates test category               │
│     • Filename is test name                                     │
│                                                                 │
│  Returns: RecordedTestPath[]                                    │
│    [                                                            │
│      {                                                          │
│        path: "/full/path/to/takeItemAir.yml",                  │
│        name: "languages/typescript/takeItemAir",                │
│        category: "languages",                                   │
│        languageId: "typescript"  // Inferred from path          │
│      },                                                         │
│      ...                                                        │
│    ]                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               Phase 2: Parsing (Build Time)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  For Each YAML File:                                            │
│                                                                 │
│  1. Read file (fs.readFileSync)                                 │
│  2. Parse YAML (yaml.load)                                      │
│  3. Validate schema                                             │
│  4. Extract:                                                    │
│     • languageId (from file or path)                            │
│     • command.spokenForm                                        │
│     • initialState (before)                                     │
│     • finalState (after)                                        │
│                                                                 │
│  Returns: RecordedFixture                                       │
│    {                                                            │
│      name: "takeItemAir",                                       │
│      languageId: "typescript",                                  │
│      command: "take item air",                                  │
│      initialState: {                                            │
│        code: "const value = { a: 1, b: 2, c: 3 };",            │
│        selections: [...],                                       │
│        marks: { "default.a": {...} }                            │
│      },                                                         │
│      finalState: {                                              │
│        code: "const value = { a: 1, b: 2, c: 3 };",            │
│        selections: [...]                                        │
│      }                                                          │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│          Phase 3: Decoration Generation (Runtime)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  For initialState (before):                                     │
│                                                                 │
│  1. Convert marks to hat decorations:                           │
│     for (const [key, position] of Object.entries(marks)):      │
│       const [hatType, letter] = key.split('.');                 │
│       decorations.push({                                        │
│         range: Range(position.start, position.end),             │
│         className: `hat-${hatType}`,                            │
│         dataHat: letter                                         │
│       });                                                       │
│                                                                 │
│  2. Convert selections to selection decorations:                │
│     for (const selection of selections):                        │
│       decorations.push({                                        │
│         range: Range(selection.anchor, selection.active),       │
│         style: getStyleForSelectionType("selection")            │
│       });                                                       │
│                                                                 │
│  Returns: DecorationItem[] (for before state)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  For finalState (after):                                        │
│                                                                 │
│  1. Convert selections to selection decorations                 │
│  2. No marks typically (hats removed after action)              │
│                                                                 │
│  Returns: DecorationItem[] (for after state)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│          Phase 4: HTML Generation (Runtime)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Generate "before" HTML:                                        │
│    beforeHtml = await codeToHtml(                               │
│      initialState.code,                                         │
│      { decorations: beforeDecorations }                         │
│    );                                                           │
│                                                                 │
│  Generate "after" HTML:                                         │
│    afterHtml = await codeToHtml(                                │
│      finalState.code,                                           │
│      { decorations: afterDecorations }                          │
│    );                                                           │
│                                                                 │
│  Returns: { before: HTML, after: HTML, command: string }        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Phase 5: Display (Runtime)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  TestCaseComponent:                                             │
│                                                                 │
│  <div>                                                          │
│    <h2>{data.command}</h2>                                      │
│    <div className="before">                                     │
│      <div dangerouslySetInnerHTML={{ __html: data.before }} /> │
│    </div>                                                       │
│    <div className="after">                                      │
│      <div dangerouslySetInnerHTML={{ __html: data.after }} />  │
│    </div>                                                       │
│  </div>                                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Comparison Matrix

| Feature             | Recorded Fixtures    | Scope Files          | Priority for Viz |
| ------------------- | -------------------- | -------------------- | ---------------- |
| **Before State**    | ✅ `initialState`    | ❌ Single state only | High             |
| **After State**     | ✅ `finalState`      | ❌ Single state only | High             |
| **Hat Decorations** | ✅ `marks` field     | ❌ No support        | High             |
| **Selections**      | ✅ Both states       | ❌ Not applicable    | Medium           |
| **Command Name**    | ✅ `spokenForm`      | ❌ No command        | High             |
| **Domain Ranges**   | ⚠️ Must infer        | ✅ Explicit          | Medium           |
| **Content Ranges**  | ⚠️ Must compute      | ✅ Explicit          | Low              |
| **Removal Ranges**  | ⚠️ Must compute diff | ✅ Explicit          | Low              |
| **Action Metadata** | ✅ Full action tree  | ❌ No action         | Low              |
| **Visual Markers**  | ❌ None              | ✅ ASCII art         | Low              |
| **Human Readable**  | ⚠️ Moderate          | ✅ High              | Low              |

---

## Conversion Examples

### Example 1: Simple Selection Change

**Recorded Fixture**:

```yaml
languageId: typescript
command:
  spokenForm: take funk
initialState:
  documentContents: function foo() { }
  selections:
    - { anchor: { line: 0, character: 0 }, active: { line: 0, character: 0 } }
  marks: {}
finalState:
  documentContents: function foo() { }
  selections:
    - { anchor: { line: 0, character: 0 }, active: { line: 0, character: 19 } }
```

**Visualization Data**:

```typescript
{
  language: "typescript",
  command: "take funk",
  before: {
    code: "function foo() { }",
    decorations: [
      // Cursor at 0:0 (no visible decoration for cursor)
    ]
  },
  after: {
    code: "function foo() { }",
    decorations: [
      {
        range: "0:0-0:19",
        style: { backgroundColor: "#ad00bc5b", ... } // Selection highlight
      }
    ]
  }
}
```

---

### Example 2: Hat-Based Selection

**Recorded Fixture**:

```yaml
languageId: typescript
command:
  spokenForm: take item air
initialState:
  documentContents: |

    const value = { a: 1, b: 2, c: 3 };
  selections:
    - { anchor: { line: 0, character: 0 }, active: { line: 0, character: 0 } }
  marks:
    default.a:
      start: { line: 1, character: 16 }
      end: { line: 1, character: 17 }
finalState:
  documentContents: |

    const value = { a: 1, b: 2, c: 3 };
  selections:
    - { anchor: { line: 1, character: 16 }, active: { line: 1, character: 20 } }
```

**Visualization Data**:

```typescript
{
  language: "typescript",
  command: "take item air",
  before: {
    code: "\nconst value = { a: 1, b: 2, c: 3 };",
    decorations: [
      {
        range: "1:16-1:17",
        className: "hat-default",
        dataHat: "a",
        // Renders as: <span class="hat-default" data-hat="a">a</span>
      }
    ]
  },
  after: {
    code: "\nconst value = { a: 1, b: 2, c: 3 };",
    decorations: [
      {
        range: "1:16-1:20",  // "a: 1"
        style: { backgroundColor: "#ad00bc5b", ... }
      }
    ]
  }
}
```

---

### Example 3: Code Modification

**Recorded Fixture**:

```yaml
languageId: typescript
command:
  spokenForm: change callee
initialState:
  documentContents: foo`hello ${bar}`;
  selections:
    - { anchor: { line: 0, character: 10 }, active: { line: 0, character: 10 } }
  marks: {}
finalState:
  documentContents: "`hello ${bar}`;"
  selections:
    - { anchor: { line: 0, character: 0 }, active: { line: 0, character: 0 } }
```

**Visualization Data**:

```typescript
{
  language: "typescript",
  command: "change callee",
  before: {
    code: "foo`hello ${bar}`;",
    decorations: [] // Just cursor
  },
  after: {
    code: "`hello ${bar}`;",  // ← Code changed!
    decorations: []
  }
}
```

**Note**: When code changes, side-by-side display works well.

---

## Implementation Considerations

### Current State: test-case-component

**Currently uses**: Custom data format (not directly from YAML)

```typescript
// Current: loadFixture() expects processed data
{
  languageId: string;
  command: { spokenForm: string };
  initialState: CursorlessFixtureState;
  finalState: CursorlessFixtureState;
  decorations?: CursorlessFixtureSelection[];  // ← Where does this come from?
}
```

**The `decorations` field** is likely computed from:

- Action target modifiers
- Scope expansion logic
- Test execution traces

---

### Proposal: Direct YAML Consumption

**New approach**: Load YAML directly

```typescript
// New: loadRecordedFixture() for YAML files
import yaml from "yaml";

function loadRecordedFixture(yamlPath: string) {
  const content = fs.readFileSync(yamlPath, "utf8");
  const fixture = yaml.parse(content);

  return {
    language: fixture.languageId,
    command: fixture.command.spokenForm,
    before: await generateHtmlFromState(
      fixture.initialState,
      fixture.languageId,
    ),
    after: await generateHtmlFromState(fixture.finalState, fixture.languageId),
  };
}

function generateHtmlFromState(state: EditorState, lang: string) {
  const decorations = [
    ...convertMarksToDecorations(state.marks),
    ...convertSelectionsToDecorations(state.selections),
  ];

  return codeToHtml(state.documentContents, {
    lang,
    theme: "nord",
    decorations,
  });
}
```

---

### Advantages of Using Recorded Fixtures

#### 1. Rich Test Data ✅

- 3,286+ examples across many languages
- Real-world command scenarios
- Hat decorations included
- Before/after progression

#### 2. Command Context ✅

- Spoken form for titles
- Action type for categorization
- Can group by command type

#### 3. Temporal Visualization ✅

- Perfect for showing command effects
- Side-by-side or animated transitions
- Clear cause and effect

#### 4. Hat Support ✅

- Already have hat positions
- No need to infer or add
- Real usage examples

---

### Challenges of Using Recorded Fixtures

#### 1. No Domain/Content/Removal Distinction ❌

- Would need to compute from action
- Not as clean as scope files
- May need heuristics

#### 2. Complex Action Structure ⚠️

- Deep nesting of modifiers
- Would need action parser
- May not be worth the effort

#### 3. Large File Count ⚠️

- 3,286 files is a lot
- May need filtering/curation
- Build time considerations

#### 4. Test-Oriented Format ⚠️

- Designed for testing, not docs
- Some fixtures may be edge cases
- Not all are good examples

---

## Hybrid Approach

### Use Both Sources for Different Purposes

**Scope Files** → Scope documentation

- Show how scopes are identified
- Domain/content/removal ranges
- Language support matrices

**Recorded Fixtures** → Command examples

- Show how commands work
- Hat-based targeting
- Before/after effects
- Action demonstrations

---

### Shared Infrastructure

Both can use the same rendering components:

```typescript
// Unified data format
interface VisualizationData {
  language: string;
  title: string;
  states: {
    before?: { code: string; decorations: DecorationItem[] };
    during?: { code: string; decorations: DecorationItem[] };
    after?: { code: string; decorations: DecorationItem[] };
  };
}

// From scope files
const scopeViz = convertScopeFixtureToViz(scopeFixture);

// From recorded fixtures
const commandViz = convertRecordedFixtureToViz(recordedFixture);

// Both render with same component
<VisualizationComponent data={scopeViz} />
<VisualizationComponent data={commandViz} />
```

---

## Recommendations

### For ScopeVisualizer (Documentation Site)

**Keep using scope files** because:

- ✅ Purpose-built for scope documentation
- ✅ Simple, focused data
- ✅ Explicit domain/content/removal
- ✅ Already integrated

**Consider adding** recorded fixture visualization as:

- New section: "Command Examples"
- Shows real command usage
- Complements scope documentation

---

### For test-case-component

**Current approach** (custom data format) works well for:

- ✅ Test result visualization
- ✅ Debugging failed tests
- ✅ Hat decorations

**Could enhance with**:

- Direct YAML loading (remove preprocessing)
- ScopeVisualizer-style decoration pipeline
- Shared code with ScopeVisualizer

---

### For New Visualization Tools

**If building new visualizations**:

1. **Command Gallery**: Use recorded fixtures
   - Show popular commands
   - Before/after examples
   - Hat-based targeting

2. **Scope Reference**: Use scope files
   - Language support tables
   - Scope identification rules
   - Domain/content/removal

3. **Interactive Playground**: Use both
   - Scope files for scope demo
   - Recorded fixtures for command demo

---

## Migration Path: Recorded Fixtures → ScopeVisualizer Pattern

### Phase 1: Add YAML Parser

```typescript
// packages/cursorless-org-docs/src/plugins/recorded-tests-plugin.ts
export default function recordedTestsPlugin() {
  return {
    name: "recorded-tests-plugin",
    loadContent(): RecordedTests {
      const fixtures = getRecordedTestPaths()
        .map((path) => parseRecordedTest(path))
        .filter(Boolean);

      return { fixtures };
    },
    contentLoaded({ content, actions }) {
      actions.setGlobalData(content);
    },
  };
}
```

### Phase 2: Create Component

```typescript
// packages/cursorless-org-docs/src/docs/components/CommandVisualizer.tsx
export function CommandVisualizer({ command }: Props) {
  const recordedTests = usePluginData("recorded-tests-plugin");
  const [beforeHtml, setBeforeHtml] = useState("");
  const [afterHtml, setAfterHtml] = useState("");

  useEffect(() => {
    // Generate HTML from fixture
    generateVisualization(fixture).then(({ before, after }) => {
      setBeforeHtml(before);
      setAfterHtml(after);
    });
  }, [fixture]);

  return (
    <div>
      <h2>{fixture.command.spokenForm}</h2>
      <div className="before-after">
        <div dangerouslySetInnerHTML={{ __html: beforeHtml }} />
        <div dangerouslySetInnerHTML={{ __html: afterHtml }} />
      </div>
    </div>
  );
}
```

### Phase 3: Integration

Add to documentation pages:

```mdx
# Take Command

<CommandVisualizer command="take item air" />

The "take" command selects a target...
```

---

## Summary

### Quick Reference

| Aspect                  | Recorded Fixtures   | Scope Files      | Winner   |
| ----------------------- | ------------------- | ---------------- | -------- |
| **Purpose**             | Command testing     | Scope testing    | Tie      |
| **Temporal States**     | Before + After ✅   | Single state ❌  | Recorded |
| **Hat Support**         | Yes ✅              | No ❌            | Recorded |
| **Domain Ranges**       | Must infer ⚠️       | Explicit ✅      | Scope    |
| **Content/Removal**     | Must compute ⚠️     | Explicit ✅      | Scope    |
| **Command Context**     | Yes ✅              | No ❌            | Recorded |
| **Human Readable**      | Moderate ⚠️         | High ✅          | Scope    |
| **Machine Parseable**   | Easy ✅             | Custom parser ⚠️ | Recorded |
| **File Count**          | 3,286               | Thousands        | Tie      |
| **Current Integration** | test-case-component | ScopeVisualizer  | Tie      |

### Key Takeaways

1. **Different purposes** - Both are valuable for different use cases
2. **Complementary** - Use scope files for scope docs, recorded fixtures for command demos
3. **Shared infrastructure possible** - Can use same rendering pipeline
4. **Recorded fixtures are underutilized** - Rich data not yet fully leveraged for documentation
5. **Migration is feasible** - Can adopt ScopeVisualizer patterns for recorded fixtures

### Recommended Architecture

```
Visualization Infrastructure
├── Data Sources
│   ├── Scope Files (.scope) → Scope documentation
│   └── Recorded Fixtures (.yml) → Command examples
├── Parsers
│   ├── scope-tests-plugin.ts (existing)
│   └── recorded-tests-plugin.ts (new)
├── Decoration Generation
│   ├── For scopes: Domain/Content/Removal
│   └── For commands: Marks/Selections
├── HTML Generation
│   └── Shared: codeToHtml() with decorations
└── Components
    ├── ScopeVisualizer (existing)
    └── CommandVisualizer (new)
```

**Bottom Line**: Recorded fixtures are an excellent, underutilized data source that could provide rich command visualization with hat support and temporal progression. They're complementary to scope files, not a replacement.
