import React from "react";
import { usePluginData } from "@docusaurus/useGlobalData";
import { DynamicTOC } from "../../../components/DynamicTOC";
import { ScopeVisualizer } from "../../../components/ScopeVisualizer";
import { ScrollToHashId } from "../../../components/ScrollToHashId";
import {
  VisualizerWrapper,
  type TestCaseFixture,
} from "../../../components/VisualizerWrapper";

interface Props {
  languageId: string;
}

interface RecordedTests {
  fixtures: TestCaseFixture[];
  fixturesByLanguage: Record<string, TestCaseFixture[]>;
  languageIds: string[];
}

export function Language({ languageId }: Props) {
  const recordedTests = usePluginData("recorded-tests-plugin") as RecordedTests;
  const languageFixtures = recordedTests.fixturesByLanguage[languageId] || [];

  return (
    <>
      <DynamicTOC />
      <ScrollToHashId />

      <ScopeVisualizer languageId={languageId} />

      {languageFixtures.length > 0 && (
        <>
          <h2>Recorded Test Examples</h2>
          <p>
            Below are examples of Cursorless commands from our recorded test
            suite for this language. We have {languageFixtures.length}{" "}
            {languageFixtures.length === 1 ? "example" : "examples"} for{" "}
            {languageId}.
          </p>
          {languageFixtures.map((fixture, index) => (
            <VisualizerWrapper key={index} fixture={fixture} />
          ))}
        </>
      )}
    </>
  );
}
