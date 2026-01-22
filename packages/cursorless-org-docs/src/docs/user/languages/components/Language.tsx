import React from "react";
import { DynamicTOC } from "../../../components/DynamicTOC";
import { ScopeVisualizer } from "../../../components/ScopeVisualizer";
import { ScrollToHashId } from "../../../components/ScrollToHashId";
import { RecordedTestExamples } from "../../../components/RecordedTestExamples";

interface Props {
  languageId: string;
}

export function Language({ languageId }: Props) {
  return (
    <>
      <RecordedTestExamples languageId={languageId} />

      <DynamicTOC />
      <ScrollToHashId />

      <ScopeVisualizer languageId={languageId} />
    </>
  );
}
