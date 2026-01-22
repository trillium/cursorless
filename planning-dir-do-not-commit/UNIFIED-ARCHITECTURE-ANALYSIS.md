# Unified Architecture Analysis

## Executive Summary

After analyzing both systems, I've confirmed that **both already use a two-phase architecture** (`HTML generation → React display via dangerouslySetInnerHTML`). The key difference is **how** they generate that HTML:

- **test-case-component**: Modifies Shiki's token stream directly
- **ScopeVisualizer**: Uses Shiki's Decoration API

## Architecture Comparison

### test-case-component Flow

```
CursorlessFixtureState (.yml data)
  ↓
getTokens() → Token[][]
  ↓
applyMarks() → Token[][] (hat tokens inserted via token splitting)
  ↓
applyAllSelections() → Token[][] (selection tokens wrapping other tokens)
  ↓
renderToHtml() → HTML string
  ↓
<div dangerouslySetInnerHTML={{__html: html}} />
```

**File Locations:**

- `packages/test-case-component/src/generateHtml.ts` - Main generator class
- `packages/test-case-component/src/renderToHtml.ts` - Token-to-HTML converter
- `packages/test-case-component/src/loadFixture.ts` - .yml file loader

### ScopeVisualizer Flow

```
Fixture (.scope data)
  ↓
generateDecorations() → Highlight[]
  ↓
flattenHighlights() → Highlight[] (overlaps resolved, colors blended)
  ↓
highlightsToDecorations() → DecorationItem[]
  ↓
codeToHtml(code, {decorations}) → HTML string
  ↓
<div dangerouslySetInnerHTML={{__html: html}} />
```

**File Locations:**

- `packages/cursorless-org-docs/src/docs/components/calculateHighlights.ts` - Highlight generator
- `packages/cursorless-org-docs/src/docs/components/flattenHighlights.ts` - Overlap resolver
- `packages/cursorless-org-docs/src/docs/components/highlightsToDecorations.ts` - DecorationItem converter
- `packages/cursorless-org-docs/src/docs/components/Code.tsx` - React component
- `packages/cursorless-org-docs/src/docs/components/highlightColors.ts` - Color definitions

## Data Structure Comparison

### test-case-component Input

```typescript
interface CursorlessFixtureState {
  documentContents: string;

  // Hat decorations (single-character markers)
  marks?: Record<
    `${HatType}.${string}`, // e.g., "default.a"
    { start: { line: number; character: number } }
  >;

  // Various selection types
  decorations?: CursorlessFixtureSelection[];
  selections?: CursorlessFixtureSelection[];
  thatMark?: [CursorlessFixtureSelection];
  sourceMark?: [CursorlessFixtureSelection];
}

interface CursorlessFixtureSelection {
  type: "line" | "selection";
  name?: string;
  anchor: { line: number; character: number };
  active: { line: number; character: number };
}
```

### ScopeVisualizer Input

```typescript
interface Fixture {
  name: string;
  facet: FacetValue;
  languageId: string;
  code: string;
  scopes: Scope[];
}

interface Scope {
  domain?: string; // Concise range format
  targets: Target[];
}

interface Target {
  content: string; // Concise range format
  removal?: string; // Concise range format
}
```

## Key Technical Differences

### 1. Token Manipulation vs. Decoration API

**test-case-component:**

- Directly modifies token stream from Shiki
- Inserts custom token types: `hat` and `selection`
- Custom renderer converts tokens to HTML
- Allows arbitrary HTML structure

**ScopeVisualizer:**

- Uses Shiki's official Decoration API
- Decorations are style-only (CSS properties)
- Standard Shiki rendering
- Limited to inline styles on wrapper spans

### 2. Hat Rendering

**test-case-component:**

```typescript
// Splits token at character position to insert hat
{
  type: "hat",
  hatType: "default",
  content: "a"
}
// Renders as: <span class="hat default">a</span>
```

**ScopeVisualizer:**

- **No current hat support**
- **Proposed solution**: CSS pseudo-elements

### 3. Selection/Highlight Rendering

**test-case-component:**

```typescript
// Nested token structure
{
  type: "selection",
  className: "decoration",
  selection: [/* wrapped tokens */]
}
// Renders as: <span className="decoration">...</span>
```

**ScopeVisualizer:**

```typescript
// DecorationItem with inline styles
{
  start: { line, character },
  end: { line, character },
  properties: {
    style: "background-color: #ad00bc5b; border-color: ...; ..."
  }
}
// Renders as: <span style="background-color: ...">...</span>
```

### 4. Overlap Handling

**test-case-component:**

- No explicit overlap handling
- Selections are nested in DOM tree
- Last selection wins for styling

**ScopeVisualizer:**

