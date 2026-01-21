# Visualization Systems Comparison

## Overview

This document compares two code visualization systems in the Cursorless project:

1. **test-case-component** (`@cursorless/test-case-component`)
2. **ScopeVisualizer** (`cursorless-org-docs/src/docs/components`)

Both systems render syntax-highlighted code with visual decorations, but they serve different purposes and use different architectural approaches.

---

## High-Level Comparison

| Aspect             | test-case-component                                     | ScopeVisualizer                               |
| ------------------ | ------------------------------------------------------- | --------------------------------------------- |
| **Purpose**        | Test fixture visualization (before/during/after states) | Scope documentation with range highlighting   |
| **Primary Use**    | Internal testing & debugging                            | Public documentation site                     |
| **Package Type**   | Standalone NPM package                                  | Docusaurus component collection               |
| **Deployment**     | Embedded in test viewers/documentation                  | Docusaurus static site                        |
| **Fixture Source** | YAML test fixtures                                      | .scope test files via plugin                  |
| **States Shown**   | 3 states (before, during, after)                        | Single state with toggles                     |
| **Architecture**   | HTML generation + React display                         | React components with runtime HTML generation |
| **Main Artifacts** | HTML strings → React wrapper                            | React components → HTML at runtime            |

---

## Architecture Overview

### Visual Comparison

**test-case-component: Two-Phase Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
│  (Pure Functions - Can run server-side or at build time)   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Fixture Data → generateHtml() → HTML Strings              │
│                                                             │
│  Input: { documentContents, marks, selections }            │
│  Process: Token manipulation, mark insertion, selection    │
│  Output: { before: "<pre>...</pre>",                       │
│           during: "<pre>...</pre>",                        │
│           after: "<pre>...</pre>" }                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
        (HTML strings can be cached, stored, transmitted)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                        │
│              (React Components - Client-side)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ShikiComponent receives pre-generated HTML                 │
│                                                             │
│  <div dangerouslySetInnerHTML={{ __html: data.before }} /> │
│  <div dangerouslySetInnerHTML={{ __html: data.during }} /> │
│  <div dangerouslySetInnerHTML={{ __html: data.after }} />  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**ScopeVisualizer: Single-Phase Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                  INTEGRATED REACT LAYER                     │
│         (All processing happens at render time)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Code Component (React)                                     │
│    ↓                                                        │
│  useEffect(() => {                                          │
│    calculateHighlights(fixture, rangeType)                  │
│      ↓                                                      │
│    flattenHighlights(highlights)                            │
│      ↓                                                      │
│    highlightsToDecorations(flattened)                       │
│      ↓                                                      │
│    codeToHtml(code, decorations)  // Shiki call             │
│      ↓                                                      │
│    setHtml(result)                                          │
│  })                                                         │
│    ↓                                                        │
│  <div dangerouslySetInnerHTML={{ __html: html }} />        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Architectural Similarities

### 1. Shiki-Based Rendering

Both systems use **Shiki** for syntax highlighting:

**test-case-component**:

```typescript
// generateHtml.ts
const highlighter = getHighlighter({
  themes: [myTheme],
  langs: ["javascript", "typescript"],
});

const tokens = (await highlighter).codeToTokens(
  documentContents,
  options,
).tokens;
```

**ScopeVisualizer**:

```typescript
// Code.tsx
codeToHtml(code, {
  lang: getFallbackLanguage(languageId),
  theme: "nord",
  decorations,
});
```

**Key Difference**:

- test-case-component uses **CSS variables theme** with custom token manipulation
- ScopeVisualizer uses **"nord" theme** with Shiki's built-in decoration API

---

### 2. Token-Based Processing

Both systems work with tokenized code representations:

**test-case-component**:

```typescript
type Token =
  | ({ type: "token" } & ThemedToken)
  | { type: "selection"; className: string; selection: Token[] }
  | { type: "hat"; hatType: HatType; content: string };
```

**ScopeVisualizer**:

