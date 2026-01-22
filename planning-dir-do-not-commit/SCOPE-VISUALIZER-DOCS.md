# ScopeVisualizer Component Documentation

## Overview

The **ScopeVisualizer** component system is a comprehensive React-based visualization framework for displaying and documenting Cursorless scope support tests. It renders syntax-highlighted code snippets with colored overlays showing scope ranges (content, removal, domain, iteration) for different programming languages.

This component is part of the Cursorless documentation site and provides interactive visualizations of how Cursorless scopes work across different languages and scope types.

## Purpose

- Visualize scope test fixtures with syntax highlighting
- Display content ranges vs. removal ranges for scope targets
- Show domain ranges for scope context
- Support iteration scope highlighting
- Provide language-specific scope documentation
- Allow toggling between different view modes (content/removal ranges, whitespace rendering)

---

## File Structure

### Core Components

#### `ScopeVisualizer.tsx`

**Purpose**: Main orchestration component for displaying scope test visualizations

**Exports**:

- `ScopeVisualizer` - Main component
- `facetComparator` - Sorting utility for facets

**Key Interfaces**:

```typescript
interface Props {
  languageId?: string; // Filter by specific language
  scopeTypeType?: ScopeTypeType; // Filter by specific scope type
}

interface Scopes {
  public: Scope[]; // User-facing scopes
  internal: Scope[]; // Internal implementation scopes
}

interface Scope {
  scopeTypeType: ScopeTypeType;
  name: string;
  facets: Facet[];
}

interface Facet {
  facet: FacetValue;
  name: string;
  info: ScopeSupportFacetInfo;
  fixtures: Fixture[];
}
```

**Main Component: `ScopeVisualizer({ languageId, scopeTypeType })`**

State Management:

- `scopes` - Loaded and filtered scope fixtures
- `rangeType` - Toggle between "content" and "removal" ranges
- `renderWhitespace` - Toggle whitespace visualization

Rendering Modes:

1. **Language-specific mode** (`languageId` provided): Shows all scopes for a language
2. **Scope-specific mode** (`scopeTypeType` provided): Shows specific scope across languages
3. **Filtered mode**: Shows filtered results based on props

**Key Functions**:

##### `getScopeFixtures(scopeTests, languageId, scopeTypeType): Scopes`

- Loads fixtures from scope tests plugin data
- Filters by language and/or scope type
- Separates public and internal scopes
- Normalizes language IDs (javascript.core → javascript, etc.)
- Returns organized scope data structure

**Processing Steps**:

1. Creates scope and facet maps from raw fixture data
2. Filters fixtures based on language imports and scope types
3. Excludes private scopes when filtering by language
4. Normalizes language IDs for compatibility
5. Sorts scopes and facets, with iteration facets at the end

##### `renderScope(languageId, scopeTypeType, rangeType, renderWhitespace, scope)`

- Renders a single scope with all its facets
- Conditionally shows scope name header
- Maps over facets to render each one

##### `renderFacet(languageId, scopeTypeType, rangeType, renderWhitespace, facet, index)`

- Renders a single facet with its fixtures
- Displays facet name and description
- Shows language headers when scope-specific mode is active
- Maps fixtures to Code components with decorations

##### `facetComparator(a: Facet, b: Facet): number`

- Sorts facets alphabetically
- Places iteration facets at the end
- Ensures consistent ordering across the UI

**UI Components**:

- `renderPublicScopesHeader()` - Section header for public scopes
- `renderInternalScopesHeader()` - Section header with warning about internal scopes
- `renderOptions()` - Controls for range type and whitespace rendering

---

#### `Code.tsx`

**Purpose**: Renders syntax-highlighted code with decorations using Shiki

**Props**:

```typescript
interface Props {
  languageId: string; // Language for syntax highlighting
  renderWhitespace?: boolean; // Show whitespace characters
  decorations?: DecorationItem[]; // Range highlights/decorations
  link?: {
    // Optional GitHub link
    name: string;
    url: string;
  };
  children: string; // Source code to display
}
```

**Component: `Code({ languageId, renderWhitespace, decorations, link, children })`**

State:

- `html` - Rendered HTML from Shiki
- `copied` - Clipboard copy status

**Key Functions**:

##### `useEffect()` - HTML Generation

- Preprocesses code to show whitespace (` ` → `␣`, `\t` → `⭾`)
- Calls `codeToHtml()` from Shiki with "nord" theme
- Post-processes HTML to replace placeholder symbols with CSS-styled dots/arrows
- Updates HTML state when dependencies change

