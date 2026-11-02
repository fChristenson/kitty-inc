// a flash label drawn letter by letter from cached glyphs, for labels too
// varied to bake one bitmap each (a cash crit's amount): flat fill in a white
// outline like the total readout, stamps cached per colour and size.
// Units: the flash's 100px font, centred on the origin
import { COLOR } from "../../palette";
import { drawText } from "../floorCrits/critPlayer";
import { critFont } from "./critText";

const FONT_SIZE = 100;

interface Letter {
  outline: HTMLCanvasElement;
  fill: HTMLCanvasElement;
  // in FONT_SIZE units
  advance: number;
}
interface LetterSet {
  color: string;
  strokeWidth: number;
  res: number;
  pad: number;
  letters: Map<string, Letter>;
}
const letterSets = new Map<string, LetterSet>();
// each res is its own set: only the latest few stay
const MAX_LETTER_SETS = 6;

let scratch: CanvasRenderingContext2D | null = null;
function scratchCtx(): CanvasRenderingContext2D {
  scratch ??= document.createElement("canvas").getContext("2d")!;
  return scratch;
}

function letterSet(color: string, strokeWidth: number, res: number): LetterSet {
  const key = `${color}|${strokeWidth}|${res}`;
  let set = letterSets.get(key);
  if (set) {
    letterSets.delete(key);
  } else {
    set = {
      color,
      strokeWidth,
      res,
      pad: Math.ceil(strokeWidth * res),
      letters: new Map(),
    };
    if (letterSets.size >= MAX_LETTER_SETS)
      letterSets.delete(letterSets.keys().next().value as string);
  }
  letterSets.set(key, set);
  return set;
}

function letter(set: LetterSet, c: string): Letter {
  let built = set.letters.get(c);
  if (built) return built;
  const font = FONT_SIZE * set.res;
  const ctx = scratchCtx();
  ctx.font = critFont(font);
  const advance = ctx.measureText(c).width;
  const part = (which: "outline" | "fill"): HTMLCanvasElement => {
    const sprite = document.createElement("canvas");
    sprite.width = Math.ceil(advance + set.pad * 2);
    sprite.height = Math.ceil(font * 1.25 + set.pad * 2);
    const c2 = sprite.getContext("2d")!;
    c2.font = critFont(font);
    c2.textAlign = "center";
    c2.textBaseline = "middle";
    if (which === "outline") {
      c2.lineJoin = "round";
      c2.miterLimit = 2;
      c2.lineWidth = set.strokeWidth * set.res;
      c2.strokeStyle = COLOR.white;
      c2.strokeText(c, sprite.width / 2, sprite.height / 2);
    } else {
      c2.fillStyle = set.color;
      c2.fillText(c, sprite.width / 2, sprite.height / 2);
    }
    return sprite;
  };
  built = {
    outline: part("outline"),
    fill: part("fill"),
    advance: advance / set.res,
  };
  set.letters.set(c, built);
  return built;
}

function labelWidth(label: string): number {
  let width = 0;
  for (let i = 0; i < label.length; i++) width += advanceOf(label[i]);
  return width;
}

// a letter's advance in FONT_SIZE units, the same at every res: measuring a
// label baked a sprite per letter it never drew
const advances = new Map<string, number>();
function advanceOf(c: string): number {
  let advance = advances.get(c);
  if (advance === undefined) {
    const ctx = scratchCtx();
    ctx.font = critFont(FONT_SIZE);
    advance = ctx.measureText(c).width;
    advances.set(c, advance);
  }
  return advance;
}

// the label's width in FONT_SIZE units (the same at every colour and res)
export function lettersWidth(
  label: string,
  _color: string,
  _strokeWidth: number,
  _res: number,
): number {
  return labelWidth(label);
}

// the label's letters as an income crit's glyphs (critPlayer's
// FloorCritGlyphs): sprites at font FONT_SIZE * res
export function letterGlyphs(
  label: string,
  color: string,
  strokeWidth: number,
  res: number,
) {
  const set = letterSet(color, strokeWidth, res);
  const sprites: HTMLCanvasElement[] = [];
  const fills: HTMLCanvasElement[] = [];
  const advances: number[] = [];
  const at = new Map<string, number>();
  for (const c of label) {
    if (at.has(c)) continue;
    const { outline, fill, advance } = letter(set, c);
    at.set(c, sprites.length);
    sprites.push(outline);
    fills.push(fill);
    advances.push(advance * res);
  }
  return {
    sprites,
    fills,
    advances,
    pad: set.pad,
    font: FONT_SIZE * res,
    index: (c: string) => at.get(c) ?? -1,
    color,
  };
}

// builds the glyphs ahead of the first frame
export function warmLetters(
  label: string,
  color: string,
  strokeWidth: number,
  res: number,
): void {
  const set = letterSet(color, strokeWidth, res);
  for (let i = 0; i < label.length; i++) letter(set, label[i]);
}

// the label drawn lately, so a frame doesn't rebuild its glyph lists
let shown: {
  set: LetterSet;
  label: string;
  glyphs: ReturnType<typeof letterGlyphs>;
} | null = null;

export function drawLetters(
  ctx: CanvasRenderingContext2D,
  label: string,
  color: string,
  strokeWidth: number,
  res: number,
): void {
  const set = letterSet(color, strokeWidth, res);
  if (shown?.set !== set || shown.label !== label)
    shown = {
      set,
      label,
      glyphs: letterGlyphs(label, color, strokeWidth, res),
    };
  drawText(ctx, shown.glyphs, label, 0, 0, FONT_SIZE);
}