```typescript
interface Highlight {
  range: Range;
  style: Style;
}
// Converted to Shiki DecorationItem[]
```

**Key Difference**:

- test-case-component **manipulates tokens directly** (splits, wraps, nests)
- ScopeVisualizer uses **range-based decorations** (Shiki handles token manipulation)

---

### 3. Nested/Overlapping Decorations

Both handle overlapping visual elements:

**test-case-component**:

```typescript
// SelectionLineParser handles nested selections
parseSelection(token: SelectionToken) {
  this.activeSelectionTypes.push(token.className);
  // Recursively parse nested tokens
  for (const subToken of token.selection) {
    this.parseToken(subToken);
  }
  this.activeSelectionTypes.pop();
}
```

**ScopeVisualizer**:

```typescript
// flattenHighlights resolves overlaps
function combineHighlightStyles(range: Range, highlights: Highlight[]): Style {
  // Blend background colors
  const backgroundColor = blendMultipleColors(
    highlights.map((h) => h.style.backgroundColor),
  );
  // Merge border styles
  // ...
}
```

**Key Difference**:

- test-case-component: **Nested structure** (selections contain tokens contain selections)
- ScopeVisualizer: **Flattened structure** (overlaps split into non-overlapping segments)

---

### 4. HTML Generation

Both produce HTML output, but at different stages:

**test-case-component**:

```typescript
// renderToHtml.ts - Custom HTML builder (data layer)
function h<TType>(type: TType, props, children: string[]) {
  return `<span style="${style}">${children.join("")}</span>`;
}
// Returns HTML string

// component-shiki.tsx - React display (presentation layer)
<div dangerouslySetInnerHTML={{ __html: data.before }} />
```

**ScopeVisualizer**:

```typescript
// Code.tsx - Shiki generates HTML at render time
useEffect(() => {
  codeToHtml(code, options).then(html => setHtml(html));
}, [dependencies]);
// Render with dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: html }} />
```

**Key Difference**:

- test-case-component: **Two-phase architecture** (HTML generation → React display)
- ScopeVisualizer: **Single-phase architecture** (React generates HTML on-demand)

---

## Architectural Differences

### 1. Token Processing Pipeline

**test-case-component** - Manual Token Manipulation + React Display:

```
Source Code
  ↓ Shiki.codeToTokens()
Tokens[][]
  ↓ applyMarks() - Insert hat tokens
Modified Tokens
  ↓ applySelections() - Wrap with selection tokens
Nested Token Tree
  ↓ renderToHtml() - Recursive HTML builder
HTML String (before, during, after)
  ↓ loadFixture() - Package into data object
{ command, language, before, during, after }
  ↓ ShikiComponent (React)
React DOM with dangerouslySetInnerHTML
```

**ScopeVisualizer** - Range-Based Decoration:

```
Source Code + Fixture Data
  ↓ getRanges()
Domain Ranges + Target Ranges
  ↓ getDecorations()
Decorations with Border Styles
  ↓ getHighlights()
Styled Highlights
  ↓ flattenHighlights()
Non-Overlapping Segments
  ↓ highlightsToDecorations()
Shiki DecorationItem[]
  ↓ Shiki.codeToHtml()
HTML String
```

**Summary**:

- test-case-component: **Token-centric** (modifies token stream) + **Two-phase** (data → presentation)
- ScopeVisualizer: **Range-centric** (provides ranges to Shiki) + **Single-phase** (integrated)

**Why Two-Phase Architecture?**

The test-case-component's separation of HTML generation from React display provides several benefits:

1. **Portability**: HTML strings can be:
   - Stored in databases
   - Sent over APIs
   - Cached for performance
   - Generated server-side or at build time

2. **Reusability**: The same HTML can be displayed in:
   - React apps (via ShikiComponent)
   - Static HTML pages
   - Email templates
   - Documentation generators

3. **Testing**: HTML generation can be tested independently of React rendering

4. **Performance**: Generate once, display many times (no re-computation)

