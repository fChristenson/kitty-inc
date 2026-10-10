// a flash label drawn letter by letter from cached glyphs, for labels too
// varied to bake one bitmap each (a cash crit's amount): its glow is one small
// blur baked when it lands, its letters stamps cached per colour and size.
// Units: the flash's 100px font, centred on the origin
import { COLOR } from "../../palette";
import { critFont, drawCritText } from "./critText";

const FONT_SIZE = 100;
// matches the baked flashes' bloom (critFlash's getBloomLayer)
const BLOOM_BLUR = 45;
const BLOOM_PADDING = BLOOM_BLUR * 2;
const BLOOM_RES = 1 / 3;

interface Letter {
  sprite: HTMLCanvasElement;
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

let scratch: CanvasRenderingContext2D | null = null;
function scratchCtx(): CanvasRenderingContext2D {
  scratch ??= document.createElement("canvas").getContext("2d")!;
  return scratch;
}

function letterSet(color: string, strokeWidth: number, res: number): LetterSet {
  const key = `${color}|${strokeWidth}|${res}`;
  let set = letterSets.get(key);
  if (!set) {
    set = {
      color,
      strokeWidth,
      res,
      pad: Math.ceil(strokeWidth * res),
      letters: new Map(),
    };
    letterSets.set(key, set);
  }
  return set;
}

function letter(set: LetterSet, c: string): Letter {
  let built = set.letters.get(c);
  if (built) return built;
  const font = FONT_SIZE * set.res;
  const ctx = scratchCtx();
  ctx.font = critFont(font);
  const advance = ctx.measureText(c).width;
  const sprite = document.createElement("canvas");
  sprite.width = Math.ceil(advance + set.pad * 2);
  sprite.height = Math.ceil(font * 1.25 + set.pad * 2);
  drawCritText(
    sprite.getContext("2d")!,
    c,
    sprite.width / 2,
    sprite.height / 2,
    set.color,
    { fontSize: font, strokeWidth: set.strokeWidth * set.res },
  );
  built = { sprite, advance: advance / set.res };
  set.letters.set(c, built);
  return built;
}

function labelWidth(set: LetterSet, label: string): number {
  let width = 0;
  for (let i = 0; i < label.length; i++) width += letter(set, label[i]).advance;
  return width;
}

// the latest label's glow: only one shows at a time
let bloom: {
  label: string;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
} | null = null;

function labelBloom(label: string, width: number): NonNullable<typeof bloom> {
  if (bloom?.label === label) return bloom;
  const w = Math.ceil(width + BLOOM_PADDING * 2);
  const h = Math.ceil(FONT_SIZE + BLOOM_PADDING * 2);
  const canvas = bloom?.canvas ?? document.createElement("canvas");
  canvas.width = Math.ceil(w * BLOOM_RES);
  canvas.height = Math.ceil(h * BLOOM_RES);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(BLOOM_RES, BLOOM_RES);
  ctx.font = critFont(FONT_SIZE);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = COLOR.white;
  ctx.shadowBlur = BLOOM_BLUR * BLOOM_RES;
  ctx.fillStyle = COLOR.white;
  ctx.fillText(label, w / 2, h / 2);
  ctx.fillText(label, w / 2, h / 2);
  bloom = { label, canvas, width: w, height: h };
  return bloom;
}

// the label's width in FONT_SIZE units
export function lettersWidth(
  label: string,
  color: string,
  strokeWidth: number,
  res: number,
): number {
  return labelWidth(letterSet(color, strokeWidth, res), label);
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
  const advances: number[] = [];
  const at = new Map<string, number>();
  for (const c of label) {
    if (at.has(c)) continue;
    const { sprite, advance } = letter(set, c);
    at.set(c, sprites.length);
    sprites.push(sprite);
    advances.push(advance * res);
  }
  return {
    sprites,
    advances,
    pad: set.pad,
    font: FONT_SIZE * res,
    index: (c: string) => at.get(c) ?? -1,
    color,
  };
}

// builds the glyphs and glow ahead of the first frame
export function warmLetters(
  label: string,
  color: string,
  strokeWidth: number,
  res: number,
): void {
  const width = lettersWidth(label, color, strokeWidth, res);
  if (label) labelBloom(label, width);
}

export function drawLetters(
  ctx: CanvasRenderingContext2D,
  label: string,
  color: string,
  strokeWidth: number,
  res: number,
): void {
  const set = letterSet(color, strokeWidth, res);
  const width = labelWidth(set, label);
  const glow = labelBloom(label, width);
  ctx.drawImage(
    glow.canvas,
    -glow.width / 2,
    -glow.height / 2,
    glow.width,
    glow.height,
  );
  const unit = 1 / res;
  let x = -width / 2;
  for (let i = 0; i < label.length; i++) {
    const { sprite, advance } = letter(set, label[i]);
    ctx.drawImage(
      sprite,
      x - set.pad * unit,
      (-sprite.height * unit) / 2,
      sprite.width * unit,
      sprite.height * unit,
    );
    x += advance;
  }
}
