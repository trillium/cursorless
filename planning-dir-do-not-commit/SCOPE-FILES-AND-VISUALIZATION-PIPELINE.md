# .scope Files and ScopeVisualizer Pipeline Documentation

## Executive Summary

This document provides a comprehensive guide to **`.scope` files** - the fixture format used by Cursorless to test and document scope support across programming languages - and the complete data pipeline from `.scope` file on disk to rendered visualization on the documentation site.

**Key Facts**:

- **Location**: `data/fixtures/scopes/`
- **Format**: Human-readable text with visual range markers
- **Purpose**: Test scope identification + Generate documentation
- **Processing**: Docusaurus plugin → React component → Shiki rendering

---

## Table of Contents

1. [.scope File Format](#scope-file-format)
2. [Range Notation](#range-notation)
3. [Highlight Types](#highlight-types)
4. [Complete Data Pipeline](#complete-data-pipeline)
5. [File Discovery & Loading](#file-discovery--loading)
6. [Parsing Process](#parsing-process)
7. [Visualization Features](#visualization-features)
8. [Examples](#examples)

---

## .scope File Format

### Basic Structure

Every `.scope` file has two sections separated by `---`:

```
<source code>
---
<scope definitions with visual markers>
```

### Anatomy of a .scope File

```
{"aaa": 0, "bbb": 1}
---

[Content] =
[Domain] = 0:1-0:19
   >------------------<
0| {"aaa": 0, "bbb": 1}
```

**Components**:

1. **Source Code** (line 1): The actual code being tested
2. **Delimiter** (line 2): Three dashes `---` separate code from definitions
3. **Property Declarations** (lines 4-5): Define what ranges to extract
4. **Visual Markers** (lines 6-8): Human-readable representation showing ranges

---

### Property Types

#### Core Properties

| Property    | Purpose                                           | Required | Example Value |
| ----------- | ------------------------------------------------- | -------- | ------------- |
| `[Content]` | The main content of the scope                     | Yes      | `0:6-0:9`     |
| `[Domain]`  | The containing context (e.g., enclosing function) | No       | `0:0-0:16`    |
| `[Removal]` | What gets deleted in a removal operation          | No       | `0:5-0:10`    |

#### Delimiter Properties (Ignored by ScopeVisualizer)

These are used for testing but **not visualized**:

| Property                | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `[Insertion delimiter]` | Character(s) to insert when creating new scope |
| `[Leading delimiter]`   | Delimiter before scope content                 |
| `[Trailing delimiter]`  | Delimiter after scope content                  |
| `[Interior]`            | Interior of a surrounding pair                 |
| `[Boundary L]`          | Left boundary                                  |
| `[Boundary R]`          | Right boundary                                 |

**Note**: ScopeVisualizer only processes `Content`, `Domain`, and `Removal` properties. All other properties are parsed but discarded during visualization.

---

### Multi-Scope and Multi-Target Files

#### Multiple Scopes

Use `[#N ...]` notation where N is the scope number:

```
foo:
    bar = 0
---

[#1 Content] =
[#1 Domain] = 0:0-1:11
  >----
0| foo:
1|     bar = 0
   -----------<

[#2 Content] =
[#2 Domain] = 1:4-1:11
      >-------<
1|     bar = 0
```

**Scope #1**: The entire statement including "foo:"
**Scope #2**: Just the "bar = 0" assignment

#### Multiple Targets (Iteration)

Use `[#N.M ...]` notation where N is scope number, M is target number:

```
{aaa: 0, bbb: 1}
---

[#1.1 Content] = 0:1-0:7
[#1.2 Content] = 0:9-0:15
[Domain] = 0:0-0:16
```

**Target 1**: `aaa: 0`
**Target 2**: `bbb: 1`
**Domain**: The entire object

---

## Range Notation

### Concise Format

Ranges use **zero-indexed** line:character notation:

```
line:character-line:character
```

**Examples**:

- `0:5-0:10` - Line 0, characters 5-10 (single line)
- `1:0-3:5` - Line 1 char 0 through line 3 char 5 (multi-line)
- `2:4-2:4` - Empty range at line 2, character 4 (zero-width)

### Visual Format

The visual markers use ASCII art to show ranges:

```
   >------------------<
0| {"aaa": 0, "bbb": 1}
```

- `>` marks the start of a range
- `<` marks the end of a range
- `-` fills the range
- Line numbers (`0|`, `1|`, etc.) help locate positions

**Multi-line ranges**:

```
      >
0| foo:
1|     bar = 0
   -----------<
```

The `>` on line 0 extends down to the `<` on line 1.

---

## Highlight Types

ScopeVisualizer can display three types of highlights:

### 1. Domain Highlighting

**Color**: Cyan (`#00e1ff18` background)
**Purpose**: Shows the containing scope or context
**Example**: The entire function when highlighting a statement inside it

```javascript
function example() {
  // ← Domain includes this
  const x = 1; // ← and this
} // ← and this
```

---

### 2. Content Highlighting

**Color**: Purple/Magenta (`#ad00bc5b` background)
**Purpose**: Shows the core content of the scope
**Example**: Just the function name, or just the variable value

```javascript
function example() {
  // "example" is content
  const x = 1; // "x" is content (variable name)
}
```

---

### 3. Removal Highlighting

**Color**: Red (`#ff00002d` background)
**Purpose**: Shows what would be deleted in a removal operation
**Example**: May include more than content (like trailing commas, whitespace)

```javascript
const x = 1,
  y = 2; // Removal might include the comma after x
```

**Toggle**: Users can switch between Content and Removal view

---

### 4. Iteration Highlighting

**Color**: Teal (`#00725f6c` background)
**Purpose**: Shows individual items in an iterable scope
**Example**: Each parameter in a function, each item in a list

```javascript
function foo(a, b, c) {
  // Each of a, b, c highlighted separately
  // ...
}
```

**Detection**: Automatically applied when a facet name includes "iteration"

---

### Border Styles

**Solid Borders**: Used for continuous edges (single-line ranges)
**Porous Borders**: Used for line-crossing edges (multi-line ranges, dashed appearance)

**Corner Radius**: Applied at the start/end of ranges for visual polish

---

## Complete Data Pipeline

### Phase 1: File Discovery (Build Time)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docusaurus Build Starts                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│          scope-tests-plugin.ts: loadContent()                   │
│                                                                 │
│  1. Set CURSORLESS_REPO_ROOT environment variable              │
│  2. Call prepareAssets()                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         getFixturePaths.ts: getScopeTestPaths()                 │
│                                                                 │
│  1. Scan data/fixtures/scopes/ recursively                      │
│  2. Filter files ending with .scope                             │
│  3. Extract metadata from file path:                            │
│     • languageId: First directory name                          │
│       (e.g., "typescript", "python", "javascript.core")        │
│     • facet: Filename without number suffix                     │
│       (e.g., "namedFunction.iteration" from                     │
│        "namedFunction.iteration2.scope")                        │
│     • name: Relative path without extension                     │
│       (e.g., "scopes/typescript/namedFunction.iteration2")     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Returns: ScopeTestPath[]
                    [
                      {
                        path: "/full/path/to/file.scope",
                        name: "scopes/typescript/namedFunction",
                        languageId: "typescript",
                        facet: "namedFunction.iteration"
                      },
                      ...
                    ]
```

---

### Phase 2: Parsing (Build Time)

```
┌─────────────────────────────────────────────────────────────────┐
│           For Each .scope File in ScopeTestPath[]               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         scope-tests-plugin.ts: parseTest()                      │
│                                                                 │
│  1. Read file contents (fs.readFileSync)                        │
│  2. Normalize line endings (\r\n → \n)                          │
│  3. Find delimiter '---' (using regex /^---$/m)                 │
│  4. Split into two parts:                                       │
│     • code = everything before '---'                            │
│     • definitions = everything after '---'                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Line-by-Line Parsing                         │
│                                                                 │
│  For each line in definitions section:                          │
│                                                                 │
│  1. parseLine() - Extract header and value                      │
│     Input:  "[#2.1 Content] = 0:5-0:10"                         │
│     Output: {                                                   │
│       scopeIndex: "2",                                          │
│       targetIndex: "1",                                         │
│       type: "Content",                                          │
│       value: "0:5-0:10"                                         │
│     }                                                           │
│                                                                 │
│  2. processLine() - Handle based on type                        │
│     • "Domain" → currentScope.domain = value                    │
│     • "Content" → currentTarget.content = value                 │
│     • "Removal" → currentTarget.removal = value                 │
│     • Other types → Ignored (but validated)                     │
│                                                                 │
│  3. Scope/Target Management:                                    │
│     • New scope index? → Push current scope, start new          │
│     • New target index? → Push current target, start new        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Returns: Fixture
                    {
                      name: "scopes/typescript/namedFunction",
                      languageId: "typescript",
                      facet: "namedFunction.iteration",
                      code: "function foo() { }",
                      scopes: [
                        {
                          domain: "0:0-0:18",
                          targets: [
                            { content: "0:9-0:12" }
                          ]
                        }
                      ]
                    }
```

---

### Phase 3: Data Storage (Build Time)

```
┌─────────────────────────────────────────────────────────────────┐
│           scope-tests-plugin.ts: prepareAssets()                │
│                                                                 │
│  Collect all parsed fixtures into ScopeTests object:            │
│                                                                 │
│  {                                                              │
│    imports: {                                                   │
│      "typescript": ["typescript.core", "typescriptreact"],     │
│      "javascript": ["javascript.core", "javascriptreact"],     │
│      ...                                                        │
│    },                                                           │
│    fixtures: [                                                  │
│      { name, languageId, facet, code, scopes },                │
│      ...                                                        │
│    ]                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│          scope-tests-plugin.ts: contentLoaded()                 │
│                                                                 │
│  actions.setGlobalData(scopeTests)                              │
│                                                                 │
│  Stores data in Docusaurus global data store                   │
│  Accessible via usePluginData("scope-tests-plugin")            │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 4: Filtering & Organization (Runtime)

```
┌─────────────────────────────────────────────────────────────────┐
│           User Navigates to Documentation Page                  │
│         (e.g., /docs/user/scopes/typescript)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│       ScopeVisualizer.tsx: Component Initialization             │
│                                                                 │
│  const scopeTests = usePluginData("scope-tests-plugin");       │
│  const [scopes] = useState(                                     │
│    getScopeFixtures(scopeTests, languageId, scopeTypeType)     │
│  );                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│      ScopeVisualizer.tsx: getScopeFixtures()                    │
│                                                                 │
│  1. Filter fixtures:                                            │
│     • By languageId (if specified)                              │
│     • By scopeTypeType (if specified)                           │
│     • Exclude private scopes (start with "private.")            │
│                                                                 │
│  2. Normalize language IDs:                                     │
│     • "javascript.core" → "javascript"                          │
│     • "typescript.core" → "typescript"                          │
│     • "javascript.jsx" → "javascriptreact"                      │
│                                                                 │
│  3. Group fixtures by scope type:                               │
│     scopeMap[scopeTypeType] = {                                 │
│       scopeTypeType: "namedFunction",                           │
│       name: "Named function",  // Prettified                    │
│       facets: []                                                │
│     }                                                           │
│                                                                 │
│  4. Group by facet within each scope:                           │
│     facetMap[facet] = {                                         │
│       facet: "namedFunction.iteration",                         │
│       name: "Named function (iteration)",  // Prettified        │
│       info: {                                                   │
│         description: "...",                                     │
│         scopeType: {...},                                       │
│         isIteration: true                                       │
│       },                                                        │
│       fixtures: []                                              │
│     }                                                           │
│                                                                 │
│  5. Sort:                                                       │
│     • Scopes alphabetically                                     │
│     • Facets alphabetically (iteration facets last)             │
│     • Fixtures alphabetically                                   │
│                                                                 │
│  6. Separate public vs. internal scopes:                        │
│     {                                                           │
│       public: [/* User-facing scopes */],                       │
│       internal: [/* Implementation scopes */]                   │
│     }                                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 5: Decoration Generation (Runtime)

```
┌─────────────────────────────────────────────────────────────────┐
│         For Each Fixture to Display (in Code.tsx)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│      calculateHighlights.ts: generateDecorations()              │
│                                                                 │
│  Input:                                                         │
│    • fixture: Fixture (with code and scopes)                    │
│    • rangeType: "content" | "removal"                           │
│    • isIteration: boolean                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Step 1: Extract Ranges (getRanges)                 │
│                                                                 │
│  For each scope in fixture.scopes:                              │
│    • Extract domain range (if present)                          │
│      domainRanges.push(Range.fromConcise(scope.domain))        │
│                                                                 │
│    • Extract target ranges:                                     │
│      for each target:                                           │
│        if rangeType === "content":                              │
│          targetRanges.push(Range.fromConcise(target.content))  │
│        else:                                                    │
│          targetRanges.push(Range.fromConcise(                  │
│            target.removal ?? target.content                     │
│          ))                                                     │
│                                                                 │
│  Result:                                                        │
│    {                                                            │
│      domainRanges: [Range("0:0-0:16"), ...],                   │
│      targetRanges: [Range("0:1-0:7"), Range("0:9-0:15"), ...]  │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         Step 2: Select Colors (getColors)                       │
│                                                                 │
│  Based on context:                                              │
│    • domain: Always cyan (#00e1ff18)                            │
│    • target:                                                    │
│      - If isIteration: teal (#00725f6c)                         │
│      - Else if rangeType === "content": purple (#ad00bc5b)     │
│      - Else if rangeType === "removal": red (#ff00002d)        │
│                                                                 │
│  Each color includes:                                           │
│    • background: Semi-transparent fill                          │
│    • borderSolid: Opaque border for continuous edges           │
│    • borderPorous: Semi-transparent for line-crossing edges    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│    Step 3: Convert to Line-Based Decorations (getDecorations)  │
│                                                                 │
│  For each range (domain and target):                            │
│                                                                 │
│    1. Get code line ranges:                                     │
│       lineRanges = code.split('\n').map((line, i) =>           │
│         Range(i, 0, i, line.length)                             │
│       )                                                         │
│                                                                 │
│    2. Call generateDecorationsForCharacterRange():              │
│       • Splits range at line boundaries                         │
│       • Determines border styles:                               │
│         - Top/Bottom: solid if at range start/end               │
│         - Left: solid if at line start                          │
│         - Right: porous if continues to next line               │
│                                                                 │
│    Result: Decoration[] with border styles                      │
│      [                                                          │
│        {                                                        │
│          range: Range("0:5-0:10"),                              │
│          style: {                                               │
│            top: solid,                                          │
│            bottom: solid,                                       │
│            left: solid,                                         │
│            right: solid                                         │
│          }                                                      │
│        }                                                        │
│      ]                                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│     Step 4: Create Styled Highlights (getHighlights)           │
│                                                                 │
│  For each decoration:                                           │
│    {                                                            │
│      range: Range,                                              │
│      style: {                                                   │
│        backgroundColor: colors.background,                      │
│        borderColorSolid: colors.borderSolid,                    │
│        borderColorPorous: colors.borderPorous,                  │
│        borderStyle: { top, bottom, left, right },               │
│        borderRadius: {                                          │
│          topLeft: useSingleCornerBorderRadius(top, left),      │
│          topRight: useSingleCornerBorderRadius(top, right),    │
│          bottomRight: useSingleCornerBorderRadius(bottom, right),│
│          bottomLeft: useSingleCornerBorderRadius(bottom, left) │
│        }                                                        │
│      }                                                          │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│       Step 5: Flatten Overlaps (flattenHighlights)             │
│                                                                 │
│  1. Extract all unique positions:                               │
│     positions = [highlight.range.start, highlight.range.end]   │
│     Sort and deduplicate                                        │
│                                                                 │
│  2. Create segments between positions:                          │
│     For each pair of adjacent positions:                        │
│       • Find all highlights intersecting this segment           │
│       • Blend background colors:                                │
│         backgroundColor = blendMultipleColors([...])            │
│       • Take borders from outermost highlight                   │
│       • Apply corner radius only at original boundaries         │
│                                                                 │
│  3. Handle empty ranges (zero-width highlights)                 │
│                                                                 │
│  Example:                                                       │
│    Input:  [0:0-0:10 domain], [0:5-0:15 content]               │
│    Output: [0:0-0:5 domain],                                    │
│            [0:5-0:10 domain+content blended],                   │
│            [0:10-0:15 content]                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│   Step 6: Convert to Shiki Format (highlightsToDecorations)    │
│                                                                 │
│  For each highlight:                                            │
│    {                                                            │
│      start: { line, character },                                │
│      end: { line, character },                                  │
│      alwaysWrap: true,                                          │
│      properties: {                                              │
│        style: "background-color: ...; border-color: ...; ..."  │
│      }                                                          │
│    }                                                            │
│                                                                 │
│  Border color selection:                                        │
│    • If borderStyle is solid: use borderColorSolid             │
│    • If borderStyle is porous: use borderColorPorous           │
│                                                                 │
│  Border style conversion:                                       │
│    { top: solid, right: porous, ... }                           │
│    → "solid dashed none solid"                                  │
│                                                                 │
│  Border radius:                                                 │
│    { topLeft: true, topRight: false, ... }                      │
│    → "4px 0 0 4px"                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                  Returns: DecorationItem[]
```

---

### Phase 6: HTML Generation (Runtime)

```
┌─────────────────────────────────────────────────────────────────┐
│                  Code.tsx: useEffect Hook                       │
│                                                                 │
│  useEffect(() => {                                              │
│    // Preprocess whitespace if enabled                          │
│    const code = renderWhitespace                                │
│      ? fixture.code.replaceAll(' ', '␣').replaceAll('\t', '⭾') │
│      : fixture.code;                                            │
│                                                                 │
│    // Call Shiki with decorations                               │
│    codeToHtml(code, {                                           │
│      lang: getFallbackLanguage(languageId),                     │
│      theme: "nord",                                             │
│      decorations: decorations  // ← From Phase 5                │
│    }).then(html => {                                            │
│      // Post-process whitespace symbols                         │
│      if (renderWhitespace) {                                    │
│        html = html                                              │
│          .replace(/␣/g, '<span class="code-ws-symbol">·</span>') │
│          .replace(/⭾/g, '<span class="code-ws-symbol"> →  </span>'); │
│      }                                                          │
│      setHtml(html);                                             │
│    });                                                          │
│  }, [languageId, renderWhitespace, decorations, children]);    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Shiki: codeToHtml()                          │
│                                                                 │
│  1. Tokenize code with syntax highlighting                      │
│  2. Apply decorations to tokens:                                │
│     • Wrap tokens in decoration ranges with <span>             │
│     • Apply inline styles from properties.style                │
│     • Set alwaysWrap to ensure decorations are rendered        │
│  3. Generate HTML string with nord theme colors                 │
│                                                                 │
│  Output: HTML string like:                                      │
│    <pre class="shiki" style="background-color: ...">           │
│      <code>                                                     │
│        <span class="line">                                      │
│          <span style="color: #...">const</span>                 │
│          <span style="background-color: #ad00bc5b; ...">        │
│            <span style="color: #...">x</span>                   │
│          </span>                                                │
│          ...                                                    │
│        </span>                                                  │
│      </code>                                                    │
│    </pre>                                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               Code.tsx: Render to DOM                           │
│                                                                 │
│  return (                                                       │
│    <div className="code-container">                             │
│      <a href={link.url}>GitHub</a>                              │
│      <button onClick={handleCopy}>Copy</button>                 │
│      <div dangerouslySetInnerHTML={{ __html: html }} />        │
│    </div>                                                       │
│  );                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Renders HTML                         │
│                                                                 │
│  User sees:                                                     │
│    • Syntax-highlighted code (nord theme)                       │
│    • Colored overlays for domains/targets                       │
│    • Borders around highlighted ranges                          │
│    • Copy button and GitHub link                                │
│    • Whitespace symbols (if enabled)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Visualization Features

### Full Feature Set

ScopeVisualizer can display:

#### 1. Range Highlights ✅

- **Domain ranges** (cyan background)
- **Content ranges** (purple background)
- **Removal ranges** (red background)
- **Iteration ranges** (teal background)

#### 2. Border Styling ✅

- **Solid borders** for continuous edges
- **Porous (dashed) borders** for line-crossing edges
- **Corner radius** at range boundaries
- **Per-side border control** (top, right, bottom, left)

#### 3. Overlap Resolution ✅

- **Color blending** where ranges overlap
- **Non-overlapping segments** (automatic splitting)
- **Nested highlighting** (borders from outermost highlight)

#### 4. Multi-Line Support ✅

- **Range continuation** across lines
- **Line-aware border styles** (porous right border when continuing)
- **Multi-line visual markers** in .scope files

#### 5. Interactive Controls ✅

- **Content vs. Removal toggle** (switch what's highlighted)
- **Whitespace rendering** (show spaces/tabs as symbols)
- **Copy to clipboard** (copy raw code)
- **GitHub links** (view fixture source)

#### 6. Language Support ✅

- **Any language supported by Shiki**
- **Fallback language mapping** (e.g., JSX → jsx, TSX → tsx)
- **Multi-language display** (for scope type pages)

#### 7. Organizational Features ✅

- **Facet grouping** (e.g., "Named function: Content", "Named function (iteration)")
- **Language grouping** (for scope type pages)
- **Public vs. Internal scopes** (separate sections)
- **Alphabetical sorting** (with iteration facets at end)

#### 8. Documentation Integration ✅

- **Dynamic Table of Contents** (auto-generated from headings)
- **Hash navigation** (scroll to specific scopes/facets)
- **Responsive design** (mobile-friendly)
- **Dark mode support** (via Tailwind classes)

---

### What Cannot Be Highlighted

#### ❌ Hat Decorations

- **Not supported**: Character-level "hat" marks over specific letters
- **Reason**: .scope files don't have a hat notation
- **Alternative**: Would need to add hat support to .scope format

#### ❌ Individual Delimiters

- **Not visualized**: Leading delimiter, trailing delimiter, insertion delimiter
- **Reason**: ScopeVisualizer only processes Content, Domain, and Removal
- **Data**: Properties are parsed but discarded during visualization

#### ❌ Boundary Ranges

- **Not visualized**: Boundary L, Boundary R
- **Reason**: Same as delimiters - parsed but not used

#### ❌ Interior Ranges

- **Not visualized**: Interior property
- **Reason**: Not part of the visualization feature set

#### ❌ Custom Styling

- **Limited**: Cannot specify custom colors per fixture
- **Reason**: Colors are hardcoded in highlightColors.ts
- **Workaround**: Would need to extend .scope format and color selection logic

---

## Examples

### Example 1: Simple Scope

**File**: `javascript.core/map.scope`

```
{aaa: 0, bbb: 1}
---

[Content] =
[Removal] =
[Domain] = 0:0-0:16
  >----------------<
0| {aaa: 0, bbb: 1}

[Insertion delimiter] = " "
```

**Parsed Result**:

```javascript
{
  name: "scopes/javascript.core/map",
  languageId: "javascript",
  facet: "map",
  code: "{aaa: 0, bbb: 1}",
  scopes: [
    {
      domain: "0:0-0:16",
      targets: [
        { content: "" }  // Empty because [Content] =
      ]
    }
  ]
}
```

**Visualization**:

- **Domain highlight** covers entire object (cyan)
- **No content highlight** (content range is empty)
- User can toggle to "Removal" view, but removal is also empty

---

### Example 2: Iteration Scope

**File**: `json/value.mapPair.iteration.scope`

```
{"aaa": 0, "bbb": 1}
---

[Content] =
[Domain] = 0:1-0:19
   >------------------<
0| {"aaa": 0, "bbb": 1}
```

**Parsed Result**:

```javascript
{
  name: "scopes/json/value.mapPair.iteration",
  languageId: "json",
  facet: "value.mapPair.iteration",  // ← Contains "iteration"
  code: '{"aaa": 0, "bbb": 1}',
  scopes: [
    {
      domain: "0:1-0:19",
      targets: [
        { content: "" }
      ]
    }
  ]
}
```

**Visualization**:

- **Domain highlight** in cyan
- **Iteration detection**: Facet name includes "iteration"
- **Color override**: Would use teal instead of purple if content were present

---

### Example 3: Multi-Scope with Multiple Targets

**File**: `talon/statement.variable.scope`

```
foo:
    bar = 0
---

[#1 Content] =
[#1 Removal] =
[#1 Domain] = 0:0-1:11
  >----
0| foo:
1|     bar = 0
   -----------<

[#1 Insertion delimiter] = "\n"


[#2 Content] =
[#2 Domain] = 1:4-1:11
      >-------<
1|     bar = 0

[#2 Removal] = 0:4-1:11
      >
0| foo:
1|     bar = 0
   -----------<

[#2 Leading delimiter] = 1:0-1:4
  >----<
1|     bar = 0

[#2 Insertion delimiter] = "\n"
```

**Parsed Result**:

```javascript
{
  name: "scopes/talon/statement.variable",
  languageId: "talon",
  facet: "statement.variable",
  code: "foo:\n    bar = 0",
  scopes: [
    {
      domain: "0:0-1:11",
      targets: [
        { content: "" }  // Empty content
      ]
    },
    {
      domain: "1:4-1:11",
      targets: [
        {
          content: "",
          removal: "0:4-1:11"
        }
      ]
    }
  ]
}
```

**Visualization**:

**Scope #1**:

- **Domain**: Covers both lines (cyan, multi-line borders)
- **Content**: Empty (no highlight)

**Scope #2**:

- **Domain**: Just "bar = 0" (cyan)
- **Content view**: Empty
- **Removal view**: Includes ":" from line 0 plus all of line 1 (red, multi-line)

---

### Example 4: Content and Removal Difference

**File**: `javascript.core/string.multiLine.scope`

```
`line 1
line 2`
---

[Content] = 0:1-1:6
  >
0| `line 1
1| line 2`
   ------<

[Removal] = 0:0-1:7
  >
0| `line 1
1| line 2`
   -------<

[Domain] = 0:0-1:7
  >
0| `line 1
1| line 2`
   -------<
```

**Visualization**:

**Content View**:

- **Domain**: Entire string including backticks (cyan)
- **Content**: Just the text inside, excludes backticks (purple)

**Removal View**:

- **Domain**: Same (cyan)
- **Removal**: Includes backticks (red, larger than content)

**Use Case**: Shows that removing a string also removes its delimiters

---

## Technical Details

### File Naming Convention

Pattern: `<facetName><optionalNumber>.scope`

Examples:

- `namedFunction.scope` - Single test for named function facet
- `namedFunction2.scope` - Second test for same facet
- `namedFunction.iteration.scope` - Iteration test
- `namedFunction.iteration3.scope` - Third iteration test

**Facet Extraction**:

```typescript
facet = filename.match(/([a-zA-Z.]+)\d*\.scope/)![1];
// "namedFunction.iteration3.scope" → "namedFunction.iteration"
```

---

### Language ID Extraction

**Pattern**: First directory under `data/fixtures/scopes/`

```
data/fixtures/scopes/typescript/namedFunction.scope
                     ^^^^^^^^^^
                     Language ID
```

**Special Cases**:

- `javascript.core` → Normalized to `javascript` in ScopeVisualizer
- `typescript.core` → Normalized to `typescript`
- `javascript.jsx` → Normalized to `javascriptreact`

---

### Facet Metadata

Each facet has associated metadata in `@cursorless/common`:

```typescript
scopeSupportFacetInfos["namedFunction.iteration"] = {
  scopeType: { type: "namedFunction" },
  description: "Each named function in a scope",
  isIteration: true,
};
```

This metadata is accessed via `getFacetInfo()` in `util.ts` and used to:

- Display facet descriptions
- Determine if facet is an iteration (affects colors)
- Pretty-print facet names

---

### Border Style Logic

**Solid vs. Porous Decision**:

```typescript
// From @cursorless/common
function getBorderStyle(borderStyle: DecorationStyle): string {
  return [
    getBorderStyleForSide(borderStyle.top),
    getBorderStyleForSide(borderStyle.right),
    getBorderStyleForSide(borderStyle.bottom),
    getBorderStyleForSide(borderStyle.left),
  ].join(" ");
}

function getBorderStyleForSide(style: BorderStyle): string {
  switch (style) {
    case BorderStyle.solid:
      return "solid";
    case BorderStyle.porous:
      return "dashed";
    case BorderStyle.none:
      return "none";
  }
}
```

**Applied**:

- Single-line ranges: All sides solid
- Multi-line ranges: Right side porous (dashed) to show continuation

---

## Performance Considerations

### Build Time

**File Discovery**: O(n) where n = number of .scope files (~thousands)

- Mitigated by: Only runs once at build time
- Cached in: Docusaurus build cache

**Parsing**: O(n × m) where m = average lines per file

- Typical: <100 lines per file
- Total time: ~1-2 seconds for all files

**Data Storage**: Small (~few MB) stored in Docusaurus global data

---

### Runtime

**Filtering**: O(f) where f = number of fixtures (~thousands)

- Runs once per page load
- Result cached in React state

**Decoration Generation**: O(r × p) where:

- r = number of ranges per fixture (~1-10)
- p = number of positions in overlap resolution (~10-50)
- Worst case: O(p²) but p is usually small

**HTML Generation**: Async (non-blocking)

- Handled by Shiki
- Cached by browser

**Overall**: Fast enough for good UX (<100ms per fixture)

---

## Troubleshooting

### Common Issues

#### .scope File Not Showing in Docs

**Check**:

1. File is in `data/fixtures/scopes/` directory
2. File ends with `.scope` extension
3. File has `---` delimiter
4. Facet exists in `scopeSupportFacetInfos` or `plaintextScopeSupportFacetInfos`
5. Not a private scope (doesn't start with "private.")

#### Ranges Not Highlighting

**Check**:

1. Range notation is correct (zero-indexed)
2. Range is within code bounds
3. Property is `[Content]`, `[Domain]`, or `[Removal]` (others ignored)
4. Visual markers match the range value

#### Colors Wrong

**Check**:

1. Is facet an iteration? (uses teal instead of purple/red)
2. Content vs. Removal toggle in correct position
3. Overlapping ranges blend colors (intended behavior)

#### Parse Errors

**Check**:

1. No typos in property names
2. Empty `[Content]` causes error (must have at least one target with content)
3. Range format matches pattern `line:char-line:char`

---

## Summary

### Data Flow

```
.scope File on Disk
  ↓ (Build Time: scope-tests-plugin.ts)
Parsed Fixture Data
  ↓ (Build Time: Docusaurus)
Global Plugin Data
  ↓ (Runtime: ScopeVisualizer.tsx)
Filtered & Organized Scopes
  ↓ (Runtime: calculateHighlights.ts)
Shiki DecorationItem[]
  ↓ (Runtime: Code.tsx + Shiki)
HTML String
  ↓ (Browser)
Rendered Visualization
```

### Key Capabilities

✅ **Visualizes**: Domain, Content, Removal, Iteration ranges
✅ **Supports**: Overlapping ranges, multi-line ranges, empty ranges
✅ **Features**: Color blending, borders, corner radius, whitespace rendering
✅ **Interactive**: Copy, toggle views, navigate to source
✅ **Scalable**: Thousands of fixtures, sub-second filtering

❌ **Limitations**: No hats, no delimiter visualization, fixed color schemes

### File Format Summary

```
<source code>
---
[Property] = <range>
  <visual markers>

[#N Property] = <range>      // Multi-scope
[#N.M Property] = <range>    // Multi-target
```

**Properties Used by ScopeVisualizer**:

- `[Content]` - Purple (or teal if iteration)
- `[Domain]` - Cyan
- `[Removal]` - Red

**Properties Ignored**:

- All delimiter and boundary properties
- Parsed but not visualized