**Trade-off**: Less flexibility for interactive features (must be baked into HTML)

---

### 2. State Management

**test-case-component** - Class-Based State:

```typescript
class HTMLGenerator {
  private state: CursorlessFixtureState;
  private tokens: Token[][];
  private lineOptions: any[];

  async generate() {
    await this.getTokens();
    this.applyMarks();
    this.applyAllSelections();
    return renderToHtml(this.tokens, { lineOptions: this.lineOptions });
  }
}
```

**ScopeVisualizer** - React Hooks:

```typescript
export function ScopeVisualizer({ languageId, scopeTypeType }: Props) {
  const scopeTests = usePluginData("scope-tests-plugin");
  const [scopes] = useState(getScopeFixtures(...));
  const [rangeType, setRangeType] = useState<RangeType>("content");
  const [renderWhitespace, setRenderWhitespace] = useState(false);
  // ...
}
```

**Summary**:

- test-case-component: **Class-based** imperative processing
- ScopeVisualizer: **Functional** React component with hooks

---

### 3. Decoration Types

**test-case-component** - Multiple Decoration Types:

```typescript
// Marks (Hats)
marks?: Record<`${HatType}.${string}`, { start: Position }>

// Selections
selections?: CursorlessFixtureSelection[]

// IDE Decorations
decorations?: CursorlessFixtureSelection[]

// Special Marks
thatMark?: [CursorlessFixtureSelection]
sourceMark?: [CursorlessFixtureSelection]
```

**ScopeVisualizer** - Range-Based Highlights:

```typescript
// Only two types of ranges
interface Scope {
  domain?: string; // Optional context range
  targets: Target[]; // Target ranges
}

interface Target {
  content: string; // Always present
  removal?: string; // Optional alternative
}
```

**Summary**:

- test-case-component: **5+ decoration types** (hats, selections, decorations, marks)
- ScopeVisualizer: **2 decoration types** (domain, targets)

---

### 4. Visual States

**test-case-component** - Temporal States:

```typescript
// Three distinct time states
{
  before: HTML,   // Initial state
  during: HTML,   // During execution (with decorations)
  after: HTML     // Final state
}
```

**ScopeVisualizer** - View Mode Toggles:

```typescript
// Single state with view options
{
  rangeType: "content" | "removal",  // What to show
  renderWhitespace: boolean          // How to show it
}
```

**Summary**:

- test-case-component: **Temporal progression** (before → during → after)
- ScopeVisualizer: **View mode switching** (content vs. removal)

---

### 5. Line-Level vs. Character-Level

**test-case-component** - Both:

```typescript
// Line-level selections
if (selection.type === "line") {
  return this.applyLineSelection(key, selection);
}

// Character-level selections
selectionParser.parse(selection);
```

**ScopeVisualizer** - Character-Level Only:

```typescript
// Always character ranges
generateDecorationsForCharacterRange(
  (range) => getLineRanges(lineRanges, range),
  new Range(range.start, range.end),
);
```

**Summary**:

- test-case-component: **Hybrid approach** (lines or characters)
- ScopeVisualizer: **Character-only** (line ranges handled via multi-line logic)

---

## Feature Comparison

### Shared Features

| Feature             | test-case-component       | ScopeVisualizer            |
| ------------------- | ------------------------- | -------------------------- |
| Syntax highlighting | ✅ Shiki                  | ✅ Shiki                   |
| Multiple languages  | ✅ JS/TS                  | ✅ Many languages          |
| Overlapping ranges  | ✅ Nested selections      | ✅ Flattened highlights    |
| Color-coded ranges  | ✅ CSS classes            | ✅ Inline styles           |
| Border styling      | ✅ Via CSS                | ✅ Solid/porous borders    |
| Empty ranges        | ❌ Not explicitly handled | ✅ Special case in flatten |
| Multi-line ranges   | ✅ Line-level support     | ✅ Border continuation     |

---

### Unique to test-case-component