##### `handleCopy()`

- Copies raw code to clipboard
- Shows success indicator for 1.5 seconds
- Handles copy errors gracefully

##### `getFallbackLanguage(languageId): string`

- Maps VSCode language IDs to Shiki-supported languages
- Mappings:
  - `javascriptreact` → `jsx`
  - `typescriptreact` → `tsx`
  - `scm` → `scheme`
  - `talon-list` → `talon`

**Features**:

- Copy-to-clipboard button with feedback
- Optional GitHub link to fixture source
- Whitespace visualization with custom symbols
- Loading state while HTML generates

---

### Highlight Processing System

#### `calculateHighlights.ts`

**Purpose**: Converts fixture data into Shiki decorations with proper styling

**Main Export**:

##### `generateDecorations(fixture, rangeType, isIteration): DecorationItem[]`

Main pipeline for creating decorations:

1. **Extract Ranges**:
   - `getRanges(fixture, rangeType)` - Extracts domain and target ranges
   - Respects range type (content vs. removal)
   - Handles optional removal ranges (falls back to content)

2. **Generate Decorations**:
   - `getDecorations(lineRanges, ranges)` - Splits ranges by line boundaries
   - Uses `generateDecorationsForCharacterRange()` from @cursorless/common
   - Handles multi-line ranges correctly

3. **Create Highlights**:
   - `getHighlights(colors, range, borders)` - Creates styled highlight objects
   - Applies colors based on range type (domain/content/removal/iteration)
   - Calculates border radius for corners using `useSingleCornerBorderRadius()`

4. **Flatten Overlaps**:
   - `flattenHighlights()` - Merges overlapping highlights
   - Blends background colors where ranges overlap
   - Preserves border styles at range boundaries

5. **Convert to Decorations**:
   - `highlightsToDecorations()` - Converts to Shiki DecorationItem format
   - Applies CSS styles inline

**Helper Functions**:

##### `getColors(rangeType, isIteration)`

Determines color scheme based on context:

- Iteration scopes: teal/cyan colors
- Content ranges: purple/magenta colors
- Removal ranges: red colors
- Domains: always cyan

##### `getCodeLineRanges(code): Range[]`

- Splits code into line-level ranges
- Used for line boundary detection

##### `getLineRanges(lineRanges, range): Range[]`

- Extracts lines that intersect with a range
- Used for multi-line range handling

---

#### `flattenHighlights.ts`

**Purpose**: Resolves overlapping highlights into non-overlapping segments

**Main Export**:

##### `flattenHighlights(highlights: Highlight[]): Highlight[]`

Sophisticated algorithm for handling overlapping ranges:

**Algorithm Steps**:

1. **Extract Unique Positions**:
   - `getUniquePositions()` - Collects all start/end positions
   - Sorts positions by line, then character
   - Removes duplicates

2. **Create Segments**:
   - Iterates through position pairs
   - Creates a segment for each pair
   - Skips segments with no matching highlights (gaps)

3. **Combine Styles**:
   - `combineHighlightStyles(range, highlights)` - Merges styles for a segment
   - Background: Blends all overlapping colors using `blendMultipleColors()`
   - Borders: Uses borders from highlights at segment boundaries
   - Border Radius: Applies radius only at original highlight boundaries

4. **Handle Empty Ranges**:
   - Special handling for zero-width highlights
   - Adds them if not already covered by other segments

5. **Sort Results**:
   - `sortHighlights()` - Ensures proper rendering order

**Example**:

```
Input:  [----A----]
            [----B----]
Output: [1-][--2--][3-]
Where: 1=A style, 2=A+B blended, 3=B style
```

**Tests**: See `flattenHighlights.test.ts` for test cases including:

- Distant targets (no overlap)
- Adjacent targets (touching boundaries)
- Overlapping targets (partial overlap)
- Domain/target relationships (equal, contains, contained, overlaps)

---

#### `highlightsToDecorations.ts`

**Purpose**: Converts styled highlights to Shiki decoration format

**Main Export**:

##### `highlightsToDecorations(highlights: Highlight[]): DecorationItem[]`

- Maps highlight objects to Shiki's DecorationItem format
- Converts style objects to CSS strings
- Sets `alwaysWrap: true` for proper rendering

**Helper Functions**:

##### `getStyleString(style: Style): string`

Builds inline CSS from style object:

