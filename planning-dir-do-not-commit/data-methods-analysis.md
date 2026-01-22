# Analysis: Data Methods in test-case-component

## Summary

The data methods in `test-case-component` (`generateHtml`, `renderToHtml`, `loadFixture`) are **largely unused** and **duplicative** now that both packages use the same unified Code component from `@cursorless/test-case-component`.

## Current Architecture

### New Unified Approach (Currently Used)

Both `@cursorless/test-case-component` and `@cursorless/cursorless-org-docs` now use:

1. **Code.tsx** - React component that:
   - Uses Shiki's built-in `codeToHtml()` API
   - Accepts `fixtureState` or `decorations` props
   - Renders syntax-highlighted code with decorations at runtime

2. **fixtureAdapter.ts** - Data transformation layer that:
   - `convertFixtureStateToDecorations()` - Converts fixture state to Shiki DecorationItem format
   - `convertFixtureStateWithFlashes()` - Handles DURING state with flashes
   - `convertHatMarksToDecorations()` - Converts hat marks to decorations

3. **VisualizerWrapper.tsx** - Container component that:
   - Handles before/during/after state rendering
   - Uses Code component for all visualizations
   - Supports animated jumbotron mode

**Location:** Both packages have identical copies of these files in their `components/` directories.

### Old Custom Approach (Mostly Unused)

The old approach in `@cursorless/test-case-component` consists of:

1. **generateHtml.ts** - Custom token-based HTML generator:
   - Uses Shiki highlighter to tokenize code
   - Manually applies marks (hats) by splicing tokens
   - Manually applies selections by wrapping tokens
   - Calls `renderToHtml()` to generate HTML strings
   - ~445 lines of complex token manipulation

2. **renderToHtml.ts** - HTML string renderer:
   - Converts tokens to HTML strings using template functions
   - Manual HTML escaping and string concatenation
   - ~207 lines

3. **loadFixture.ts** (in test-case-component):
   - Calls `generateHtml()` multiple times for before/during/after states
   - Returns object with `{ language, command, during, before, after }` containing **HTML strings**
   - ~70 lines

**Note:** There's a DIFFERENT `loadFixture` in `@cursorless/node-common` that just reads YAML files (not related to HTML generation).

## Usage Analysis

### Old Methods Usage

1. **generateHtml.ts**
   - ✅ Used by: `loadFixture.ts` (same package)
   - ✅ Used by: `generateHtml.spec.ts` (test file)
   - ❌ Not imported by any other packages

2. **renderToHtml.ts**
   - ✅ Used by: `generateHtml.ts` (same package)
   - ❌ Not imported by any other packages

3. **loadFixture.ts** (test-case-component version)
   - ✅ Exported from package via `index.ts`
   - ✅ Used by: `buildDictionary.ts` (same package)
   - ❌ Not imported by any other packages
   - ⚠️ `buildDictionary.ts` is run as a build script in `package.json`

### buildDictionary.ts Analysis

```typescript
// Loads YAML fixtures and calls loadFixture to generate HTML
// Outputs the HTML to console in a specific format
// Run via: pnpm build
```

**Status:** This appears to be a **legacy build tool** that:

- Loads specific fixture files
- Generates HTML for them
- Outputs formatted HTML to console
- Not clear if this output is actually used anywhere

### New Methods Usage

1. **Code.tsx**
   - ✅ Used by: `VisualizerWrapper.tsx` (both packages)
   - ✅ Used by: `ScopeVisualizer.tsx` (cursorless-org-docs)
   - ✅ Actively used for all visualization

2. **fixtureAdapter.ts**
   - ✅ Used by: `Code.tsx` (both packages)
   - ✅ Used by: `VisualizerWrapper.tsx` (both packages)
   - ✅ Used by: `calculateHighlights.ts` (cursorless-org-docs)
   - ✅ Actively used for all fixture rendering

3. **VisualizerWrapper.tsx**
   - ✅ Used by: `component-shiki.tsx` (test-case-component)
   - ✅ Exported from package
   - ✅ Used by: `component-sheet.tsx` (cursorless-org)
   - ✅ Actively used

## Key Differences

