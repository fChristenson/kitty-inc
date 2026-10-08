// a number rasterised in the crit font as an ink mask, each digit laid out on
// its own a clear gap apart so they never merge, for the events that draw the
// crit's 5, 25 or 125 across the screen (Draw fills it, Night Sky traces it)
import { critFont } from "../../crits";

export type Point = { x: number; y: number };
export type Area = { left: number; top: number; right: number; bottom: number };

export interface NumberGlyph {
  // 1 where the glyph has ink, row by row
  ink: Uint8Array;
  width: number;
  height: number;
  inkPixels: number;
  // each digit's left and right edge, in the glyph's px
  digits: { left: number; right: number }[];
}

// share of the screen a drawn number spans at most, and the font size it's
// rasterised at before scaling onto the screen
export const NUMBER_WIDTH_SHARE = 0.95;
export const NUMBER_HEIGHT_SHARE = 0.6;
export const NUMBER_SAMPLE_SIZE = 200;

// clear space between digits, as a share of the font size
const DIGIT_GAP = 0.12;
const PAD = 2;
// the neighbours of a pixel, clockwise from the right
const AROUND = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
] as const;
// which way to look next, relative to the way it was heading: straight on first
const TURNS = [0, 1, 7, 2, 6, 3, 5, 4];

export function rasterizeNumber(text: string, fontSize: number): NumberGlyph {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.font = critFont(fontSize);
  const gap = fontSize * DIGIT_GAP;
  const chars = [...text].map((char) => {
    const m = ctx.measureText(char);
    return {
      char,
      left: m.actualBoundingBoxLeft,
      width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
      ascent: m.actualBoundingBoxAscent,
      descent: m.actualBoundingBoxDescent,
    };
  });
  const ascent = Math.max(...chars.map((c) => c.ascent));
  const descent = Math.max(...chars.map((c) => c.descent));
  const width = Math.ceil(
    chars.reduce((sum, c) => sum + c.width, 0) +
      gap * (chars.length - 1) +
      PAD * 2,
  );
  const height = Math.ceil(ascent + descent) + PAD * 2;
  canvas.width = width;
  canvas.height = height;
  ctx.font = critFont(fontSize);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let cursor = PAD;
  const digits: NumberGlyph["digits"] = [];
  for (const c of chars) {
    ctx.fillText(c.char, cursor + c.left, PAD + ascent);
    digits.push({ left: cursor, right: cursor + c.width });
    cursor += c.width + gap;
  }
  const alpha = ctx.getImageData(0, 0, width, height).data;
  const ink = new Uint8Array(width * height);
  let inkPixels = 0;
  for (let i = 0; i < ink.length; i++)
    if (alpha[i * 4 + 3] > 128) {
      ink[i] = 1;
      inkPixels++;
    }
  return { ink, width, height, inkPixels, digits };
}

// the scale and top-left that centre the glyph in area, spanning at most the
// given shares of its width and height
export function fitGlyph(
  glyph: NumberGlyph,
  area: Area,
  widthShare: number,
  heightShare: number,
) {
  const scale = Math.min(
    ((area.right - area.left) * widthShare) / glyph.width,
    ((area.bottom - area.top) * heightShare) / glyph.height,
  );
  return {
    scale,
    originX: (area.left + area.right) / 2 - (glyph.width * scale) / 2,
    originY: (area.top + area.bottom) / 2 - (glyph.height * scale) / 2,
  };
}

// the glyph's outlines as chains of edge pixels, each walked in order;
// chains shorter than minLength (stray corners) are dropped
export function traceOutlines(
  glyph: NumberGlyph,
  minLength: number,
): Point[][] {
  const { ink, width, height } = glyph;
  const inkAt = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && ink[y * width + x] === 1;
  const edge = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (
        inkAt(x, y) &&
        (!inkAt(x + 1, y) ||
          !inkAt(x - 1, y) ||
          !inkAt(x, y + 1) ||
          !inkAt(x, y - 1))
      )
        edge[y * width + x] = 1;
  const visited = new Uint8Array(width * height);
  const chains: Point[][] = [];
  for (let start = 0; start < edge.length; start++) {
    if (!edge[start] || visited[start]) continue;
    const chain: Point[] = [];
    let x = start % width;
    let y = Math.floor(start / width);
    let heading = 0;
    for (;;) {
      visited[y * width + x] = 1;
      chain.push({ x, y });
      let next = -1;
      for (const turn of TURNS) {
        const d = (heading + turn) % 8;
        const nx = x + AROUND[d][0];
        const ny = y + AROUND[d][1];
        const i = ny * width + nx;
        if (
          nx >= 0 &&
          ny >= 0 &&
          nx < width &&
          ny < height &&
          edge[i] &&
          !visited[i]
        ) {
          next = d;
          break;
        }
      }
      if (next < 0) break;
      heading = next;
      x += AROUND[next][0];
      y += AROUND[next][1];
    }
    if (chain.length >= minLength) chains.push(chain);
  }
  return chains;
}