- `background-color`: Blended color from overlaps
- `border-color`: Computed from solid/porous colors and border styles
- `border-style`: Solid/dashed/none per side
- `border-radius`: Rounded corners at highlight boundaries
- `border-width`: Constant from `BORDER_WIDTH`

Uses utilities from `@cursorless/common`:

- `getBorderColor()` - Chooses solid vs. porous color
- `getBorderStyle()` - Maps border style enum to CSS

##### `getBorderRadius(borders: BorderRadius): string`

- Converts boolean flags to CSS radius values
- Uses `BORDER_RADIUS` constant or "0px"
- Returns space-separated string (top-left, top-right, bottom-right, bottom-left)

---

#### `highlightColors.ts`

**Purpose**: Defines color schemes for different range types

**Export**: `highlightColors` object

**Color Schemes**:

```typescript
{
  domain: {
    background: "#00e1ff18",    // Light cyan (10% opacity)
    borderSolid: "#ebdeec84",   // Light purple solid
    borderPorous: "#ebdeec3b",  // Light purple semi-transparent
  },
  content: {
    background: "#ad00bc5b",    // Purple/magenta (36% opacity)
    borderSolid: "#ee00ff78",   // Bright magenta
    borderPorous: "#ebdeec3b",  // Light purple semi-transparent
  },
  removal: {
    background: "#ff00002d",    // Red (18% opacity)
    borderSolid: "#ff000078",   // Bright red
    borderPorous: "#ff00004a",  // Red semi-transparent
  },
  iteration: {
    background: "#00725f6c",    // Teal (42% opacity)
    borderSolid: "#00ffd578",   // Bright cyan
    borderPorous: "#00ffd525",  // Cyan very transparent
  },
}
```

**Border Types**:

- **Solid**: Used for continuous edges (single-line ranges)
- **Porous**: Used for line-crossing edges (multi-line ranges)

**Color Meanings**:

- **Domain**: Context in which scope exists (e.g., enclosing function)
- **Content**: The core content of the scope
- **Removal**: What gets deleted in a removal operation
- **Iteration**: Iterable elements (e.g., each list item)

**Source**: Colors match the VSCode extension decoration colors

- Reference: `cursorless-vscode/package.json` lines 560-581

---

### Supporting Components

#### `Header.tsx`

**Purpose**: Renders header elements with anchor links and hash navigation

**Exports**:

- `H2(props)` - Level 2 heading
- `H3(props)` - Level 3 heading
- `H4(props)` - Level 4 heading
- `H5(props)` - Level 5 heading

**Props**:

```typescript
interface Props {
  className?: string;
  id?: string; // Custom ID, defaults to URI-encoded children
  title?: string; // Tooltip text
  children: string; // Heading text
}
```

**Features**:

- Auto-generates URI-encoded IDs from heading text
- Adds anchor links with hash symbol
- Uses `anchor-with-sticky-navbar` class for scroll offset
- Encodes special characters for URL compatibility

**Implementation**: `renderHeader(level, props)`

- Creates appropriate `<h1>`-`<h6>` tag
- Encodes ID using `uriEncodeHashId()` from @cursorless/common
- Renders invisible hash link for copy/share

---

#### `DynamicTOC.tsx`

**Purpose**: Generates dynamic table of contents from rendered headings

**Props**:

```typescript
interface Props {
  minHeadingLevel?: number; // Default: 2 (h2)
  maxHeadingLevel?: number; // Default: 3 (h3)
}
```

**Component**: `DynamicTOC({ minHeadingLevel, maxHeadingLevel })`

**Functionality**:

##### `useEffect()` - TOC Generation

- Finds main content row in DOM
- Generates TOC from rendered headings
- Replaces existing TOC or appends new one

##### `getTOC(minHeadingLevel, maxHeadingLevel)`

Creates DOM structure:

```html
<div class="col col--3">
  <div class="tableOfContents_TDAO thin-scrollbar">
    <ul class="table-of-contents table-of-contents__left-border">
      <li><a href="#heading-id">Heading Text</a></li>
      ...
    </ul>
  </div>
</div>
```

**Features**:

- Dynamic indentation based on heading level changes
- Uses actual rendered heading text and IDs
- Integrates with Docusaurus styling
- Auto-updates when component mounts

##### `getHeaderElements(minHeadingLevel, maxHeadingLevel)`

- Queries DOM for headings in specified range
- Builds CSS selector: `"h2, h3, h4"`, etc.

---

#### `ScrollToHashId.tsx`

