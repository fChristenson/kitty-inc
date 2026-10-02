import { shadeColor, drawCartoonText } from "../../utils";
import { COLOR } from "../../palette";

export interface CritTextStyle {
  fontSize: number;
  strokeWidth: number;
}

// a flash label is a light gradient fill inside a white outline, drawn over a
// white bloom layer — so a proc whose own color is already near-white (The
// White Whisker, the frosts, the golds) had nothing left to read against.
// Those flip to a black outline instead of being recolored, which keeps each
// proc's identity colour exactly as registered.
const LIGHT_COLOR_LUMINANCE = 0.7;

function isLightColor(hex: string): boolean {
  const value = parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 0xff;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > LIGHT_COLOR_LUMINANCE;
}

export function critFont(fontSize: number): string {
  return `900 ${fontSize}px "Fredoka", system-ui, sans-serif`;
}

export function drawCritText(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  { fontSize, strokeWidth }: CritTextStyle,
): void {
  ctx.font = critFont(fontSize);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const gradient = ctx.createLinearGradient(
    x,
    y - fontSize / 2,
    x,
    y + fontSize / 2,
  );
  gradient.addColorStop(0, shadeColor(color, 0.6));
  gradient.addColorStop(1, color);
  drawCartoonText(
    ctx,
    label,
    x,
    y,
    gradient,
    isLightColor(color) ? COLOR.black : COLOR.white,
    strokeWidth,
  );
}

const POP_MS = 300;
const POP_SCALE = 0.4;

// stroked text is slow to raster, so a reward label is drawn once per look
// and canvas scale into a sprite, at its popped-in size, then stamped
const MAX_TEXT_SPRITES = 64;
const textSprites = new Map<
  string,
  { canvas: HTMLCanvasElement; width: number; height: number }
>();

function critTextSprite(
  label: string,
  color: string,
  style: CritTextStyle,
  scale: number,
): { canvas: HTMLCanvasElement; width: number; height: number } | null {
  const font = critFont(style.fontSize);
  // never bake in the fallback font while Fredoka is still loading
  if (!document.fonts.check(font)) return null;
  const key = `${label}|${color}|${style.fontSize}|${style.strokeWidth}|${scale}`;
  let sprite = textSprites.get(key);
  if (sprite) return sprite;
  if (textSprites.size >= MAX_TEXT_SPRITES) textSprites.clear();
  const canvas = document.createElement("canvas");
  const c = canvas.getContext("2d")!;
  c.font = font;
  const width = c.measureText(label).width + style.strokeWidth * 2 + 8;
  const height = style.fontSize * 1.4 + style.strokeWidth * 2;
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  c.scale(scale, scale);
  drawCritText(c, label, width / 2, height / 2, color, style);
  sprite = { canvas, width, height };
  textSprites.set(key, sprite);
  return sprite;
}

// drawCritText from a cached sprite, for labels redrawn every frame
export function drawCachedCritText(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  style: CritTextStyle,
): void {
  const { a, b } = ctx.getTransform();
  const scale = Math.ceil(Math.hypot(a, b) * 4) / 4;
  const sprite = critTextSprite(label, color, style, scale);
  if (!sprite) {
    drawCritText(ctx, label, x, y, color, style);
    return;
  }
  ctx.drawImage(
    sprite.canvas,
    x - sprite.width / 2,
    y - sprite.height / 2,
    sprite.width,
    sprite.height,
  );
}

// a label rastered once (at res px per unit) for an event to stamp at any
// scale every frame, e.g. slamming in from huge; build it when the event arms
export interface CritTextSprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export function createCritTextSprite(
  label: string,
  color: string,
  style: CritTextStyle,
  res = 2,
): CritTextSprite {
  const canvas = document.createElement("canvas");
  const c = canvas.getContext("2d")!;
  c.font = critFont(style.fontSize);
  const width = c.measureText(label).width + style.strokeWidth * 2 + 8;
  const height = style.fontSize * 1.4 + style.strokeWidth * 2;
  canvas.width = Math.ceil(width * res);
  canvas.height = Math.ceil(height * res);
  c.scale(res, res);
  drawCritText(c, label, width / 2, height / 2, color, style);
  return { canvas, width, height };
}

// the sprite centered on (x, y) at `scale`
export function drawCritTextSprite(
  ctx: CanvasRenderingContext2D,
  sprite: CritTextSprite,
  x: number,
  y: number,
  scale = 1,
): void {
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  ctx.drawImage(sprite.canvas, x - w / 2, y - h / 2, w, h);
}

// an event's reward label landing at (x, y): it pops in big at poppedAt
// (performance.now()) and settles
export function drawPoppingCritText(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  poppedAt: number,
  now: number,
  style: CritTextStyle,
): void {
  const pop = 1 + POP_SCALE * Math.max(0, 1 - (now - poppedAt) / POP_MS);
  const { a, b } = ctx.getTransform();
  // canvas px per unit at its biggest, in quarter steps
  const scale = Math.ceil(Math.hypot(a, b) * (1 + POP_SCALE) * 4) / 4;
  const sprite = critTextSprite(label, color, style, scale);
  if (sprite) {
    const w = sprite.width * pop;
    const h = sprite.height * pop;
    ctx.drawImage(sprite.canvas, x - w / 2, y - h / 2, w, h);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  drawCritText(ctx, label, 0, 0, color, style);
  ctx.restore();
}
