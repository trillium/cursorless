import { getRecordedTestPaths } from "@cursorless/node-common";
import type { LoadContext, Plugin, PluginOptions } from "@docusaurus/types";
import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import type { TestCaseFixture } from "../docs/components/VisualizerWrapper";

export interface RecordedTests {
  fixtures: TestCaseFixture[];
  fixturesByLanguage: Record<string, TestCaseFixture[]>;
  languageIds: string[];
}

export default function recordedTestsPlugin(
  _context: LoadContext,
  _options: PluginOptions,
): Plugin<RecordedTests> {
  return {
    name: "recorded-tests-plugin",

    loadContent(): RecordedTests {
      const repoRoot = path.join(__dirname, "../../../..");
      process.env.CURSORLESS_REPO_ROOT = repoRoot;
      return loadRecordedTests();
    },

    contentLoaded({ content, actions }) {
      actions.setGlobalData(content);
    },
  };
}

function loadRecordedTests(): RecordedTests {
  const fixtures: TestCaseFixture[] = [];
  const fixturesByLanguage: Record<string, TestCaseFixture[]> = {};
  let errorCount = 0;

  // Only load tests from the visualized directory
  const visualizedTests = getRecordedTestPaths().filter((test) =>
    test.path.includes(path.sep + "visualized" + path.sep)
  );

  for (const test of visualizedTests) {
    try {
      const fileContents = fs.readFileSync(test.path, "utf8");
      const data = yaml.load(fileContents) as any;

      // Validate required fields
      if (!data.languageId) {
        console.warn(`Skipping ${test.path}: missing languageId`);
        errorCount++;
        continue;
      }

      if (!data.initialState || !data.initialState.documentContents) {
        console.warn(
          `Skipping ${test.path}: missing initialState.documentContents`,
        );
        errorCount++;
        continue;
      }

      if (!data.finalState || !data.finalState.documentContents) {
        console.warn(
          `Skipping ${test.path}: missing finalState.documentContents`,
        );
        errorCount++;
        continue;
      }

      // Transform ide.flashes to decorations format for visualization
      let decorations: TestCaseFixture["decorations"] = undefined;
      if (data.ide?.flashes) {
        decorations = data.ide.flashes.map((flash: any) => {
          const range = flash.range;
          // Handle both character and line range types
          let start: { line: number; character: number };
          let end: { line: number; character: number };

          if (range.type === "line") {
            // Line ranges use numeric start/end
            start = { line: range.start, character: 0 };
            end = { line: range.end, character: 0 };
          } else {
            // Character ranges use object start/end
            start = range.start;
            end = range.end;
          }

          return {
            name: flash.style,
            type: range.type || "character",
            start,
            end,
          };
        });
      } else if (data.decorations) {
        // Fallback to old decorations format if present
        decorations = data.decorations;
      }

      const fixture: TestCaseFixture = {
        languageId: data.languageId,
        command: data.command
          ? {
              spokenForm: data.command.spokenForm,
            }
          : undefined,
        initialState: data.initialState,
        finalState: data.finalState,
        decorations,
      };

      fixtures.push(fixture);

      if (!fixturesByLanguage[data.languageId]) {
        fixturesByLanguage[data.languageId] = [];
      }
      fixturesByLanguage[data.languageId].push(fixture);
    } catch (error) {
      console.warn(`Failed to load recorded test ${test.path}:`, error);
      errorCount++;
    }
  }

  const languageIds = Object.keys(fixturesByLanguage).sort();

  console.log(
    `Loaded ${fixtures.length} recorded test fixtures from visualized/ directory for ${languageIds.length} languages`,
  );
  if (errorCount > 0) {
    console.warn(`Skipped ${errorCount} fixtures due to errors`);
  }
  languageIds.forEach((lang) => {
    console.log(`  ${lang}: ${fixturesByLanguage[lang].length} fixtures`);
  });

  return { fixtures, fixturesByLanguage, languageIds };
}
