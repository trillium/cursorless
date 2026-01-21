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

  for (const test of getRecordedTestPaths()) {
    try {
      const fileContents = fs.readFileSync(test.path, "utf8");
      const data = yaml.load(fileContents) as any;

      const fixture: TestCaseFixture = {
        languageId: data.languageId,
        command: data.command
          ? {
              spokenForm: data.command.spokenForm,
            }
          : undefined,
        initialState: data.initialState,
        finalState: data.finalState,
        decorations: data.decorations,
      };

      fixtures.push(fixture);

      if (!fixturesByLanguage[data.languageId]) {
        fixturesByLanguage[data.languageId] = [];
      }
      fixturesByLanguage[data.languageId].push(fixture);
    } catch (error) {
      console.warn(`Failed to load recorded test ${test.path}:`, error);
    }
  }

  const languageIds = Object.keys(fixturesByLanguage).sort();

  console.log(
    `Loaded ${fixtures.length} recorded test fixtures for ${languageIds.length} languages:`,
  );
  languageIds.forEach((lang) => {
    console.log(`  ${lang}: ${fixturesByLanguage[lang].length} fixtures`);
  });

  return { fixtures, fixturesByLanguage, languageIds };
}