| Aspect          | Old Approach                                           | New Approach                       |
| --------------- | ------------------------------------------------------ | ---------------------------------- |
| **Rendering**   | Manual token manipulation + string templates           | Shiki's `codeToHtml()` API         |
| **Timing**      | Build-time HTML generation                             | Runtime React rendering            |
| **Output**      | HTML strings                                           | React components                   |
| **Data Format** | Tokens → HTML                                          | Fixture state → DecorationItems    |
| **Flexibility** | Hard to maintain, tightly coupled                      | Modular, uses Shiki's standard API |
| **Code Size**   | ~722 lines (generateHtml + renderToHtml + loadFixture) | ~361 lines (fixtureAdapter only)   |

## Duplication Status

### Duplicate Functionality

The old methods duplicate the new functionality:

1. **Hat rendering:**
   - Old: `insertHat()` in generateHtml.ts manually splices tokens
   - New: `convertHatMarksToDecorations()` uses Shiki's DecorationItem API

2. **Selection highlighting:**
   - Old: Complex `SelectionParser` and `SelectionLineParser` classes (~200 lines)
   - New: `convertFixtureStateToHighlights()` + Shiki decorations (~150 lines)

3. **HTML output:**
   - Old: Manual string concatenation with custom templates
   - New: Shiki's built-in HTML renderer

### Non-Duplicate (Legacy-Specific)

The only thing potentially NOT duplicated:

- `buildDictionary.ts` uses the old methods to output HTML to console
- Unclear if this console output is consumed anywhere
- No other code imports or uses this

## Recommendations

### 1. Immediate: Mark as Deprecated

The old methods should be marked as deprecated with comments explaining:

- They're no longer used by active code
- New code should use Code component + fixtureAdapter
- They may be removed in a future cleanup

Files to mark:

- `generateHtml.ts`
- `renderToHtml.ts`
- `loadFixture.ts` (test-case-component version)
- `buildDictionary.ts`

### 2. Investigate: buildDictionary Output

Before removal, investigate:

- Is the `buildDictionary.ts` output consumed anywhere?
- Check if `pnpm build` is run in CI/CD
- Check if the console output is captured/used
- If not used, can be safely removed

### 3. Future: Remove Dead Code

After confirming buildDictionary is not needed:

- Remove `generateHtml.ts`
- Remove `renderToHtml.ts`
- Remove `loadFixture.ts` (test-case-component version)
- Remove `buildDictionary.ts`
- Remove related exports from `index.ts`
- Update package.json build script

### 4. Maintain: Test Coverage

Keep `generateHtml.spec.ts` only if:

- It's testing functionality still used elsewhere
- Otherwise, remove with the old code

## File Locations

### Old Methods (test-case-component only)

```
packages/test-case-component/src/
├── generateHtml.ts          (445 lines - UNUSED)
├── renderToHtml.ts          (207 lines - UNUSED)
├── loadFixture.ts           (70 lines - UNUSED except by buildDictionary)
├── buildDictionary.ts       (48 lines - UNCLEAR if output is used)
└── generateHtml.spec.ts     (test file)
```

### New Methods (both packages have copies)

```
packages/test-case-component/src/components/
├── Code.tsx                 (138 lines - ACTIVELY USED)
├── fixtureAdapter.ts        (361 lines - ACTIVELY USED)
└── VisualizerWrapper.tsx    (313 lines - ACTIVELY USED)

packages/cursorless-org-docs/src/docs/components/
├── Code.tsx                 (138 lines - ACTIVELY USED)
├── fixtureAdapter.ts        (319 lines - ACTIVELY USED)
└── ScopeVisualizer.tsx      (uses Code component)
```

## Conclusion

**Status: DUPLICATE and UNUSED**

- ✅ The old methods (generateHtml, renderToHtml, loadFixture) are duplicative
- ✅ They're unused by active code (only buildDictionary uses them)
- ⚠️ buildDictionary.ts usage needs investigation before removal
- ✅ New unified approach (Code + fixtureAdapter) handles all current needs
- ✅ Safe to deprecate and schedule for removal after buildDictionary investigation

**Next Step:** Investigate whether `pnpm build` output from buildDictionary.ts is consumed anywhere in the build pipeline or documentation generation.
