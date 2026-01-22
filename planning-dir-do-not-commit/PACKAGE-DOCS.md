# Test Case Component Package Documentation

## Overview

The `@cursorless/test-case-component` package is a React-based component library designed to visually render Cursorless test fixtures using Shiki syntax highlighting. It transforms test case data (before/during/after states) into beautifully formatted, syntax-highlighted code displays with support for decorations, selections, marks, and hats.

## Package Information

- **Name**: `@cursorless/test-case-component`
- **Version**: 0.0.1
- **Type**: ESM (ECMAScript Module)
- **Main Entry**: `./out/index.js`
- **Types**: `./out/index.d.ts`

## Dependencies

### Runtime Dependencies

- `react` - UI component framework
- `shiki` - Syntax highlighting engine
- `fs-extra` - Enhanced file system operations
- `js-yaml` / `yaml` - YAML parsing
- `prettier` - Code formatting (used in tests)

### Development Dependencies

- `@types/react`, `@types/jest`, `@types/fs-extra` - TypeScript type definitions
- `jest`, `ts-jest`, `jest-environment-jsdom` - Testing framework

## File Structure

### Core Files

#### `src/index.ts`

**Purpose**: Main package entry point

**Exports**:

- Re-exports all functions from `generate-examples.ts`
- Re-exports all functions from `test-case-component.tsx`

---

#### `src/generateHtml.ts`

**Purpose**: Core logic for converting Cursorless fixture states into HTML

**Key Types**:

- `SelectionAnchor` - Defines a position in the document (line, character)
- `CursorlessFixtureSelection` - Represents selections with anchor/active positions
- `CursorlessFixtureState` - Complete state including document, marks, decorations, selections

**Key Functions**:

##### `generateHtml(state: CursorlessFixtureState, lang: Lang): Promise<string>`

- Main entry point for HTML generation
- Creates an HTMLGenerator instance and generates HTML
- Returns formatted HTML with syntax highlighting

**Classes**:

##### `HTMLGenerator`

Orchestrates the HTML generation process

**Methods**:

- `generate()` - Main generation workflow: tokenizes code, applies marks, applies selections, renders to HTML
- `getTokens()` - Uses Shiki to tokenize the document contents
- `applyMarks()` - Applies hat marks (e.g., `default.a`) to tokens
- `insertHat()` - Inserts a hat decoration at a specific character position
- `applyAllSelections()` - Applies decorations, selections, thatMark, and sourceMark
- `applySelectionsFromState()` - Applies specific selection type from state
- `getSelectionClasses()` - Generates CSS classes for selections
- `applyLineSelection()` - Handles line-level selections

##### `SelectionParser`

Handles parsing and applying token-level selections across multiple lines

**Methods**:

- `parse(selection)` - Main parsing entry point
- `parseLine()` - Parses selections for a single line
- `handleInsideLine()` - Handles lines fully inside a multi-line selection

##### `SelectionLineParser`

Handles parsing selections within a single line, including partial token selections

**Methods**:

- `parse(startIndex, endIndex)` - Main parsing workflow
- `parseToken()` - Processes individual tokens or selection tokens
- `getTokenState()` - Determines if token is outside/inside/at start/end of selection
- `parseSelection()` - Handles nested selection tokens
- `createSelection()` - Wraps token(s) in a selection
- `startSelection()` - Begins a selection mid-token
- `endSelection()` - Ends a selection mid-token
- `innerSelection()` - Handles selections entirely within a single token

---

#### `src/renderToHtml.ts`

**Purpose**: Low-level HTML rendering utilities (forked from Shiki)

**Key Types**:

- `HatType` - Type of hat decoration (currently just "default")
- `SelectionType` - Types: "decoration" | "selection" | "thatMark" | "sourceMark"
- `Token` - Union type representing tokens, selections, or hats

**Key Functions**:

##### `renderToHtml(lines: Token[][], options): string`

- Converts token arrays into HTML string
- Applies CSS styling from Shiki tokens
- Handles selections, hats, and line options
- Escapes HTML entities

##### `groupBy<TObject>(elements, keyGetter)`

- Utility function to group array elements by a key

##### `escapeHtml(html: string): string`

- Escapes HTML special characters (`&<>"'`)

##### `getLineClasses(lineOptions)`

- Aggregates CSS classes for a line

**Element Builders**:

- `elements.pre()` - Builds `<pre>` wrapper
- `elements.code()` - Builds `<code>` container
- `elements.line()` - Builds line `<span>` elements
- `elements.token()` - Builds token `<span>` elements with syntax colors
- `elements.selection()` - Builds selection `<span>` wrappers
- `elements.hat()` - Builds hat decoration `<span>` elements

