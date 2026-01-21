/* https://github.com/cursorless-dev/cursorless/blob/a9affbb83a0d81476760c5c4fdd5b67c8162ae25/packages/cursorless-vscode/package.json#L560-L581 */

export const highlightColors = {
  // ScopeVisualizer colors (for .scope files)
  domain: {
    background: "#00e1ff18",
    borderSolid: "#ebdeec84",
    borderPorous: "#ebdeec3b",
  },
  content: {
    background: "#ad00bc5b",
    borderSolid: "#ee00ff78",
    borderPorous: "#ebdeec3b",
  },
  removal: {
    background: "#ff00002d",
    borderSolid: "#ff000078",
    borderPorous: "#ff00004a",
  },
  iteration: {
    background: "#00725f6c",
    borderSolid: "#00ffd578",
    borderPorous: "#00ffd525",
  },

  // test-case-component colors (for .yml fixture files)
  // Based on packages/test-case-component/src/styles.css
  selection: {
    background: "#55F2", // Semi-transparent blue
    borderSolid: "#00B", // Dark blue
    borderPorous: "#00B4",
  },
  decoration: {
    background: "#00800040", // Semi-transparent green
    borderSolid: "#008000",
    borderPorous: "#00800060",
  },
  thatMark: {
    background: "#ffff0030", // Semi-transparent yellow
    borderSolid: "#ffff00",
    borderPorous: "#ffff0050",
  },
  sourceMark: {
    background: "#ffa50030", // Semi-transparent orange
    borderSolid: "#ffa500",
    borderPorous: "#ffa50050",
  },

  // Flash/highlight styles from ide.flashes (DURING state)
  // - referenced: source items being read (use with final state)
  // - pendingModification0/1: destination targets being modified (use with final state)
  // - pendingDelete: ranges being deleted (use with initial state)
  referenced: {
    background: "#00ffd525", // Semi-transparent cyan (similar to iteration)
    borderSolid: "#00ffd578",
    borderPorous: "#00ffd525",
  },
  pendingModification0: {
    background: "#ffff0040", // Semi-transparent yellow (target/destination)
    borderSolid: "#ffff00",
    borderPorous: "#ffff0060",
  },
  pendingModification1: {
    background: "#ff00ff40", // Semi-transparent magenta (alternative target)
    borderSolid: "#ff00ff",
    borderPorous: "#ff00ff60",
  },
  pendingDelete: {
    background: "#ff00002d", // Semi-transparent red (what's being deleted)
    borderSolid: "#ff000078",
    borderPorous: "#ff00004a",
  },
};