| Feature                  | Description                                       | Implementation                                |
| ------------------------ | ------------------------------------------------- | --------------------------------------------- |
| **Hat Decorations**      | Character-level marks (e.g., "default.a")         | `insertHat()` splits tokens, inserts hat type |
| **Temporal States**      | Before/during/after progression                   | `loadFixture()` generates 3 HTML outputs      |
| **Line Selections**      | Full-line highlighting                            | `applyLineSelection()` adds line classes      |
| **Selection Types**      | decorations, selections, thatMark, sourceMark     | Different CSS classes per type                |
| **State Machine Parser** | Token state tracking (outside/start/continue/end) | `SelectionLineParser.getTokenState()`         |
| **Custom HTML Builder**  | Full control over HTML structure                  | `renderToHtml()` with element builders        |

---

### Unique to ScopeVisualizer

| Feature                    | Description                                   | Implementation                           |
| -------------------------- | --------------------------------------------- | ---------------------------------------- |
| **Overlap Resolution**     | Splits overlapping ranges into segments       | `flattenHighlights()` algorithm          |
| **Color Blending**         | Blends background colors where ranges overlap | `blendMultipleColors()` from common      |
| **Border Types**           | Solid vs. porous borders for multi-line       | `getBorderColor()` based on border style |
| **Corner Radius**          | Smart border radius on range boundaries       | `useSingleCornerBorderRadius()` logic    |
| **View Toggles**           | Switch between content/removal ranges         | React state + re-render                  |
| **Whitespace Rendering**   | Shows spaces as `·`, tabs as `→`              | Preprocessing + CSS replacement          |
| **Copy Button**            | Copy raw code to clipboard                    | `navigator.clipboard.writeText()`        |
| **GitHub Links**           | Link to fixture source files                  | Dynamic URL generation                   |
| **Dynamic TOC**            | Auto-generated table of contents              | `DynamicTOC` component                   |
| **Hash Scrolling**         | Scroll to anchors in React content            | `ScrollToHashId` component               |
| **Domain Ranges**          | Shows scope context/container                 | Separate domain highlighting             |
| **Iteration Highlighting** | Special colors for iteration facets           | Conditional color scheme selection       |

---

## Code Complexity Comparison

### Lines of Code (Approximate)

| File/Component        | test-case-component         | ScopeVisualizer                       |
| --------------------- | --------------------------- | ------------------------------------- |
| Main component        | 435 lines (generateHtml.ts) | 334 lines (ScopeVisualizer.tsx)       |
| HTML rendering        | 197 lines (renderToHtml.ts) | - (Shiki handles it)                  |
| Highlight processing  | -                           | 118 lines (calculateHighlights.ts)    |
| Overlap resolution    | -                           | 133 lines (flattenHighlights.ts)      |
| Decoration conversion | -                           | 53 lines (highlightsToDecorations.ts) |
| Code display          | -                           | 103 lines (Code.tsx)                  |
| Utilities             | -                           | 78 lines (util.ts)                    |
| Types                 | -                           | 64 lines (types.ts)                   |
| **Total Core Logic**  | ~632 lines                  | ~883 lines                            |

**Complexity Assessment**:

- test-case-component: **More compact** due to custom HTML builder
- ScopeVisualizer: **More modular** but higher total line count

---

### Algorithmic Complexity

**test-case-component**:

- Token insertion: O(n) per mark
- Selection parsing: O(n × m) where n=tokens, m=selections
- Token splitting: O(n) in worst case
- **Overall**: O(n × m) for typical fixtures

**ScopeVisualizer**:

- Range extraction: O(s) where s=scopes
- Highlight creation: O(h) where h=highlights
- Flatten highlights: O(h log h) for sorting + O(p²) for segment creation where p=positions
- **Overall**: O(h² + h log h) in worst case

**Summary**:

- test-case-component: **Better for few decorations** (linear in most cases)
- ScopeVisualizer: **Better scaling for many overlaps** (quadratic only in positions, not highlights)

