import { Parser, Grammar } from "nearley";
import grammar from "./generated/grammar";
import assert from "assert";
import { KeyDescriptor } from "../TokenTypeHelpers";
import { KeyboardCommandHandler } from "../KeyboardCommandHandler";
import { KeyboardCommand } from "../KeyboardCommandTypeHelpers";

interface TestCase {
  tokens: KeyDescriptor[];
  expected: KeyboardCommand<keyof KeyboardCommandHandler>;
}

const testCases: TestCase[] = [
  {
    tokens: [{ type: "shape", value: "fox" }],
    expected: {
      arg: {
        decoratedMark: {
          shape: "fox",
        },
        mode: "replace",
      },
      type: "targetDecoratedMark",
    },
  },
  {
    tokens: [{ type: "color", value: "green" }],
    expected: {
      arg: {
        decoratedMark: {
          color: "green",
        },
        mode: "replace",
      },
      type: "targetDecoratedMark",
    },
  },
  {
    tokens: [
      { type: "combineColorAndShape", value: "combineColorAndShape" },
      { type: "color", value: "green" },
      { type: "shape", value: "fox" },
    ],
    expected: {
      arg: {
        decoratedMark: {
          color: "green",
          shape: "fox",
        },
        mode: "replace",
      },
      type: "targetDecoratedMark",
    },
  },
  {
    tokens: [
      { type: "combineColorAndShape", value: "combineColorAndShape" },
      { type: "shape", value: "fox" },
      { type: "color", value: "green" },
    ],
    expected: {
      arg: {
        decoratedMark: {
          color: "green",
          shape: "fox",
        },
        mode: "replace",
      },
      type: "targetDecoratedMark",
    },
  },
  {
    tokens: [
      { type: "makeRange", value: "makeRange" },
      { type: "color", value: "green" },
    ],
    expected: {
      arg: {
        decoratedMark: {
          color: "green",
        },
        mode: "extend",
      },
      type: "targetDecoratedMark",
    },
  },
  {
    tokens: [
      { type: "digit", value: 1 },
      { type: "digit", value: 2 },
      { type: "nextPrev", value: "nextPrev" },
      { type: "simpleScopeTypeType", value: "namedFunction" },
    ],
    expected: {
      arg: {
        modifier: {
          type: "relativeScope",
          length: 1,
          offset: 12,
          direction: "forward",
          scopeType: {
            type: "namedFunction",
          },
        },
      },
      type: "modifyTarget",
    },
  },
  {
    tokens: [
      { type: "direction", value: "backward" },
      { type: "nextPrev", value: "nextPrev" },
      { type: "simpleScopeTypeType", value: "namedFunction" },
    ],
    expected: {
      arg: {
        modifier: {
          type: "relativeScope",
          length: 1,
          offset: 1,
          direction: "backward",
          scopeType: {
            type: "namedFunction",
          },
        },
      },
      type: "modifyTarget",
    },
  },
  {
    tokens: [
      {
        type: "vscodeCommand",
        value: "workbench.action.editor.changeLanguageMode",
      },
    ],
    expected: {
      arg: {
        command: "workbench.action.editor.changeLanguageMode",
      },
      type: "vscodeCommand",
    },
  },
];

suite("keyboard grammar", () => {
  let parser: Parser;
  setup(() => {
    parser = new Parser(Grammar.fromCompiled(grammar));
  });

  testCases.forEach(({ tokens, expected }) => {
    test(`should parse \`${stringifyTokens(tokens)}\``, () => {
      parser.feed(tokens);

      assert.equal(parser.results.length, 1);
      assert.deepStrictEqual(parser.results[0], expected);
    });
  });
});

function stringifyTokens(tokens: any[]) {
  return tokens
    .map((token) => {
      let ret = token.type;
      if (token.value != null) {
        ret += `:${JSON.stringify(token.value)}`;
      }
      return ret;
    })
    .join(" ");
}