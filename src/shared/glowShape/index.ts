// the event look's glowing props (cups, plates, planks, mallets...): a shape
// traced once onto a sprite with a soft gold glow, a gold fill and a white
// edge, then stamped every frame, scaled, turned and faded. Stroking big
// paths every frame stalls phones; stamping one image doesn't
import { COLOR } from "../../palette";

export interface GlowStyle {
  fill?: string;
  edge?: string;
  glow?: string;
  edgeWidth?: number;
  glowWidth?: number;
  glowAlpha?: number;
  // the largest scale it's stamped at, so it's traced crisp enough for that
  maxScale?: number;
  // traced lines (like a band round a cup) stroked with the edge after filling
  details?: (ctx: CanvasRenderingContext2D) => void;
}

export interface GlowSprite {
  canvas: HTMLCanvasElement;
  // the shape's own coordinates the sprite covers, padding included
  left: number;
  top: number;
  width: number;
  height: number;
}

// px per shape unit: a little spare so it stays crisp when the view zooms in
const SPRITE_SCALE = 1.5;

// the shape `trace` draws (a path, not yet filled) within the box
// [left, top, width, height] of its own coordinates, glowing
export function createGlowSprite(
  box: { left: number; top: number; width: number; height: number },
  trace: (ctx: CanvasRenderingContext2D) => void,
  {
    fill = COLOR.heavenlyGold,
    edge = COLOR.white,
    glow = COLOR.heavenlyGold,
    edgeWidth = 5,
    glowWidth = 16,
    glowAlpha = 0.4,
    maxScale = 1,
    details,
  }: GlowStyle = {},
): GlowSprite {
  const res = SPRITE_SCALE * Math.max(1, maxScale);
  const pad = glowWidth / 2 + 2;
  const left = box.left - pad;
  const top = box.top - pad;
  const width = box.width + pad * 2;
  const height = box.height + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * res));
  canvas.height = Math.max(1, Math.ceil(height * res));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(res, res);
  ctx.translate(-left, -top);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  trace(ctx);
  ctx.globalAlpha = glowAlpha;
  ctx.strokeStyle = glow;
  ctx.lineWidth = glowWidth;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = edgeWidth;
  ctx.stroke();
  if (details) {
    ctx.beginPath();
    details(ctx);
    ctx.stroke();
  }
  return { canvas, left, top, width, height };
}

// the sprite with its shape's origin at (x, y), scaled by `scale` and turned
// `rotation` rad round that origin
export function drawGlowSprite(
  ctx: CanvasRenderingContext2D,
  sprite: GlowSprite,
  x: number,
  y: number,
  scale = 1,
  rotation = 0,
): void {
  if (scale <= 0) return;
  if (rotation === 0) {
    ctx.drawImage(
      sprite.canvas,
      x + sprite.left * scale,
      y + sprite.top * scale,
      sprite.width * scale,
      sprite.height * scale,
    );
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(
    sprite.canvas,
    sprite.left * scale,
    sprite.top * scale,
    sprite.width * scale,
    sprite.height * scale,
  );
  ctx.restore();
}