- Sophisticated `flattenHighlights()` algorithm
- Splits overlapping ranges into non-overlapping segments
- Blends colors from multiple highlights
- Merges border styles intelligently

## Adapter Requirements

To convert test-case-component data to ScopeVisualizer rendering:

### 1. Selection/Decoration Conversion

**Input:** `CursorlessFixtureSelection[]` from various fields
**Output:** `Highlight[]` with appropriate colors

```typescript
function convertSelectionsToHighlights(
  selections: CursorlessFixtureSelection[],
  selectionType: "decoration" | "selection" | "thatMark" | "sourceMark",
): Highlight[] {
  // Map each selection to a Highlight with:
  // - Range from anchor/active positions
  // - Colors from new test-case color scheme
  // - Border styles (need to determine rules)
}
```

### 2. Hat Decoration Conversion

**Input:** `marks: Record<string, {start: Position}>`
**Output:** Special decorations + CSS support

**Challenge:** Shiki decorations are range-based, hats are single-character

**Proposed Solutions:**

#### Option A: Zero-width decorations with CSS pseudo-elements

```typescript
// Create zero-width decoration at hat position
{
  start: { line: 0, character: 16 },
  end: { line: 0, character: 16 },  // Same as start
  properties: {
    class: "hat-marker",
    "data-hat-char": "a",
    "data-hat-type": "default"
  }
}
```

```css
/* CSS pseudo-element approach */
.hat-marker::before {
  content: attr(data-hat-char);
  position: absolute;
  top: -1em;
  font-size: 0.8em;
  color: var(--hat-color);
}
```

#### Option B: Single-character range decoration

```typescript
{
  start: { line: 0, character: 16 },
  end: { line: 0, character: 17 },  // Cover the character
  properties: {
    style: "position: relative;",
    class: "hat-default"
  }
}
```

```css
.hat-default::after {
  content: attr(data-char);
  position: absolute;
  top: -1em;
}
```

**Recommendation:** Option B (single-character range) is simpler and more compatible with Shiki

### 3. Color Scheme Extension

Need to add test-case-component colors to `highlightColors.ts`:

```typescript
export const highlightColors = {
  // Existing ScopeVisualizer colors
  domain: { background: "#00e1ff18", ... },
  content: { background: "#ad00bc5b", ... },
  removal: { background: "#ff00002d", ... },
  iteration: { background: "#00725f6c", ... },

  // New test-case-component colors (need to define)
  decoration: { background: "???", borderSolid: "???", borderPorous: "???" },
  selection: { background: "???", borderSolid: "???", borderPorous: "???" },
  thatMark: { background: "???", borderSolid: "???", borderPorous: "???" },
  sourceMark: { background: "???", borderSolid: "???", borderPorous: "???" },
  hat: { color: "???" },
};
```

### 4. Line Selection Handling

test-case-component has special handling for `type: "line"` selections:

```typescript
// In test-case-component
applyLineSelection(selectionType, selection) {
  const classes = this.getSelectionClasses(selectionType, selection);
  const { anchor: start, active: end } = selection;
  for (let i = start.line + 1; i <= end.line + 1; i += 1) {
    this.lineOptions.push({
      line: i,
      classes,
    });
  }
}
```

This applies CSS classes to entire lines. ScopeVisualizer doesn't have line-level decorations built-in.

**Solution:** Convert line selections to full-line character ranges

## Migration Strategy

### Phase 1: Create Adapter (Non-breaking)

Create new adapter functions that convert test-case-component data to ScopeVisualizer format:

```typescript
// New file: packages/cursorless-org-docs/src/docs/components/fixtureAdapter.ts

export function convertFixtureStateToHighlights(
  state: CursorlessFixtureState,
  code: string,
): Highlight[] {
  const highlights: Highlight[] = [];

  // Convert all selection types
  if (state.decorations) {
    highlights.push(
      ...convertSelectionsToHighlights(state.decorations, "decoration"),
    );
  }
  if (state.selections) {
    highlights.push(
      ...convertSelectionsToHighlights(state.selections, "selection"),
    );
  }
  if (state.thatMark) {
    highlights.push(
      ...convertSelectionsToHighlights(state.thatMark, "thatMark"),
    );
  }
  if (state.sourceMark) {
    highlights.push(
      ...convertSelectionsToHighlights(state.sourceMark, "sourceMark"),
    );
  }

  return highlights;
}

export function convertHatMarksToDecorations(
  marks: Record<string, { start: Position }>,
  code: string,
): DecorationItem[] {
  return Object.entries(marks).map(([key, mark]) => {
    const [hatType, character] = key.split(".");
    const char = !character || character === "" ? "." : character;

    return {
      start: mark.start,
      end: { line: mark.start.line, character: mark.start.character + 1 },
      properties: {
        class: `hat hat-${hatType}`,
        "data-hat-char": char,
      },
    };
  });
}
```

