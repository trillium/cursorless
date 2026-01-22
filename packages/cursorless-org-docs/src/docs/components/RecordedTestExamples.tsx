import React from "react";
import { usePluginData } from "@docusaurus/useGlobalData";
import { AnimatedVisualizer, type TestCaseFixture } from "./VisualizerWrapper";

interface RecordedTests {
  fixtures: TestCaseFixture[];
  fixturesByLanguage: Record<string, TestCaseFixture[]>;
  languageIds: string[];
}

interface RecordedTestExamplesProps {
  languageId: string;
}

/**
 * Component that displays recorded test examples for a specific language.
 * Handles data fetching and rendering of AnimatedVisualizers.
 */
export function RecordedTestExamples({
  languageId,
}: RecordedTestExamplesProps) {
  const recordedTests = usePluginData("recorded-tests-plugin") as
    | RecordedTests
    | undefined;

  const languageFixtures =
    recordedTests?.fixturesByLanguage?.[languageId] || [];

  if (languageFixtures.length === 0) {
    return null;
  }

  return (
    <>
      <h2>Recorded Test Examples</h2>
      <p>
        Below are examples of Cursorless commands from our recorded test suite
        for this language. We have {languageFixtures.length}{" "}
        {languageFixtures.length === 1 ? "example" : "examples"} for{" "}
        {languageId}.
      </p>
      {languageFixtures.map((fixture, index) => (
        <AnimatedVisualizer key={index} fixture={fixture} />
      ))}
    </>
  );
}