---

## Data Models

### Input Data Structures

**test-case-component**:

```typescript
interface CursorlessFixtureState {
  documentContents: string;
  marks?: Record<`${HatType}.${string}`, { start: Position }>;
  decorations?: CursorlessFixtureSelection[];
  selections?: CursorlessFixtureSelection[];
  thatMark?: [CursorlessFixtureSelection];
  sourceMark?: [CursorlessFixtureSelection];
}
```

**ScopeVisualizer**:

```typescript
interface Fixture {
  name: string;
  facet: FacetValue;
  languageId: string;
  code: string;
  scopes: Scope[]; // Each scope has domain? and targets[]
}
```

**Key Differences**:

- test-case-component: **Editor-centric** (mirrors VSCode state)
- ScopeVisualizer: **Test-centric** (fixture metadata + ranges)

---

### Output Data Structures

**test-case-component**:

```typescript
// Data layer output (from loadFixture)
{
  language: string;
  command: string;
  before: string;    // Pre-generated HTML
  during: string;    // Pre-generated HTML (or null)
  after: string;     // Pre-generated HTML
}

// Presentation layer (ShikiComponent renders)
<div className="px-4">
  <h2>{data.command}</h2>
  <div dangerouslySetInnerHTML={{ __html: data.before }} />
  <div dangerouslySetInnerHTML={{ __html: data.during }} />
  <div dangerouslySetInnerHTML={{ __html: data.after }} />
</div>
```

**ScopeVisualizer**:

```typescript
// Single layer - React component generates HTML at render
<div>
  <Code
    decorations={DecorationItem[]}
    languageId={string}
  >
    {code}
  </Code>
</div>
// Code component internally calls codeToHtml() on each render
```

**Key Differences**:

- test-case-component: **Two-layer** (HTML strings at data layer → React wrapper at presentation)
- ScopeVisualizer: **Single-layer** (React components generate HTML on-demand)
- test-case-component: **Serialized HTML** (portable, cacheable, can be generated server-side)
- ScopeVisualizer: **Runtime generation** (interactive, dynamic, requires client-side)

---

## Styling Approaches

### CSS Strategy

**test-case-component**:

```css
/* CSS classes for decoration types */
.selection { /* ... */ }
.decoration { /* ... */ }
.thatMark { /* ... */ }
.sourceMark { /* ... */ }
.hat.default { /* ... */ }

/* Shiki theme via CSS variables */
--shiki-foreground
--shiki-background
--shiki-token-keyword
```

**ScopeVisualizer**:

```typescript
// Inline styles with computed values
style: {
  backgroundColor: blended,
  borderColor: computed,
  borderStyle: "solid dashed none none",
  borderRadius: "4px 0 0 4px",
  borderWidth: "1px"
}
```

**Summary**:

- test-case-component: **CSS class-based** (separation of concerns)
- ScopeVisualizer: **Inline style-based** (computed per-segment)

---

### Color Management

**test-case-component**:

```typescript
// Colors defined in CSS
// Classes provide semantic meaning
className: "selection thatMark"; // Composes styles
```

**ScopeVisualizer**:

```typescript
// Colors defined in highlightColors.ts
export const highlightColors = {
  domain: { background: "#00e1ff18", ... },
  content: { background: "#ad00bc5b", ... },
  removal: { background: "#ff00002d", ... },
  iteration: { background: "#00725f6c", ... },
};
```

**Summary**:

- test-case-component: **CSS-managed** colors
- ScopeVisualizer: **TypeScript constants** for colors

---

## Use Case Suitability

### When to Use test-case-component

**Ideal For**:

1. ✅ Showing **before/after transformations**
2. ✅ **Hat-based** targeting systems
3. ✅ **Multiple selection types** simultaneously
4. ✅ **Line-level** operations
5. ✅ Generating **static HTML** for embedding
6. ✅ **Test result visualizations**
7. ✅ **Compact display** (fewer UI controls)

