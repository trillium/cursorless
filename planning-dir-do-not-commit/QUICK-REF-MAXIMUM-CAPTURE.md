# Quick Reference: Maximum Data Capture

## TL;DR

**Config file created**: `data/fixtures/recorded/config.json`

```json
{
  "isDecorationsTest": true,
  "captureFinalThatMark": true,
  "extraSnapshotFields": ["timeOffsetSeconds"]
}
```

This captures **all available data** in recorded fixtures.

---

## What This Captures

### ✅ Always Captured (No Config Needed)
- `documentContents` - Full document text before/after
- `selections` - Cursor positions (anchor/active)
- `marks` - Hat positions referenced in command
- `languageId` - Programming language
- `command` - Full command structure + spoken form
- `returnValue` - Command return value
- `visibleRanges` - Scroll position (captured but not asserted)

### ✅ Enabled by Config
- `ide.flashes` - Flash decorations (e.g., deletion highlights)
- `ide.highlights` - Highlight decorations by ID
- `ide.messages` - User notifications
- `finalState.thatMark` - "That" mark after command
- `finalState.sourceMark` - "Source" mark after command
- `timeOffsetSeconds` - Timing data (both states)

### ✅ Conditionally Captured (Action-Dependent)
- `clipboard` - For copy/paste actions
- `thatMark`, `sourceMark`, `instanceReferenceMark`, `keyboardMark` - Stored targets

---

## How to Use

### Record a Test
```
1. Say: "cursorless record"
2. Pick: Any directory
3. Perform: Voice command
4. Say: "cursorless record" (stop)
```

### Verify Capture
```bash
# Check generated file
code data/fixtures/recorded/{directory}/{testName}.yml

# Look for these fields:
# - ide (decorations)
# - finalState.thatMark
# - timeOffsetSeconds
```

---

## What You Get

### Example Fixture with All Data
```yaml
languageId: typescript
command:
  version: 6
  spokenForm: take air
  action: {...}
initialState:
  documentContents: "hello world"
  selections:
    - anchor: {line: 0, character: 0}
      active: {line: 0, character: 5}
  marks:
    default.a: {...}
  visibleRanges: [{...}]
  timeOffsetSeconds: 0.0
finalState:
  documentContents: "world"
  selections: [{...}]
  thatMark: [{...}]
  sourceMark: [{...}]
  timeOffsetSeconds: 0.085
ide:
  messages: []
  flashes:
    - style: justAdded
      range: {...}
  highlights:
    - highlightId: pendingModification
      ranges: [{...}]
returnValue: null
```

---

## Common Issues

### Config Not Working
- ✅ Check JSON syntax: `cat data/fixtures/recorded/config.json | jq`
- ✅ Restart VSCode extension after config changes
- ✅ Verify recording in correct directory

### Missing Properties
- `ide` field missing → Check `isDecorationsTest: true`
- `thatMark` missing → Check `captureFinalThatMark: true`
- `timeOffsetSeconds` missing → Check `extraSnapshotFields`

---

## Files Created

1. **Config file** (active):
   - `data/fixtures/recorded/config.json`
   - Applied to ALL recordings under this directory

2. **Documentation**:
   - `CAPTURE-ALL-FIXTURE-DATA.md` - Comprehensive guide
   - `HOW-TO-ADD-TRACKED-PROPERTIES-TO-FIXTURES.md` - Adding new properties
   - This file - Quick reference

---

## Override for Specific Directory

To change config for specific tests:

```bash
# Example: Different config for clipboard tests
mkdir -p data/fixtures/recorded/clipboard
cat > data/fixtures/recorded/clipboard/config.json << 'EOF'
{
  "isDecorationsTest": false,
  "captureFinalThatMark": false
}
EOF
```

Configs are merged: child inherits from parent.

---

## Disable Maximum Capture

To revert to minimal capture:

```bash
rm data/fixtures/recorded/config.json
```

Or modify to only capture what you need:

```json
{
  "isDecorationsTest": false,
  "captureFinalThatMark": false,
  "extraSnapshotFields": []
}
```

---

## Performance Note

Capturing everything adds minimal overhead (~10-20ms per command).

If recording many tests, consider:
- Disabling `timeOffsetSeconds` (least useful)
- Disabling `isDecorationsTest` (if not testing UI)
- Keeping `captureFinalThatMark` (useful for debugging)

---

## Summary

✅ **Config created**: Maximum data capture enabled
✅ **Location**: `data/fixtures/recorded/config.json`
✅ **Status**: Active for all future recordings
✅ **Action needed**: None - just record tests as normal
