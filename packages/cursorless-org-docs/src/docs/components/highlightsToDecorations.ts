import {
  BORDER_RADIUS,
  BORDER_WIDTH,
  getBorderColor,
  getBorderStyle,
} from "@cursorless/common";
import type { DecorationItem } from "shiki";
import type { BorderRadius, Highlight, Style } from "./types";

export function highlightsToDecorations(
  highlights: Highlight[],
): DecorationItem[] {
  return highlights.map((highlight): DecorationItem => {
    const { start, end } = highlight.range;
    return {
      start,
      end,
      alwaysWrap: true,
      properties: {
        style: getStyleString(highlight.style),
      },
    };
  });
}

function getStyleString(style: Style): string {
  const borderColor = getBorderColor(
    style.borderColorSolid,
    style.borderColorPorous,
    style.borderStyle,
  );
  return (
    `background-color: ${style.backgroundColor};` +
    `outline-color: ${borderColor};` +
    `outline-style: ${getBorderStyle(style.borderStyle)};` +
    `border-radius: ${getBorderRadius(style.borderRadius)};` +
    `outline-width: ${BORDER_WIDTH};` +
    `outline-offset: -${BORDER_WIDTH};` +
    `padding-top: 0.25rem;` +
    `padding-bottom: 0.25rem;`
  );
}

function getBorderRadius(borders: BorderRadius): string {
  return [
    getSingleBorderRadius(borders.topLeft),
    getSingleBorderRadius(borders.topRight),
    getSingleBorderRadius(borders.bottomRight),
    getSingleBorderRadius(borders.bottomLeft),
  ].join(" ");
}

function getSingleBorderRadius(border: boolean | string): string {
  return border ? BORDER_RADIUS : "0px";
}