**Example Use Cases**:

- Test case galleries
- Command demonstration videos
- Automated test reports
- Documentation of temporal changes
- Hat decoration tutorials

---

### When to Use ScopeVisualizer

**Ideal For**:

1. ✅ **Scope documentation** with domain/target ranges
2. ✅ **Complex overlapping** ranges
3. ✅ **Interactive toggles** (content vs. removal)
4. ✅ **Language comparison** views
5. ✅ **Public documentation** sites
6. ✅ **Border styling** (solid/porous)
7. ✅ **User-friendly features** (copy, links, whitespace)

**Example Use Cases**:

- Language scope support docs
- API reference with examples
- Interactive tutorials
- Scope behavior explanation
- Developer onboarding

---

## Integration Complexity

### Dependencies

**test-case-component**:

```json
{
  "shiki": "^1.4.0",
  "prettier": "3.2.5",
  "react": "^18.2.0",
  "fs-extra": "11.2.0",
  "js-yaml": "^4.1.0"
}
```

**ScopeVisualizer**:

```typescript
// Part of Docusaurus site
@cursorless/common
@docusaurus/useGlobalData
@docusaurus/router
shiki (via Docusaurus)
```

**Summary**:

- test-case-component: **Standalone package** (can be used anywhere)
- ScopeVisualizer: **Docusaurus-coupled** (needs plugin data)

---

### Setup Complexity

**test-case-component**:

```typescript
// Usage is straightforward
import { loadFixture } from "@cursorless/test-case-component";

const result = await loadFixture(fixtureData);
// result: { before, during, after, command, language }
```

**ScopeVisualizer**:

```typescript
// Requires Docusaurus plugin setup
// 1. Configure plugin in docusaurus.config.js
// 2. Plugin loads .scope files
// 3. Component accesses via usePluginData()

<ScopeVisualizer languageId="typescript" />
```

**Summary**:

- test-case-component: **Low setup** (function call)
- ScopeVisualizer: **Medium setup** (requires Docusaurus + plugin)

---

## Testing Approach

### test-case-component

```typescript
// generateHtml.spec.ts
describe("generateHtml", () => {
  it("should select whole line", async () => {
    expect(await generateHtml(state, "typescript")).toMatchInlineSnapshot(
      `...`,
    );
  });
  // 6 test cases total
});
```

**Test Coverage**:

- Line selections ✅
- Single token selections ✅
- Multiple token selections ✅
- Inside token selections ✅
- Nested selections ✅
- **No tests for**: Hat insertion, multi-state generation

---

### ScopeVisualizer

```typescript
// flattenHighlights.test.ts
suite("flatten highlights", () => {
  tests.forEach((t) => {
    test(t.name, () => {
      const highlights = createHighlights(t.scopes);
      const actual = flattenHighlights(highlights);
      assert.equal(actual.length, t.expected.length);
      // Verify each range matches
    });
  });
});
```

**Test Coverage**:

- Distant targets ✅
- Adjacent targets ✅
- Overlapping targets ✅
- Domain/target relationships ✅ (4 cases)
- **No tests for**: Component rendering, decoration generation

---

## Performance Characteristics

### Memory Usage

**test-case-component**:

- Stores **3 HTML strings** (before, during, after)
- **Token tree** held in memory during generation
- **Nested structures** can be deep

**ScopeVisualizer**:

- Stores **flattened segments** (no nesting)
- **Shiki caches** themes and languages
- **React component tree** in memory

**Winner**: Tie (different trade-offs)

---

### Rendering Speed

**test-case-component**:

- ✅ **Pre-generated HTML** (instant display if HTML is cached)
- ✅ **Server-side generation** possible (no client-side computation)
- ✅ **React component is trivial** (just injects HTML)
- ❌ **Synchronous token manipulation** (slower HTML generation)
- ❌ **No incremental updates** (must regenerate all 3 states)
- ⚠️ **Two-phase overhead** (generate then display)