**Purpose**: Handles scroll-to-anchor on initial page load for React-rendered content

**Component**: `ScrollToHashId()`

**Problem Solved**:
React components render asynchronously, so native browser hash scrolling may fail if target element doesn't exist yet.

**Solution**:

- Monitors URL hash from `useLocation()`
- Attempts to scroll to hash ID with retry logic
- Retries up to 5 times with 100ms delays
- Accounts for sticky navbar offset (68px)

**Functions**:

##### `useEffect()` - Scroll Handler

- Extracts ID from hash
- Schedules delayed scroll attempts
- Stops retrying once element is at target position

##### `isElementAtTop(el, tolerance)`

- Checks if element is already at scroll target
- Accounts for 68px navbar offset
- Allows 10px tolerance for precision

**Use Case**: Essential for direct links to dynamically-rendered scope visualizations

---

### Type Definitions

#### `types.ts`

**Purpose**: Central type definitions for the scope visualization system

**Exported Types**:

##### Test Data Types:

```typescript
export type RangeType = "content" | "removal";
export type FacetValue = ScopeSupportFacet | PlaintextScopeSupportFacet;

export interface ScopeTests {
  imports: Record<string, string[]>; // Language import mappings
  fixtures: Fixture[]; // All test fixtures
}

export interface Fixture {
  name: string; // Fixture file name
  facet: FacetValue; // Scope facet identifier
  languageId: string; // Programming language
  code: string; // Source code
  scopes: Scope[]; // Scope definitions
}

export interface Scope {
  domain?: string; // Domain range (optional context)
  targets: Target[]; // Target ranges
}

export interface Target {
  content: string; // Content range (always present)
  removal?: string; // Removal range (optional)
}
```

##### Styling Types:

```typescript
export interface RangeTypeColors {
  background: string; // Fill color
  borderSolid: string; // Solid border color
  borderPorous: string; // Dashed border color
}

export interface Highlight {
  range: Range; // Position in document
  style: Style; // Visual styling
}

export interface Style {
  backgroundColor: string;
  borderColorSolid: string;
  borderColorPorous: string;
  borderRadius: BorderRadius;
  borderStyle: {
    top: BorderStyle;
    bottom: BorderStyle;
    left: BorderStyle;
    right: BorderStyle;
  };
}

export interface BorderRadius {
  topLeft: boolean;
  topRight: boolean;
  bottomRight: boolean;
  bottomLeft: boolean;
}
```

**Range Format**: Ranges use "concise" notation: `"line:char-line:char"`

- Example: `"0:3-0:5"` means line 0, characters 3-5
- Zero-indexed positions

---

### Utilities

#### `util.ts`

**Purpose**: Helper functions for data transformation and formatting

**Exports**:

##### `prettifyFacet(facet: FacetValue): string`

Converts internal facet names to display-friendly format

**Logic**:

1. Split by `.` and convert camelCase to lowercase with spaces
2. Capitalize scope name (first part)
3. Add `:` separator and capitalize facet type (second part)
4. Move "iteration" to end in parentheses if present

**Examples**:

- `"function.name"` → `"Function: Name"`
- `"list.iteration"` → `"List (iteration)"`
- `"class.name.iteration"` → `"Class: Name (iteration)"`

##### `getFacetInfo(languageId, facetId): ScopeSupportFacetInfo`

Retrieves metadata about a scope facet

- Checks plaintext vs. language-specific facet registries
- Returns description, scope type, iteration flag, etc.
- Throws error if facet not found

##### `nameComparator(a, b): number`

Alphabetical sorting with natural number ordering

- Uses `localeCompare` with `numeric: true`
- Example: "item1" < "item2" < "item10"

##### `isScopeInternal(scope: ScopeTypeType): boolean`

Determines if a scope is internal (not for user interaction)

**Internal Scopes**:

- `disqualifyDelimiter`
- `pairDelimiter`
- `textFragment`
- `interior`
- `surroundingPairInterior`

---

### Style Files

#### `Code.css`

Styles for the Code component:

- Code container layout
- Copy button positioning and styling
- Link button styling
- Whitespace symbol appearance
- Responsive design

#### `Header.css`

Styles for header components:

- Hash link positioning
- Hover effects
- Anchor link visibility
- Sticky navbar offset handling

#### `ScopeSupport.css`

Styles for scope visualization:

- Facet name styling
- Language ID headers
- Public/internal scope sections
- Control panel (select/checkbox) layout

---

## Data Flow

