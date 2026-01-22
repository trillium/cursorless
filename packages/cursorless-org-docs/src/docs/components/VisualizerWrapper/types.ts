import type { CursorlessFixtureState } from "../fixtureAdapter";

/**
 * Represents a flash highlight from ide.flashes in the fixture
 */
export interface FlashDecoration {
  style: string;
  type: string;
  start: { line: number; character: number };
  end: { line: number; character: number };
}

/**
 * Represents a complete test case fixture from a .yml recorded test file
 */
export interface TestCaseFixture {
  languageId: string;
  command?: {
    spokenForm: string;
    action?: {
      name: string;
      snippetDescription?: {
        type: string;
        body?: string;
        name?: string;
        [key: string]: any;
      };
      [key: string]: any;
    };
  };
  initialState: CursorlessFixtureState;
  finalState: CursorlessFixtureState;
  flashes?: FlashDecoration[];
}

export interface VisualizerWrapperProps {
  fixture: TestCaseFixture;
  showCommand?: boolean;
  animated?: boolean;
}

export type AnimationState = "before" | "during" | "after";

export interface SimpleVisualizerProps {
  languageId: string;
  before: CursorlessFixtureState;
  after: CursorlessFixtureState;
  command?: string;
}
