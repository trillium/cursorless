# Recorded Test Cases and test-case-component Pipeline Documentation

## Executive Summary

This document provides a comprehensive guide to **recorded test fixtures** (`.yml` files) - the format used by Cursorless to test command execution - and the complete data pipeline from `.yml` file on disk to rendered visualization via `ShikiComponent`.

**Key Facts**:

- **Location**: `data/fixtures/recorded/`
- **Format**: YAML with before/after states, selections, marks, and command data
- **Purpose**: Test command execution + Generate visual documentation
- **Processing**: loadFixture → generateHtml (per state) → ShikiComponent → React rendering

---

## Table of Contents

1. [Recorded Fixture File Format](#recorded-fixture-file-format)
2. [State Representation](#state-representation)
3. [Selection and Mark Notation](#selection-and-mark-notation)
4. [Complete Data Pipeline](#complete-data-pipeline)
5. [Visualization Features](#visualization-features)
6. [Examples](#examples)

---

## Recorded Fixture File Format

### Basic Structure

Every recorded test fixture is a YAML file with the following structure:

```yaml
languageId: <language>
command: <command definition>
initialState: <state before command>
finalState: <state after command>
```

### Anatomy of a Recorded Fixture

**File**: `data/fixtures/recorded/languages/typescript/takeItemAir.yml`

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
initialState:
  documentContents: |
    const value = { a: 1, b: 2, c: 3 };
  selections:
    - anchor: { line: 0, character: 0 }
      active: { line: 0, character: 0 }
  marks:
    default.a:
      start: { line: 0, character: 16 }
      end: { line: 0, character: 17 }
finalState:
  documentContents: |
    const value = { a: 1, b: 2, c: 3 };
  selections:
    - anchor: { line: 0, character: 16 }
      active: { line: 0, character: 20 }
```

**Components**:

1. **languageId** (line 1): Programming language identifier
2. **command** (lines 2-11): Complete command definition including spoken form and parsed structure
3. **initialState** (lines 12-21): Document state before command execution
4. **finalState** (lines 22-26): Document state after command execution

### Optional Properties

#### Decorations State

For fixtures that record visual decorations (flash highlights):

```yaml
decorationsState:
  documentContents: <same as initialState>
  decorations:
    - anchor: { line: 0, character: 5 }
      active: { line: 0, character: 10 }
      style: referenced-target
```

**Purpose**: Shows transient visual feedback during command execution

#### Return Value

For commands that return values:

```yaml
returnValue:
  type: success
  thatMark:
    - anchor: { line: 1, character: 0 }
      active: { line: 1, character: 5 }
```

**Purpose**: Captures command output and "that" mark updates

#### Clipboard

For copy/paste commands:

```yaml
clipboard:
  - text: "copied text"
```

**Purpose**: Verifies clipboard contents after command

#### Errors

For error recording mode:

```yaml
errors:
  - message: "Invalid target"
    name: "CursorlessError"
```

**Purpose**: Tests error handling

---

## State Representation

### CursorlessFixtureState Type

```typescript
interface CursorlessFixtureState {
  documentContents: string;
  selections: CursorlessFixtureSelection[];
  marks?: Record<string, CursorlessFixtureSelection>;
  decorations?: CursorlessFixtureSelection[];
}
```

### Three States in Visualization

1. **initialState** → `before` HTML
   - Shows code with selections and marks before command execution

2. **decorationsState** → `during` HTML (optional)
   - Shows code with flash decorations during command execution
   - Only present if decorations were recorded

3. **finalState** → `after` HTML
   - Shows code with selections and marks after command execution

---

## Selection and Mark Notation

### Selection Format

```yaml
selections:
  - anchor: { line: 0, character: 5 }
    active: { line: 0, character: 10 }
```

**Properties**:

- **anchor**: Start position (where selection began)
- **active**: Current cursor position (end of selection)
- **Zero-indexed**: Both line and character

**Direction**:

- If `anchor < active`: Forward selection
- If `anchor > active`: Backward selection
- If `anchor == active`: Cursor (no selection)

### Mark Format

```yaml
marks:
  default.a:
    start: { line: 0, character: 16 }
    end: { line: 0, character: 17 }
  default.b:
    start: { line: 0, character: 22 }
    end: { line: 0, character: 23 }
```

**Mark Keys**:

- Format: `{symbolColor}.{character}`
- Example: `default.a` - Default hat color, character "a"
- Special: `that` - The "that" mark (previous target)
- Special: `source` - Source mark for copy/move operations

**Properties**:

- **start**: Beginning of marked range
- **end**: End of marked range (usually start + 1 for single character)

### Decoration Format

```yaml
decorations:
  - anchor: { line: 0, character: 5 }
    active: { line: 0, character: 10 }
    style: referenced-target
```

**Styles**:

- `referenced-target` - Flash highlight for targets
- `referencedSymbol` - Symbol being referenced
- `pendingModification0`, `pendingModification1` - Multiple pending changes

---

## Complete Data Pipeline

### Phase 1: File Discovery & Loading (Runtime)

```
┌─────────────────────────────────────────────────────────────────┐
│                Application/Build Script Execution               │
│           (e.g., buildDictionary.ts or component page)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         Identify Fixture Files (Manual or via Glob)             │
│                                                                 │
│  Examples:                                                      │
│    • data/fixtures/recorded/actions/bringArgMadeAfterLook.yml  │
│    • data/fixtures/recorded/decorations/chuckBlockAir.yml      │
│    • data/fixtures/recorded/languages/typescript/*.yml         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Load YAML File (fs.readFileSync)                   │
│                                                                 │
│  1. Read file contents                                          │
│  2. Parse YAML using js-yaml or yaml library                    │
│  3. Validate structure (languageId, command, states present)    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Returns: Raw fixture data
                    {
                      languageId: "typescript",
                      command: { spokenForm: "...", ... },
                      initialState: { ... },
                      decorationsState: { ... },  // Optional
                      finalState: { ... }
                    }
```

---

### Phase 2: HTML Generation (Runtime)

```
┌─────────────────────────────────────────────────────────────────┐
│              loadFixture.ts: loadFixture(data)                  │
│                                                                 │
│  Entry point for transforming raw fixture into HTML             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         Process Each State (initialState, decorationsState,     │
│                        finalState)                              │
│                                                                 │
│  For each state:                                                │
│    1. Extract documentContents                                  │
│    2. Extract selections (from state.selections)                │
│    3. Extract marks (from state.marks)                          │
│    4. Extract decorations (from state.decorations, if present)  │
│    5. Build CursorlessFixtureState object                       │
│    6. Call safeGenerateHtml(stateName, state, languageId)       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    For each state → generateHtml()

┌─────────────────────────────────────────────────────────────────┐
│       generateHtml.ts: generateHtml(state, lang)                │
│                                                                 │
│  Creates HTMLGenerator instance and orchestrates generation     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    HTMLGenerator.generate()                     │
│                                                                 │
│  Step 1: Tokenization                                           │
│    • Call getTokens()                                           │
│    • Uses Shiki's codeToTokens()                                │
│    • Returns: Token[][] (array of lines, each line is tokens)   │
│                                                                 │
│  Example token:                                                 │
│    {                                                            │
│      content: "const",                                          │
│      offset: 0,                                                 │
│      color: "#81A1C1",                                          │
│      fontStyle: 0                                               │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                Step 2: Apply Marks (Hat Decorations)            │
│                                                                 │
│  For each mark in state.marks:                                  │
│    1. Get mark position (start.line, start.character)           │
│    2. Call insertHat(lines, position, markType)                 │
│    3. Find token at that character position                     │
│    4. Split token at exact character                            │
│    5. Insert hat token:                                         │
│       {                                                         │
│         type: "hat",                                            │
│         hatType: "default",                                     │
│         offset: position.character,                             │
│         content: original character                             │
│       }                                                         │
│    6. Continue with remainder of token                          │
│                                                                 │
│  Example:                                                       │
│    Before: [{ content: "value", offset: 6 }]                    │
│    After:  [                                                    │
│      { content: "v", offset: 6 },                               │
│      { type: "hat", hatType: "default", content: "a", offset: 7 },│
│      { content: "lue", offset: 8 }                              │
│    ]                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            Step 3: Apply All Selections                         │
│                applyAllSelections()                             │
│                                                                 │
│  Applies in order:                                              │
│    1. decorations (if present)                                  │
│    2. selections (cursor selections)                            │
│    3. thatMark (if present in state.marks["that"])             │
│    4. sourceMark (if present in state.marks["source"])         │
│                                                                 │
│  For each selection type:                                       │
│    • Call applySelectionsFromState(selectionType, selections)   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         applySelectionsFromState(type, selections)              │
│                                                                 │
│  For each selection:                                            │
│    1. Determine if line-level or token-level                    │
│    2. Get CSS classes for selection type                        │
│       • decoration → "decoration"                               │
│       • selection → "selection"                                 │
│       • thatMark → "thatMark"                                   │
│       • sourceMark → "sourceMark"                               │
│                                                                 │
│    3. If entire line selected:                                  │
│         applyLineSelection(lineIndex, classes)                  │
│         → Add classes to line options                           │
│                                                                 │
│    4. Else (token-level):                                       │
│         Create SelectionParser instance                         │
│         parser.parse(selection)                                 │
│         → Returns modified token arrays with selection wrappers │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              SelectionParser.parse(selection)                   │
│                                                                 │
│  Handles multi-line selections:                                 │
│                                                                 │
│  1. For each line in selection range:                           │
│       • parseLine(lineIndex, startChar, endChar, classes)       │
│                                                                 │
│  2. parseLine() delegates to SelectionLineParser:               │
│       lineParser = new SelectionLineParser(                     │
│         tokens, startChar, endChar, classes                     │
│       )                                                         │
│       return lineParser.parse()                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│          SelectionLineParser.parse(startChar, endChar)          │
│                                                                 │
│  Handles single-line token-level selections:                    │
│                                                                 │
│  1. Initialize result array and state:                          │
│       result = []                                               │
│       selectionTokens = []  // Tokens inside selection          │
│       currentOffset = 0                                         │
│                                                                 │
│  2. For each token in line:                                     │
│       tokenState = getTokenState(token, startChar, endChar)     │
│                                                                 │
│       States:                                                   │
│         • "outside" - Token completely outside selection        │
│         • "start" - Selection starts mid-token                  │
│         • "continue" - Selection continues from previous token  │
│         • "end" - Selection ends mid-token                      │
│         • "entire" - Entire token is selected                   │
│         • "inner" - Selection entirely within single token      │
│                                                                 │
│  3. Handle based on state:                                      │
│                                                                 │
│       "outside":                                                │
│         → Push token to result (unchanged)                      │
│                                                                 │
│       "start":                                                  │
│         → Split token at startChar                              │
│         → Push prefix to result (unselected)                    │
│         → Start collecting selected tokens                      │
│                                                                 │
│       "continue":                                               │
│         → Add entire token to selectionTokens                   │
│                                                                 │
│       "end":                                                    │
│         → Split token at endChar                                │
│         → Add prefix to selectionTokens                         │
│         → Wrap selectionTokens in selection token               │
│         → Push to result                                        │
│         → Push suffix to result (unselected)                    │
│                                                                 │
│       "entire":                                                 │
│         → Wrap token in selection                               │
│         → Push to result immediately                            │
│                                                                 │
│       "inner":                                                  │
│         → Split token into three parts:                         │
│           1. Prefix (before selection)                          │
│           2. Selected part (wrapped)                            │
│           3. Suffix (after selection)                           │
│         → Push all three to result                              │
│                                                                 │
│  4. Return modified token array                                 │
│                                                                 │
│  Example:                                                       │
│    Input:  [{ content: "oneLine", offset: 6 }]                  │
│    Selection: 6-9                                               │
│    Output: [                                                    │
│      { content: "one", offset: 6 },                             │
│      {                                                          │
│        type: "selection",                                       │
│        selectionType: "selection",                              │
│        tokens: [{ content: "Lin", offset: 9 }],                 │
│        className: "selection"                                   │
│      },                                                         │
│      { content: "e", offset: 12 }                               │
│    ]                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            Step 4: Render to HTML String                        │
│                renderToHtml(lines, options)                     │
│                                                                 │
│  1. Build <pre> element:                                        │
│       html = elements.pre({                                     │
│         style: theme background color,                          │
│         tabindex: "0"                                           │
│       })                                                        │
│                                                                 │
│  2. Build <code> container:                                     │
│       html += elements.code()                                   │
│                                                                 │
│  3. For each line:                                              │
│       lineClasses = getLineClasses(lineOptions[i])              │
│       html += elements.line(lineClasses)                        │
│                                                                 │
│       For each token in line:                                   │
│         • If regular token:                                     │
│             html += elements.token(token)                       │
│             → <span style="color: ...">content</span>           │
│                                                                 │
│         • If hat token:                                         │
│             html += elements.hat(token)                         │
│             → <span class="hat default">content</span>          │
│                                                                 │
│         • If selection token:                                   │
│             html += elements.selection(token) {                 │
│               // Recursively render inner tokens                │
│               for innerToken in token.tokens:                   │
│                 html += renderToken(innerToken)                 │
│             }                                                   │
│             → <span className="selection">                      │
│                 <span style="color: ...">content</span>         │
│               </span>                                           │
│                                                                 │
│  4. Close </code> and </pre>                                    │
│                                                                 │
│  5. HTML escaping:                                              │
│       All content passed through escapeHtml():                  │
│         & → &amp;                                               │
│         < → &lt;                                                │
│         > → &gt;                                                │
│         " → &quot;                                              │
│         ' → &#39;                                               │
│                                                                 │
│  6. Return complete HTML string                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Returns: HTML string per state
```

---

### Phase 3: Data Aggregation (Runtime)

```
┌─────────────────────────────────────────────────────────────────┐
│            loadFixture.ts: Aggregate Results                    │
│                                                                 │
│  After all states processed:                                    │
│                                                                 │
│  return {                                                       │
│    language: data.languageId,                                   │
│    command: data.command.spokenForm,                            │
│    before: beforeHtml,      // From initialState                │
│    during: duringHtml,      // From decorationsState (optional) │
│    after: afterHtml         // From finalState                  │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Returns: Fixture Display Data
                    {
                      language: "typescript",
                      command: "take item air",
                      before: "<pre>...</pre>",
                      during: "<pre>...</pre>",  // May be undefined
                      after: "<pre>...</pre>"
                    }
```

---

### Phase 4: React Component Rendering (Runtime)

```
┌─────────────────────────────────────────────────────────────────┐
│              Application Loads Component Page                   │
│       (e.g., TestCaseComponentPage or demo page)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│        Load Multiple Fixtures (e.g., in buildDictionary.ts)     │
│                                                                 │
│  const loaded = await Promise.all([                             │
│    loadFixture(data1),                                          │
│    loadFixture(data2),                                          │
│    ...                                                          │
│  ]);                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│      TestCaseComponentPage: Render Multiple Fixtures            │
│                                                                 │
│  <div>                                                          │
│    <h1>Test Component Sheet</h1>                                │
│    {loaded.map((fixtureData) => (                               │
│      <ShikiComponent                                            │
│        key={fixtureData.command}                                │
│        data={fixtureData}                                       │
│      />                                                         │
│    ))}                                                          │
│  </div>                                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         ShikiComponent: Render Single Fixture                   │
│                                                                 │
│  Component receives: data = {                                   │
│    language: "typescript",                                      │
│    command: "take item air",                                    │
│    before: "<pre>...</pre>",                                    │
│    during: "<pre>...</pre>",                                    │
│    after: "<pre>...</pre>"                                      │
│  }                                                              │
│                                                                 │
│  Rendering structure:                                           │
│    <div className="px-4">                                       │
│      <div className="p-8">                                      │
│        <h2>{data.command}</h2>                                  │
│        <div key={data.before}>                                  │
│                                                                 │
│          {data.before && (                                      │
│            <div                                                 │
│              className="p-4"                                    │
│              dangerouslySetInnerHTML={{ __html: data.before }} │
│            />                                                   │
│          )}                                                     │
│                                                                 │
│          {data.during && (                                      │
│            <div                                                 │
│              className="p-4"                                    │
│              dangerouslySetInnerHTML={{ __html: data.during }} │
│            />                                                   │
│          )}                                                     │
│                                                                 │
│          {data.after && (                                       │
│            <div                                                 │
│              className="p-4"                                    │
│              dangerouslySetInnerHTML={{ __html: data.after }}  │
│            />                                                   │
│          )}                                                     │
│                                                                 │
│        </div>                                                   │
│      </div>                                                     │
│      <pre>{JSON.stringify(data, null, 2)}</pre>                 │
│    </div>                                                       │
│                                                                 │
│  Why dangerouslySetInnerHTML?                                   │
│    • HTML is pre-generated and trusted (internal source)        │
│    • Preserves Shiki's rich syntax highlighting                 │
│    • Avoids React re-parsing complex HTML structure             │
│    • Better performance for static HTML content                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Renders HTML                         │
│                                                                 │
│  User sees:                                                     │
│    • Command heading (e.g., "take item air")                    │
│    • "Before" state: Code with selections and hat marks         │
│    • "During" state: Code with flash decorations (if present)   │
│    • "After" state: Code with updated selections/marks          │
│    • Debug output: JSON dump of entire data object              │
│                                                                 │
│  Visual elements:                                               │
│    • Syntax highlighting from Shiki theme                       │
│    • Hat decorations over specific characters                   │
│    • Selection highlights (colored backgrounds)                 │
│    • Decoration highlights (flash effects)                      │
│    • That/source mark highlights                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Visualization Features

### Full Feature Set

The test-case-component can display:

#### 1. Hat Decorations ✅

- **Default hat** - Character-level decoration over specific letter
- **Rendered as**: `<span class="hat default">a</span>`
- **Visual**: Hat character overlaid on code character
- **Location**: Any character in the document (defined by marks in state)

Example:

```typescript
const value = { a: 1, b: 2 };
//              ^ hat here
```

#### 2. Selections ✅

- **User selections** - Highlighted ranges showing cursor selection
- **Rendered as**: `<span className="selection">...</span>`
- **Visual**: Colored background (CSS-defined)
- **Types**:
  - Single cursor (anchor === active)
  - Forward selection (anchor < active)
  - Backward selection (anchor > active)
  - Multi-line selections

#### 3. Decorations ✅

- **Flash highlights** - Transient decorations during command execution
- **Rendered as**: `<span className="decoration">...</span>`
- **Visual**: Colored background (typically flash effect)
- **Only present in**: `during` state (decorationsState)
- **Use case**: Shows what the command is targeting before execution

#### 4. Special Marks ✅

- **That mark** - Previous target reference
  - Rendered as: `<span className="thatMark">...</span>`
  - Key in state.marks: `"that"`

- **Source mark** - Source location for copy/move
  - Rendered as: `<span className="sourceMark">...</span>`
  - Key in state.marks: `"source"`

#### 5. Nested Selections ✅

- **Overlapping ranges** - Multiple selection types on same range
- **Rendered as**: Nested `<span>` elements
- **CSS classes**: Combined (e.g., `className="thatMark selection"`)
- **Example**: That mark containing a selection

#### 6. Partial Token Selection ✅

- **Mid-token splits** - Selection starts/ends inside a token
- **Process**:
  1. Token split at selection boundary
  2. Prefix rendered outside selection
  3. Selected portion wrapped in selection span
  4. Suffix rendered outside selection

Example:

```typescript
oneLine; // Select "Lin" (characters 6-9)
```

Renders as:

```html
<span>one</span>
<span className="selection">Lin</span>
<span>e</span>
```

#### 7. Line-Level Selections ✅

- **Entire line selected** - CSS class on line container
- **Rendered as**: `<span class="line selection">`
- **Visual**: Background color on entire line
- **Detection**: Selection covers entire line (char 0 to line.length)

#### 8. Multi-State Display ✅

- **Before state** - Initial document state
- **During state** - Decorations (optional)
- **After state** - Final document state
- **Side-by-side or sequential**: Configurable in component layout

#### 9. Syntax Highlighting ✅

- **Powered by Shiki**
- **Language support**: Any language Shiki supports
- **Theme**: Configurable (currently uses default Shiki theme)
- **Token colors**: Inline styles from Shiki's theme

#### 10. Multi-Line Support ✅

- **Range continuation** across lines
- **Token management**: Per-line token arrays
- **Selection spanning**: Lines handled by SelectionParser

---

### What Cannot Be Visualized

#### ❌ Scope Ranges (Domain/Content/Removal)

- **Not supported**: .scope file properties (domain, content, removal)
- **Reason**: Recorded fixtures don't have this data structure
- **Alternative**: Would need to extend fixture format

#### ❌ Iteration Highlights

- **Not supported**: Teal highlights for iteration targets
- **Reason**: No iteration metadata in recorded fixtures
- **Alternative**: Would need to parse command structure to detect

#### ❌ Interactive Controls

- **Not supported**: Content/removal toggle, whitespace rendering, copy button
- **Reason**: ShikiComponent is a simple display component
- **Alternative**: Could extend component with ScopeVisualizer features

#### ❌ Border Styling

- **Not supported**: Solid vs. porous borders, corner radius
- **Reason**: Uses CSS classes, not inline border styles
- **Alternative**: Could implement calculateHighlights.ts logic

#### ❌ Color Blending

- **Not supported**: Overlapping range color blending
- **Reason**: Uses nested spans with CSS cascade
- **Visual**: Innermost span color takes precedence
- **Alternative**: Would need flattenHighlights.ts logic

#### ❌ Clipboard/Return Value/Errors

- **Not visualized**: These properties are captured but not displayed
- **Reason**: ShikiComponent only displays code states
- **Data**: Available in debug JSON output at bottom of component
- **Alternative**: Could create separate UI elements for these

---

## Examples

### Example 1: Simple Selection

**File**: `data/fixtures/recorded/languages/typescript/takeAir.yml`

```yaml
languageId: typescript
command:
  version: 6
  spokenForm: take air
  action:
    name: setSelection
    target:
      type: primitive
      mark: { type: decoratedSymbol, symbolColor: default, character: a }
initialState:
  documentContents: |
    const value = 42;
  selections:
    - anchor: { line: 0, character: 0 }
      active: { line: 0, character: 0 }
  marks:
    default.a:
      start: { line: 0, character: 6 }
      end: { line: 0, character: 7 }
finalState:
  documentContents: |
    const value = 42;
  selections:
    - anchor: { line: 0, character: 6 }
      active: { line: 0, character: 11 }
```

**Pipeline**:

1. **loadFixture()** receives YAML data
2. **generateHtml()** for initialState:
   - Tokenizes: `[{content: "const"}, {content: " "}, {content: "value"}, ...]`
   - Applies mark at char 6: Inserts hat on "v"
   - Applies cursor at char 0: No visible selection
   - Renders HTML: `<pre>...<span class="hat default">v</span>alue...</pre>`
3. **generateHtml()** for finalState:
   - Tokenizes same code
   - Applies mark at char 6: Hat on "v"
   - Applies selection 6-11: Wraps "value" in selection span
   - Renders HTML: `<pre>...<span className="selection"><span class="hat default">v</span>alue</span>...</pre>`
4. **ShikiComponent** displays both states

**User sees**:

- **Before**: Code with hat over "v", cursor at start
- **After**: Code with hat over "v", "value" highlighted as selection

---

### Example 2: Decorations State

**File**: `data/fixtures/recorded/decorations/chuckBlockAir.yml`

```yaml
languageId: typescript
command:
  version: 6
  spokenForm: chuck block air
  action:
    name: remove
    target:
      type: primitive
      modifiers:
        - type: containingScope
          scopeType: { type: namedFunction }
      mark: { type: decoratedSymbol, symbolColor: default, character: a }
initialState:
  documentContents: |
    function foo() {
      const x = 1;
    }
  marks:
    default.a:
      start: { line: 1, character: 8 }
      end: { line: 1, character: 9 }
decorationsState:
  documentContents: |
    function foo() {
      const x = 1;
    }
  decorations:
    - anchor: { line: 0, character: 0 }
      active: { line: 2, character: 1 }
      style: referenced-target
finalState:
  documentContents: ""
```

**Pipeline**:

1. **loadFixture()** processes three states
2. **generateHtml()** for initialState:
   - Applies hat mark on "x"
   - No selections
3. **generateHtml()** for decorationsState:
   - Applies decoration covering entire function (lines 0-2)
   - Multi-line decoration wraps all tokens
   - Renders with `className="decoration"`
4. **generateHtml()** for finalState:
   - Empty document
   - Renders empty `<pre></pre>`
5. **ShikiComponent** displays all three states

**User sees**:

- **Before**: Function with hat on "x"
- **During**: Entire function highlighted with decoration flash
- **After**: Empty document (function deleted)

---

### Example 3: That Mark

**File**: `data/fixtures/recorded/actions/bringAirToThat.yml`

```yaml
languageId: typescript
command:
  version: 6
  spokenForm: bring air to that
  action:
    name: insert
    target:
      type: primitive
      mark: { type: decoratedSymbol, symbolColor: default, character: a }
    destination:
      type: primitive
      mark: { type: that }
initialState:
  documentContents: |
    const foo = 1;
    const bar = 2;
  marks:
    default.a:
      start: { line: 0, character: 6 }
      end: { line: 0, character: 9 }
    that:
      start: { line: 1, character: 6 }
      end: { line: 1, character: 9 }
finalState:
  documentContents: |
    const foo = 1;
    const foobar = 2;
  marks:
    that:
      start: { line: 1, character: 6 }
      end: { line: 1, character: 9 }
```

**Pipeline**:

1. **loadFixture()** processes both states
2. **generateHtml()** for initialState:
   - Applies hat mark on "foo" (line 0)
   - Applies that mark on "bar" (line 1)
   - Both rendered with different CSS classes
3. **generateHtml()** for finalState:
   - Applies that mark on "foo" (inserted text)
   - Document contents changed to "foobar"
4. **ShikiComponent** displays both states

**User sees**:

- **Before**: Hat on "foo", that mark on "bar"
- **After**: "bar" changed to "foobar", that mark on inserted "foo"

---

### Example 4: Nested Selection (That Mark + Selection)

**File**: `data/fixtures/recorded/actions/takeItemThat.yml`

```yaml
languageId: typescript
command:
  version: 6
  spokenForm: take item that
initialState:
  documentContents: |
    {a: 1, b: 2}
  marks:
    that:
      start: { line: 0, character: 1 }
      end: { line: 0, character: 5 }
finalState:
  selections:
    - anchor: { line: 0, character: 1 }
      active: { line: 0, character: 5 }
  marks:
    that:
      start: { line: 0, character: 1 }
      end: { line: 0, character: 5 }
```

**Pipeline**:

1. **generateHtml()** for finalState:
   - Applies that mark on "a: 1" (chars 1-5)
   - Applies selection on "a: 1" (chars 1-5) - **same range**
   - **Order matters**: Decorations first, then selections, then marks
   - Results in nested structure or combined classes

**Rendering**:

```html
<span className="thatMark selection">
  <span style="color: ...">a: 1</span>
</span>
```

**User sees**:

- "a: 1" highlighted with both that mark and selection styles
- CSS cascade determines final visual appearance

---

### Example 5: Partial Token Selection

**File**: Test case from `generateHtml.spec.ts`

```typescript
// Test: "should select inside single token"
const state = {
  documentContents: "const oneLine = 42;",
  selections: [
    {
      anchor: { line: 0, character: 8 }, // "Li" inside "oneLine"
      active: { line: 0, character: 10 },
    },
  ],
};
```

**Pipeline**:

1. **Tokenization**:

   ```javascript
   [
     { content: "const", offset: 0 },
     { content: " ", offset: 5 },
     { content: "oneLine", offset: 6 },  // ← Will be split
     { content: " ", offset: 13 },
     ...
   ]
   ```

2. **SelectionLineParser**:
   - Finds "oneLine" token (offset 6-13)
   - Selection 8-10 is inside this token (state: "inner")
   - Splits into three parts:
     - "one" (chars 6-8) - before selection
     - "Li" (chars 8-10) - selected
     - "e" (chars 10-13) - after selection

3. **Rendered HTML**:
   ```html
   <span style="color: #...">const</span>
   <span style="color: #..."> </span>
   <span style="color: #...">one</span>
   <span className="selection">
     <span style="color: #...">Li</span>
   </span>
   <span style="color: #...">e</span>
   ```

**User sees**:

- "const oneLine = 42;"
- Only "Li" highlighted as selection

---

## Technical Details

### Token Types

The HTMLGenerator works with three token types:

#### 1. Regular Token (from Shiki)

```typescript
{
  content: "const",
  offset: 0,
  color: "#81A1C1",
  fontStyle: 0
}
```

#### 2. Hat Token (inserted by insertHat)

```typescript
{
  type: "hat",
  hatType: "default",
  content: "a",
  offset: 16
}
```

#### 3. Selection Token (created by SelectionParser)

```typescript
{
  type: "selection",
  selectionType: "selection",  // or "decoration", "thatMark", "sourceMark"
  tokens: [...],  // Nested tokens
  className: "selection"
}
```

---

### Selection Application Order

Critical for correct nesting:

1. **decorations** - Applied first (innermost)
2. **selections** - Applied second
3. **thatMark** - Applied third
4. **sourceMark** - Applied last (outermost)

**Example**:
If a range has both decoration and selection:

```html
<span className="decoration">
  <span className="selection">
    <span style="color: ...">content</span>
  </span>
</span>
```

---

### Line Options

Line-level CSS classes stored separately:

```typescript
lineOptions: Map<number, { classes: Set<string> }>

// Example:
lineOptions.set(0, { classes: new Set(["selection"]) })

// Renders as:
<span class="line selection">...</span>
```

---

### Performance Characteristics

#### Tokenization

- **Complexity**: O(n) where n = document length
- **Bottleneck**: Shiki parsing (unavoidable)
- **Typical**: <50ms for 100-line documents

#### Hat Application

- **Complexity**: O(m × t) where m = marks, t = avg tokens per line
- **Typical**: <10ms for 10 marks

#### Selection Application

- **Complexity**: O(s × t × p) where s = selections, p = parsing per token
- **Worst case**: O(n²) for many overlapping selections
- **Typical**: <20ms for 5 selections

#### HTML Rendering

- **Complexity**: O(n) where n = total tokens
- **Typical**: <10ms for 1000 tokens

**Total Pipeline**: ~100-200ms per fixture state

---

## Architecture Notes

### Two-Phase Design

**Phase 1: HTML Generation (Data Layer)**

- Pure functions
- No React dependencies
- Synchronous processing (except Shiki)
- Outputs: HTML strings

**Phase 2: React Display (Presentation Layer)**

- React components
- Injects pre-generated HTML
- No data transformation
- Outputs: DOM elements

**Benefits**:

- Separation of concerns
- HTML can be cached
- HTML can be generated server-side
- React re-renders don't trigger regeneration

---

### Why dangerouslySetInnerHTML?

**Rationale**:

1. **Performance**: Avoids React parsing complex HTML
2. **Preservation**: Maintains Shiki's exact HTML structure
3. **Trust**: HTML source is internal and controlled
4. **Simplicity**: No need to convert HTML to React elements

**Trade-offs**:

- ❌ No React event handlers on nested elements
- ❌ No React reconciliation of HTML content
- ✅ Faster rendering
- ✅ Simpler code

---

### Comparison to ScopeVisualizer

| Feature                  | test-case-component      | ScopeVisualizer               |
| ------------------------ | ------------------------ | ----------------------------- |
| **Architecture**         | Two-phase (HTML → React) | Single-phase (integrated)     |
| **HTML Generation**      | Pre-generated strings    | Runtime via Shiki decorations |
| **Token Manipulation**   | Manual token splitting   | Range-based decorations       |
| **Hat Support**          | ✅ Full support          | ❌ Not supported              |
| **Color Blending**       | ❌ CSS cascade only      | ✅ Algorithmic blending       |
| **Border Styling**       | ❌ Basic CSS             | ✅ Solid/porous per side      |
| **Interactive Controls** | ❌ Not implemented       | ✅ Toggle, copy, whitespace   |
| **State Display**        | ✅ Before/during/after   | ❌ Single state only          |
| **Use Case**             | Command execution tests  | Scope definition tests        |

---

## Summary

### Data Flow

```
YAML Fixture on Disk
  ↓ (Runtime: loadFixture.ts)
Raw Fixture Data
  ↓ (For each state: generateHtml.ts)
Tokenization → Hat Application → Selection Application → HTML Rendering
  ↓ (Per state)
HTML Strings (before, during, after)
  ↓ (Runtime: ShikiComponent)
React Component with dangerouslySetInnerHTML
  ↓ (Browser)
Rendered Visualization
```

### Key Capabilities

✅ **Visualizes**: Hats, selections, decorations, that/source marks
✅ **Supports**: Multi-line ranges, partial token selections, nested selections
✅ **States**: Before/during/after display
✅ **Syntax**: Full Shiki highlighting support
✅ **Performance**: ~100-200ms per fixture

❌ **Limitations**: No interactive controls, no color blending, no border styling, no scope ranges

### File Format Summary

```yaml
languageId: <language>
command:
  version: 6
  spokenForm: <spoken command>
  action: <parsed command structure>
initialState:
  documentContents: <code>
  selections: [{ anchor, active }]
  marks: { <key>: { start, end } }
decorationsState: # Optional
  decorations: [{ anchor, active, style }]
finalState:
  documentContents: <code>
  selections: [{ anchor, active }]
```

**States Visualized**:

- `initialState` → `before` HTML
- `decorationsState` → `during` HTML (optional)
- `finalState` → `after` HTML

**Key Distinction from .scope files**:

- Recorded fixtures: **Temporal** (before → after)
- .scope files: **Spatial** (domain/content/removal ranges)