### Complete Pipeline

1. **Data Loading**:

   ```
   Docusaurus Plugin → usePluginData("scope-tests-plugin") → ScopeTests
   ```

2. **Filtering**:

   ```
   ScopeTests → getScopeFixtures() → Scopes (public/internal)
   ```

3. **Rendering Loop**:

   ```
   Scopes → renderScope() → renderFacet() → Code component
   ```

4. **Decoration Generation**:

   ```
   Fixture → generateDecorations() → DecorationItem[]
   ├─ getRanges() - Extract ranges from fixture
   ├─ getDecorations() - Split by line boundaries
   ├─ getHighlights() - Apply colors and borders
   ├─ flattenHighlights() - Resolve overlaps
   └─ highlightsToDecorations() - Convert to Shiki format
   ```

5. **Code Rendering**:
   ```
   Code + Decorations → Shiki codeToHtml() → HTML string → React DOM
   ```

---

## User Interactions

### View Controls

**Range Type Selector**:

- **Content**: Shows the core content of each scope
- **Removal**: Shows what would be deleted in a removal operation
- Purpose: Demonstrates the difference between scope boundaries

**Render Whitespace Checkbox**:

- **Off**: Normal code display
- **On**: Shows spaces as `·` and tabs as `→ `
- Purpose: Helps visualize whitespace-sensitive scopes

### Interactive Elements

**Copy Button**:

- Copies raw source code to clipboard
- Shows "✅ Copied!" feedback for 1.5 seconds
- Useful for testing code snippets

**GitHub Link**:

- Links to fixture source file in repository
- Format: `https://github.com/cursorless-dev/cursorless/blob/main/data/fixtures/{name}.scope`
- Allows viewing raw test data

**Hash Links**:

- All headings are anchor-linkable
- Enables deep linking to specific scopes/facets
- Scrolls with navbar offset compensation

---

## Architecture Patterns

### Separation of Concerns

1. **Data Layer** (`types.ts`, `util.ts`):
   - Type definitions
   - Data transformation utilities

2. **Processing Layer** (`calculateHighlights.ts`, `flattenHighlights.ts`, `highlightsToDecorations.ts`):
   - Range computation
   - Overlap resolution
   - Style application

3. **Presentation Layer** (`ScopeVisualizer.tsx`, `Code.tsx`, `Header.tsx`):
   - React components
   - User interactions
   - DOM rendering

### Immutable Data Transformations

Each processing step creates new objects rather than mutating:

```
Fixture → Ranges → Decorations → Highlights → Flattened → DecorationItems
```

### Lazy Rendering

- HTML generation happens in `useEffect()` hooks
- Async Shiki rendering prevents blocking
- Loading states shown while processing

### Color Blending Algorithm

When highlights overlap:

1. Extract all background colors for the segment
2. Use `blendMultipleColors()` to blend (from @cursorless/common)
3. Apply blended color to segment
4. Preserve borders from outermost highlight

---

## Integration Points

### Docusaurus

- Uses `usePluginData()` to access scope test data
- Uses `useLocation()` for hash navigation
- Integrates with Docusaurus theme styling
- Follows Docusaurus markdown rendering patterns

### Shiki

- Uses `codeToHtml()` for syntax highlighting
- Uses "nord" theme for consistent appearance
- Leverages `DecorationItem` API for range highlighting
- Supports language fallback mapping

### @cursorless/common

Imports:

- `Range` - Position and range utilities
- `generateDecorationsForCharacterRange()` - Line boundary splitting
- `blendMultipleColors()` - Color blending
- `getBorderColor()`, `getBorderStyle()` - Border rendering
- `useSingleCornerBorderRadius()` - Corner radius logic
- `BORDER_WIDTH`, `BORDER_RADIUS` - Constants
- Facet type definitions and registries

---

## Testing

### Test Suite: `flattenHighlights.test.ts`

**Test Cases**:

1. **Distant targets**: Non-overlapping ranges remain unchanged
2. **Adjacent targets**: Touching boundaries don't merge
3. **Overlapping targets**: Split into non-overlapping segments
4. **Domain == target**: Single segment when ranges are identical
5. **Domain contains target**: Split into target + remainder
6. **Target contains domain**: Split into domain + remainder
7. **Domain overlaps target**: Three segments for partial overlap

**Test Structure**:

```typescript
{
  name: "Test name",
  scopes: [{ domain?, targets }],  // Input
  expected: ["0:3-0:5", ...]       // Expected ranges
}
```