### Phase 2: Update Code Component

Extend `Code.tsx` to accept fixture state directly:

```typescript
interface Props {
  languageId: string;
  renderWhitespace?: boolean;
  decorations?: DecorationItem[];

  // New: Support fixture state directly
  fixtureState?: CursorlessFixtureState;

  link?: { name: string; url: string };
  children: string;
}
```

### Phase 3: Create VisualizerWrapper

New component to handle BEFORE/DURING/AFTER states:

```typescript
interface VisualizerWrapperProps {
  fixture: {
    languageId: string;
    initialState: CursorlessFixtureState;
    finalState: CursorlessFixtureState;
    decorations?: any[];
  };
}

export function VisualizerWrapper({ fixture }: VisualizerWrapperProps) {
  const code = fixture.initialState.documentContents;

  return (
    <div className="visualizer-wrapper">
      <div className="state-section">
        <h3>Before</h3>
        <Code
          languageId={fixture.languageId}
          fixtureState={fixture.initialState}
        >
          {code}
        </Code>
      </div>

      {fixture.decorations && (
        <div className="state-section">
          <h3>During</h3>
          <Code
            languageId={fixture.languageId}
            fixtureState={{
              ...fixture.initialState,
              decorations: fixture.decorations
            }}
          >
            {code}
          </Code>
        </div>
      )}

      <div className="state-section">
        <h3>After</h3>
        <Code
          languageId={fixture.languageId}
          fixtureState={fixture.finalState}
        >
          {fixture.finalState.documentContents}
        </Code>
      </div>
    </div>
  );
}
```

### Phase 4: Update CSS

Add hat decoration styles:

```css
/* Hat decorations */
.hat {
  position: relative;
}

.hat::before {
  content: attr(data-hat-char);
  position: absolute;
  top: -1.2em;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7em;
  font-weight: bold;
  color: var(--hat-color-default, #00ff00);
  background: var(--hat-bg-default, rgba(0, 0, 0, 0.8));
  padding: 0.1em 0.3em;
  border-radius: 3px;
  white-space: nowrap;
}

.hat-default::before {
  --hat-color-default: #00ff00;
  --hat-bg-default: rgba(0, 255, 0, 0.2);
}
```

### Phase 5: Migrate test-case-component

Replace `generateHtml.ts` with calls to the unified system:

```typescript
// packages/test-case-component/src/generateHtml.ts

import { Code } from "@cursorless/org-docs/components";
import {
  convertFixtureStateToHighlights,
  convertHatMarksToDecorations,
} from "@cursorless/org-docs/components/fixtureAdapter";

export async function generateHtml(state: CursorlessFixtureState, lang: Lang) {
  // Instead of token manipulation, use the adapter
  const highlights = convertFixtureStateToHighlights(
    state,
    state.documentContents,
  );
  const hatDecorations = state.marks
    ? convertHatMarksToDecorations(state.marks, state.documentContents)
    : [];

  // Use Code component's rendering
  // (This is a conceptual example - actual implementation needs React rendering)
}
```

## Open Questions

1. **Color definitions:** What colors should we use for decoration/selection/thatMark/sourceMark?
   - Should they match existing VS Code colors?
   - Should they be configurable?

2. **Hat positioning:** How should hats be positioned exactly?
   - Above character?
   - Inside character (overlay)?
   - What about multi-character hats?

3. **Line selection styling:** How should full-line selections appear?
   - Background color across full line width?
   - Just the text portion?
   - Special border treatment?

4. **Backward compatibility:** How to ensure existing .scope file visualizations don't break?
   - Keep both systems temporarily?
   - Gradual migration with feature flags?

## Next Steps

1. ✅ Complete this architecture analysis
2. Define color schemes for test-case selection types
3. Implement adapter functions (`fixtureAdapter.ts`)
4. Add hat decoration CSS support
5. Create VisualizerWrapper component
6. Test with sample .yml fixtures
7. Migrate test-case-component to use unified system
8. Update documentation

## Files to Create/Modify

**New Files:**

- `packages/cursorless-org-docs/src/docs/components/fixtureAdapter.ts`
- `packages/cursorless-org-docs/src/docs/components/VisualizerWrapper.tsx`
- `packages/cursorless-org-docs/src/docs/components/hatDecorations.css`

**Modified Files:**

- `packages/cursorless-org-docs/src/docs/components/Code.tsx`
- `packages/cursorless-org-docs/src/docs/components/highlightColors.ts`
- `packages/cursorless-org-docs/src/docs/components/types.ts`
- `packages/test-case-component/src/generateHtml.ts` (eventually deprecated)
- `packages/test-case-component/src/loadFixture.ts`