**ScopeVisualizer**:

- ✅ **Async rendering** (non-blocking UI)
- ✅ **React memoization** available
- ✅ **Incremental updates** possible (re-render only changed parts)
- ❌ **Runtime HTML generation** (every render requires Shiki processing)
- ❌ **Client-side only** (cannot pre-generate)

**Winner**:

- **test-case-component** for cached/pre-generated content
- **ScopeVisualizer** for interactive, dynamic content
- **test-case-component** for static documentation sites
- **ScopeVisualizer** for live editing/toggling

---

### Scalability

**test-case-component**:

- Scales with: **token count × decoration count**
- ⚠️ **Deep nesting** can cause performance issues
- ✅ Good for **small-medium fixtures** (< 100 lines)

**ScopeVisualizer**:

- Scales with: **position count² in flatten** (typically small)
- ✅ **Flat structure** after processing
- ✅ Good for **any fixture size** (even 1000+ lines)

**Winner**: **ScopeVisualizer** for large fixtures

---

## Extensibility

### Adding New Features

**test-case-component** - Adding a new decoration type:

1. Add to `CursorlessFixtureState` interface
2. Add to `applyAllSelections()` call
3. Implement parsing logic in `SelectionParser` or similar
4. Add CSS classes for styling
5. Update tests

**ScopeVisualizer** - Adding a new range type:

1. Add to `RangeType` union
2. Add color scheme to `highlightColors`
3. Add case to `getColors()`
4. Add UI control in `renderOptions()`
5. Update tests

**Winner**: **ScopeVisualizer** (simpler extension)

---

### Customization

**test-case-component**:

- ✅ Full HTML control (modify `renderToHtml()`)
- ✅ Custom CSS theme
- ✅ Custom token types
- ❌ Harder to swap out renderer

**ScopeVisualizer**:

- ✅ Easy color changes (`highlightColors.ts`)
- ✅ React component composition
- ✅ Shiki theme selection
- ❌ Less control over HTML structure

**Winner**: **test-case-component** for deep customization

---

## Evolution Potential

### Refactoring Paths

**test-case-component** could adopt:

1. ✅ Shiki's decoration API (less token manipulation)
2. ✅ Range-based approach (simpler logic)
3. ✅ Flatten overlaps (better for complex cases)
4. ⚠️ Would lose fine-grained control

**ScopeVisualizer** could adopt:

1. ✅ Hat decoration support (add hat processing)
2. ✅ Multi-state views (before/after toggle)
3. ✅ Custom HTML builder (better control)
4. ⚠️ Would increase complexity

---

### Convergence Opportunities

Both systems could benefit from:

1. **Shared Color Definitions**:

   ```typescript
   // packages/common/src/colors.ts
   export const cursorlessColors = {
     selection: { ... },
     decoration: { ... },
     domain: { ... },
     // ...
   };
   ```

2. **Shared Range Utilities**:

   ```typescript
   // packages/common/src/ranges.ts
   export function splitRangeByLines(range: Range): Range[];
   export function mergeOverlappingRanges(ranges: Range[]): Range[];
   ```

3. **Unified Decoration Interface**:

   ```typescript
   // packages/common/src/decorations.ts
   export interface UnifiedDecoration {
     range: Range;
     type: DecorationType;
     style?: Style;
   }
   ```

4. **Shared Shiki Configuration**:
   ```typescript
   // packages/common/src/shiki-config.ts
   export const cursorlessTheme = createCssVariablesTheme({ ... });
   export const languageFallbacks = { ... };
   ```

---

## Recommendations

### For Maintainers

**If building new visualization features**:

1. **Use ScopeVisualizer approach** for:
   - Documentation sites
   - Interactive features
   - Complex overlapping ranges
   - Public-facing tools

2. **Use test-case-component approach** for:
   - Test visualizations
   - Before/after demos
   - Static HTML generation
   - Hat-based features