**Assertion**: Verifies output ranges match expected concise notation

---

## Performance Considerations

### Optimization Strategies

1. **Memoization**:
   - `useState` for scope fixtures (computed once)
   - Shiki caches themes and languages

2. **Lazy Loading**:
   - HTML generation deferred to `useEffect()`
   - Only processes visible components

3. **Efficient Algorithms**:
   - `flattenHighlights()` runs in O(n log n) time
   - Uses sorted positions for efficient segment creation

4. **Debouncing**:
   - Whitespace toggle triggers re-render efficiently
   - React batches updates

### Potential Bottlenecks

- Large fixture sets with many scopes
- Complex overlapping highlights requiring extensive flattening
- Shiki HTML generation for very long code samples

**Mitigation**: Consider virtualization for large lists in future

---

## Usage Examples

### Show All Scopes for TypeScript

```tsx
<ScopeVisualizer languageId="typescript" />
```

Renders:

- All TypeScript scope types
- Public scopes first, then internal
- Content/removal toggle
- Whitespace toggle

### Show Specific Scope Across Languages

```tsx
<ScopeVisualizer scopeTypeType="namedFunction" />
```

Renders:

- Named function scope in all languages
- Grouped by facet, then language
- Shows cross-language support

### Standalone Code Example

```tsx
<Code
  languageId="python"
  renderWhitespace={true}
  decorations={[
    {
      start: { line: 0, character: 4 },
      end: { line: 0, character: 7 },
      properties: { style: "background-color: #ad00bc5b;" },
    },
  ]}
>
  def foo(): pass
</Code>
```

---

## Future Enhancement Opportunities

### Potential Features

1. **Interactive Mode**:
   - Click to highlight nested scopes
   - Hover tooltips with scope metadata

2. **Comparison View**:
   - Side-by-side language comparison
   - Diff view for content vs. removal

3. **Search/Filter**:
   - Text search within fixtures
   - Filter by scope support status

4. **Export**:
   - Generate images of visualizations
   - Copy as markdown with syntax

5. **Performance**:
   - Virtual scrolling for large lists
   - Progressive loading of fixtures

### Technical Debt

- `loadFixture.ts` merge conflict markers in test-case-component
- Hardcoded language normalization in `getScopeFixtures()`
- Color constants duplicated from VSCode extension
- Limited theme support (only "nord")

---

## Related Documentation

- Main Cursorless docs: `/packages/cursorless-org-docs/src/docs/user/README.md`
- Scope fixtures: `/data/fixtures/` (`.scope` files)
- Contributing guide: `/packages/cursorless-org-docs/src/docs/contributing/`
- VSCode extension: `/packages/cursorless-vscode/`

---

## Dependencies Summary

### Runtime Dependencies

- `react` - UI framework
- `shiki` - Syntax highlighting
- `@cursorless/common` - Core utilities and types
- `@docusaurus/useGlobalData` - Plugin data access
- `@docusaurus/router` - Navigation utilities

### Development Dependencies

- `@types/react` - TypeScript definitions
- Testing frameworks (as defined in parent package)

---

## Color Reference Quick Guide

| Range Type | Background   | Border Solid   | Border Porous      | Usage              |
| ---------- | ------------ | -------------- | ------------------ | ------------------ |
| Domain     | Cyan (10%)   | Light Purple   | Light Purple Faint | Context/container  |
| Content    | Purple (36%) | Bright Magenta | Light Purple Faint | Core scope content |
| Removal    | Red (18%)    | Bright Red     | Red Medium         | Deletion target    |
| Iteration  | Teal (42%)   | Bright Cyan    | Cyan Faint         | Iterable elements  |

**Border Types**:

- **Solid**: Continuous edges (single-line or solid boundaries)
- **Porous**: Line-crossing edges (multi-line ranges)

---

## Summary

The ScopeVisualizer component system is a sophisticated, multi-layered visualization framework that:

1. **Loads** scope test data from Docusaurus plugins
2. **Filters** and organizes by language and scope type
3. **Processes** ranges with overlap resolution and style blending
4. **Renders** syntax-highlighted code with colored decorations
5. **Provides** interactive controls for different view modes

The architecture emphasizes:

- Immutable data transformations
- Clear separation of concerns
- Efficient algorithms for complex operations
- Rich user interactions
- Comprehensive type safety

This system enables maintainers and users to understand Cursorless scope behavior across all supported languages and scope types through visual documentation.
