import assert from "node:assert/strict";
import type { Line } from "../model/columns";
import { expandColumns } from "../model/columns";
import {
  applyColorMap,
  buildColorMap,
  colorAt,
  resolveHighlightLang,
  type ColorMap,
} from "./highlight";
import { tokenizeDoc } from "./tokenize";

suite("command-visualizer/highlight", () => {
  suite("colorAt", () => {
    const spans = [
      { start: 0, end: 5, color: "#aaa" },
      { start: 6, end: 12, color: "#bbb" },
    ];

    test("returns the color of the covering span", () => {
      assert.equal(colorAt(spans, 0), "#aaa");
      assert.equal(colorAt(spans, 4), "#aaa");
      assert.equal(colorAt(spans, 6), "#bbb");
      assert.equal(colorAt(spans, 11), "#bbb");
    });

    test("returns undefined in a gap, past the end, or with no map", () => {
      assert.equal(colorAt(spans, 5), undefined); // gap between spans
      assert.equal(colorAt(spans, 99), undefined); // past the end
      assert.equal(colorAt(undefined, 0), undefined); // no map for the line
    });
  });

  suite("applyColorMap (pure, sync)", () => {
    // Two per-grapheme tokens on line 0: "ab" then "cd".
    const lines: Line[] = [
      {
        tokens: [
          { text: "ab", range: { start: 0, end: 2 } },
          { text: "cd", range: { start: 2, end: 4 } },
        ],
      },
    ];
    const map: ColorMap = [
      [
        { start: 0, end: 2, color: "#111" },
        { start: 2, end: 4, color: "#222" },
      ],
    ];

    test("stamps each token's color by its start offset", () => {
      const out = applyColorMap(lines, map);
      assert.equal(out[0].tokens[0].color, "#111");
      assert.equal(out[0].tokens[1].color, "#222");
    });

    test("leaves the input untouched (returns fresh objects)", () => {
      applyColorMap(lines, map);
      assert.equal(lines[0].tokens[0].color, undefined);
      assert.equal(lines[0].tokens[1].color, undefined);
    });

    test("a token with no covering span keeps no color", () => {
      const gapMap: ColorMap = [[{ start: 2, end: 4, color: "#222" }]];
      const out = applyColorMap(lines, gapMap);
      assert.equal(out[0].tokens[0].color, undefined); // offset 0 uncovered
      assert.equal(out[0].tokens[1].color, "#222");
    });
  });

  suite("Column color propagation", () => {
    test("a token's color flows to every grapheme column it owns", () => {
      const line: Line = {
        tokens: [{ text: "hi", range: { start: 0, end: 2 }, color: "#0af" }],
      };
      const cols = expandColumns(line, 4);
      assert.deepEqual(
        cols.map((c) => c.color),
        ["#0af", "#0af"],
      );
    });

    test("an uncolored token yields columns with no color", () => {
      const line: Line = { tokens: [{ text: "hi", range: { start: 0, end: 2 } }] };
      const cols = expandColumns(line, 4);
      assert.deepEqual(
        cols.map((c) => c.color),
        [undefined, undefined],
      );
    });
  });

  suite("resolveHighlightLang", () => {
    test("maps editor ids to Shiki language ids", () => {
      assert.equal(resolveHighlightLang("typescriptreact"), "tsx");
      assert.equal(resolveHighlightLang("javascriptreact"), "jsx");
      assert.equal(resolveHighlightLang("scm"), "scheme");
      assert.equal(resolveHighlightLang("talon-list"), "talon");
    });

    test("passes through an already-valid id unchanged", () => {
      assert.equal(resolveHighlightLang("typescript"), "typescript");
      assert.equal(resolveHighlightLang("python"), "python");
    });
  });

  // End-to-end alignment against the real Shiki engine (async): a keyword
  // grapheme, an identifier grapheme, and a number grapheme must get three
  // distinct fills, proving the offset→span mapping lands on the right chars.
  suite("buildColorMap alignment (real Shiki)", () => {
    test("keyword, identifier and number graphemes get distinct colors", async () => {
      const code = "const answer = 42;";
      const map = await buildColorMap(code, "typescript");
      const lines = applyColorMap(tokenizeDoc(code), map);
      const cols = expandColumns(lines[0], 4);
      const colorAtChar = (i: number) =>
        cols.find((c) => c.charIndex === i)?.color;

      const keyword = colorAtChar(0); // 'c' of const
      const identifier = colorAtChar(6); // 'a' of answer
      const number = colorAtChar(15); // '4' of 42

      assert.ok(keyword, "keyword char must be colored");
      assert.ok(identifier, "identifier char must be colored");
      assert.ok(number, "number char must be colored");
      assert.notEqual(keyword, identifier, "keyword vs identifier must differ");
      assert.notEqual(identifier, number, "identifier vs number must differ");
    });
  });
});