3. **Consider convergence**:
   - Extract shared utilities to `@cursorless/common`
   - Standardize color schemes
   - Create unified decoration types

---

### For Contributors

**When fixing bugs**:

- Check **both systems** if the issue relates to range handling
- Look for **similar patterns** that might have the same bug
- Consider whether a fix should be **generalized** to common utilities

**When adding features**:

- Evaluate which system is **more appropriate**
- Consider whether feature should be in **both systems**
- Check if feature requires **shared infrastructure**

---

## Summary

### Key Takeaways

| Aspect           | test-case-component                            | ScopeVisualizer                 |
| ---------------- | ---------------------------------------------- | ------------------------------- |
| **Philosophy**   | Token manipulation + Two-phase                 | Range decoration + Single-phase |
| **Architecture** | Data layer (HTML) + Presentation layer (React) | Integrated React components     |
| **Complexity**   | Simpler (632 LOC)                              | More modular (883 LOC)          |
| **Features**     | Temporal states, hats                          | Overlaps, interactivity         |
| **Use Case**     | Testing/debugging, static sites                | Interactive documentation       |
| **Flexibility**  | High (custom HTML)                             | Medium (Shiki constraints)      |
| **UX**           | Basic (no controls)                            | Rich (toggles, copy, links)     |
| **Performance**  | Fast display, slow generation                  | Balanced (async)                |
| **Cacheability** | Excellent (HTML strings)                       | Limited (runtime generation)    |
| **Integration**  | Standalone package                             | Docusaurus-coupled              |

---

### Architectural Patterns

**test-case-component**:

- ✅ **Two-phase architecture** (generation → display)
- ✅ Token-centric processing
- ✅ Imperative style (class-based generators)
- ✅ Full rendering control
- ✅ Nested data structures (token trees)
- ✅ **Hybrid approach** (pure functions + React wrappers)

**ScopeVisualizer**:

- ✅ **Single-phase architecture** (integrated)
- ✅ Range-centric processing
- ✅ Functional style (React hooks)
- ✅ Declarative rendering
- ✅ Flat data structures (flattened highlights)
- ✅ **Pure React** (components handle everything)

---

### Future Direction

**Convergence Opportunities**:

1. Extract color definitions to shared package
2. Create unified decoration interface
3. Share range processing utilities
4. Standardize Shiki configuration

**Divergence Preservation**:

1. Keep token manipulation for fine control (test-case-component)
2. Keep React/Docusaurus integration (ScopeVisualizer)
3. Keep specialized features (hats vs. domain/content/removal)

---

## Conclusion

Both systems demonstrate **different but valid approaches** to code visualization:

- **test-case-component**: **Two-phase architecture** (data + presentation) optimized for:
  - ✅ **Portability** (serialized HTML strings)
  - ✅ **Cacheability** (generate once, display many times)
  - ✅ **Control** (custom token manipulation)
  - ✅ **Temporal progression** (before/during/after states)
  - ✅ **Static site generation** (build-time HTML generation)

- **ScopeVisualizer**: **Single-phase architecture** (integrated React) optimized for:
  - ✅ **Interactivity** (runtime toggles and controls)
  - ✅ **Complexity handling** (sophisticated overlap resolution)
  - ✅ **User experience** (copy buttons, links, whitespace toggle)
  - ✅ **Dynamic content** (on-demand generation)
  - ✅ **Docusaurus integration** (seamless plugin data access)

### Key Insight

The fundamental difference is **when HTML is generated**:

- test-case-component: **Build time / server-side** → portable HTML strings → simple React display
- ScopeVisualizer: **Runtime / client-side** → React components → Shiki HTML generation

Neither is strictly "better" – they serve **complementary purposes** in the Cursorless ecosystem:

- Use **test-case-component** when you need portable, cacheable visualizations
- Use **ScopeVisualizer** when you need interactive, dynamic documentation

Understanding their similarities and differences helps maintainers choose the right tool for each use case and identify opportunities for code sharing and architectural improvements.