---

#### `src/loadFixture.ts`

**Purpose**: Loads fixture data and generates HTML for all states

**Key Functions**:

##### `loadFixture(data: any): Promise<object>`

- Accepts fixture data (typically from YAML)
- Generates HTML for before, during (decorations), and after states
- Returns object with:
  - `language` - Language ID
  - `command` - Spoken form of the command
  - `before` - HTML of initial state
  - `during` - HTML of state with decorations (if present)
  - `after` - HTML of final state

##### `safeGenerateHtml(stateName, state, languageId)`

- Wrapper around `generateHtml` with error logging
- Logs state name and full state JSON on error

**Note**: File contains merge conflict markers (lines 3-13)

---

#### `src/generate-examples.ts`

**Purpose**: Stub/placeholder for example generation

**Functions**:

- `generateExamples()` - Currently returns placeholder string "generate-examples"

---

#### `src/buildDictionary.ts`

**Purpose**: Build script that loads and logs multiple fixtures

**Functionality**:

- Loads 5 sample fixtures using `loadFixture()`
- Logs each fixture in a formatted structure showing before/during/after states
- Example fixtures:
  - `actions/bringArgMadeAfterLook`
  - `decorations/chuckBlockAirUntilBatt`
  - `decorations/cutFine`
  - `decorations/chuckLineFine`
  - `actions/bringAirAndBatAndCapToAfterItemEach`

---

### React Components

#### `src/components/component-shiki.tsx`

**Purpose**: Primary display component for rendering a single test case fixture

**Component**: `ShikiComponent`

**Role in Architecture**:
This is the **bridge component** between the HTML generation layer and the React presentation layer. It receives pre-generated HTML strings and displays them in a structured layout.

**Props**:

- `data: any` - Test case data object returned from `loadFixture()` containing:
  - `command` - Command name/description (spoken form)
  - `language` - Programming language ID
  - `before` - HTML string for initial state
  - `during` - HTML string for during-execution state (optional, only if decorations present)
  - `after` - HTML string for final state

**Rendering Logic**:

1. **Command Header**: Displays the command name as an `<h2>` element
2. **Before State**: Conditionally renders if `data.before` exists, injecting HTML via `dangerouslySetInnerHTML`
3. **During State**: Conditionally renders if `data.during` exists (shows decorations/flash effects)
4. **After State**: Conditionally renders if `data.after` exists
5. **Debug Output**: Includes `<pre>` with JSON.stringify of entire data object for development

**Why `dangerouslySetInnerHTML`?**

- The HTML is pre-generated and trusted (comes from internal `generateHtml()`)
- Allows Shiki's rich syntax highlighting to be preserved
- Avoids React re-parsing and re-rendering the complex HTML structure

**Styling**: Uses Tailwind CSS classes:

- `dark:text-stone-100` - Dark mode text color
- `px-4`, `p-4`, `p-8` - Padding utilities
- Responsive to parent container

**Note**: Currently receives `data: any` but should ideally use a typed interface for better type safety

---

#### `src/test-case-component.tsx`

**Purpose**: Main page component that displays multiple test cases

**Component**: `TestCaseComponentPage`

**Props**:

- `data: any` - Original data (unused in current implementation)
- `loaded: any` - Array of processed fixture data

**Rendering**:

- Page header with title "Test Component Sheet"
- Maps over `loaded` array to render multiple `ShikiComponent` instances
- Uses `command` as React key

**Styling**: Uses Tailwind CSS for responsive typography

---

### Test Files

#### `src/generateHtml.spec.ts`

**Purpose**: Jest test suite for HTML generation

**Test Cases**:

1. **"should select whole line"**
   - Tests line-level selection rendering
   - Verifies CSS class `selection` on entire line

2. **"should select single token"**
   - Tests selecting a complete token ("oneLine")
   - Verifies selection wrapper with `className="selection"`

3. **"should select multiple tokens"**
   - Tests selecting across multiple tokens
   - Verifies continuous selection wrapper

4. **"should select inside tokens"**
   - Tests partial token selection
   - Verifies token splitting at selection boundaries

5. **"should select inside single token"**
   - Tests selecting substring within a token ("Li" from "oneLine")
   - Verifies token is split into three parts

6. **"should select superset ranges"**
   - Tests overlapping selections (thatMark containing selection)
   - Verifies nested className composition (`thatMark selection`)

**Test Utilities**:

