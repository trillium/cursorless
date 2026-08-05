// Generates animated command-visualizer SVGs from recorded fixtures and
// writes them to static/img/commands/, so docs pages can embed them as plain
// <img> tags. Run before the docs build (see package.json "build"/"dev").

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderCommand } from "@cursorless/command-visualizer";

const repoRoot = path.join(import.meta.dirname, "..", "..", "..");
const fixturesRoot = path.join(repoRoot, "resources", "fixtures", "recorded");
const outDir = path.join(
  import.meta.dirname,
  "..",
  "static",
  "img",
  "commands",
);

interface CommandDemo {
  /** Output filename stem, e.g. "chuck-vest" -> chuck-vest.svg */
  id: string;
  /** Path relative to resources/fixtures/recorded/ */
  fixtureRel: string;
}

const DEMOS: CommandDemo[] = [
  { id: "chuck-vest", fixtureRel: "actions/chuckVest.yml" },
  { id: "call-vest", fixtureRel: "actions/callVest.yml" },
];

mkdirSync(outDir, { recursive: true });

for (const { id, fixtureRel } of DEMOS) {
  const fixturePath = path.join(fixturesRoot, fixtureRel);
  const src = readFileSync(fixturePath, "utf8");
  const svg = renderCommand(src, fixtureRel, { theme: "dark" });
  const outPath = path.join(outDir, `${id}.svg`);
  writeFileSync(outPath, svg);
  console.log(`generated ${outPath}`);
}