- Wraps `generateHtml` with Prettier formatting for snapshot consistency
- Uses Jest inline snapshots for expected HTML output

---

### Style Files

#### `src/shiki.css`

Styles for Shiki syntax highlighting output

#### `src/styles.css`

Additional component styles

---

## Build Scripts

### Available Commands

- `pnpm build` - Runs `buildDictionary.ts` script
- `pnpm test` - Runs Jest test suite
- `pnpm test:watch` - Runs Jest in watch mode
- `pnpm compile` - Compiles TypeScript and bundles with esbuild
- `pnpm compile:tsc` - TypeScript compilation only
- `pnpm compile:esbuild` - esbuild bundling only
- `pnpm watch` - Runs both watch tasks in parallel
- `pnpm clean` - Removes build artifacts

---

## Key Concepts

### Complete Rendering Pipeline

The package uses a **hybrid architecture** combining HTML generation with React rendering:

```
Fixture Data (YAML/JSON)
  ↓
loadFixture(data)
  ↓
generateHtml() for each state (before, during, after)
  ├─ Tokenization (Shiki)
  ├─ Apply Marks (insertHat)
  ├─ Apply Selections (SelectionParser)
  └─ renderToHtml() → HTML string
  ↓
Returns { language, command, before, during, after }
  ↓
ShikiComponent (React)
  ├─ Renders command heading
  ├─ Injects before HTML (dangerouslySetInnerHTML)
  ├─ Injects during HTML (dangerouslySetInnerHTML)
  └─ Injects after HTML (dangerouslySetInnerHTML)
  ↓
TestCaseComponentPage (React)
  └─ Maps over array of fixtures → multiple ShikiComponents
```

**Key Insight**: The package generates **static HTML strings** at the data layer, then uses **React components** as a presentation layer to display them. This separates concerns:

- **Data Layer** (`generateHtml.ts`, `loadFixture.ts`): Pure functions that generate HTML
- **Presentation Layer** (`ShikiComponent`, `TestCaseComponentPage`): React components that display HTML

### Token Processing Pipeline

1. **Tokenization**: Shiki tokenizes source code into colored tokens
2. **Mark Application**: Hat decorations are inserted at specific character positions
3. **Selection Application**: Decorations/selections wrap tokens or parts of tokens
4. **HTML Rendering**: Tokens are converted to nested `<span>` elements with inline styles
5. **React Display**: HTML is injected into React components via `dangerouslySetInnerHTML`

### Selection Types

- **`decoration`** - IDE flash decorations showing transient highlights
- **`selection`** - User selections in the editor
- **`thatMark`** - Cursorless "that" mark (previous target)
- **`sourceMark`** - Cursorless source mark (for copy/move operations)

### Hat Decorations

Hats are character-level decorations placed over specific characters in the code to indicate Cursorless targets. Currently supports `default` hat type.

### State Representation

Each test case includes:

- **Initial State**: Code with selections/marks before command execution
- **Decorations State** (optional): Code with temporary decorations shown during execution
- **Final State**: Code after command execution

---

## Usage Example

```typescript
import { loadFixture } from "@cursorless/test-case-component";

const fixtureData = {
  languageId: "typescript",
  command: { spokenForm: "chuck air" },
  initialState: {
    documentContents: "const foo = 1;",
    selections: [
      {
        type: "selection",
        anchor: { line: 0, character: 6 },
        active: { line: 0, character: 9 },
      },
    ],
  },
  finalState: {
    documentContents: "const  = 1;",
  },
};

const result = await loadFixture(fixtureData);
// result.before: HTML with "foo" highlighted
// result.after: HTML with "foo" removed
```

---

## Architecture Notes

### Design Patterns

- **Separation of Concerns**: HTML generation (generateHtml.ts) is separate from rendering (renderToHtml.ts)
- **Parser Pattern**: Multiple parser classes handle different levels (multi-line, single-line, token-level)
- **State Machine**: SelectionLineParser uses token states (outside/start/continue/end/entire/inner)

### Known Issues

- `loadFixture.ts` contains unresolved merge conflict markers
- `generate-examples.ts` is currently a stub implementation

### Extension Points

- Additional `HatType` values can be added (currently only "default")
- Custom selection types can be added to `SelectionType`
- Element builders in `renderToHtml.ts` can be customized for different HTML output

---

## Related Packages

This package is designed to work with:

- `@cursorless/common` - Core Cursorless types and utilities
- `@cursorless/node-common` - Node.js-specific utilities
- Cursorless test fixtures located in `data/fixtures/recorded/`
