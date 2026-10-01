// the Harvest event's crop: a dirt patch with a leafy tuft growing out of it
// and a gold coin ripening underneath, pulled up and out like a carrot
import {
  COIN_SPIN_FRAME_COUNT,
  drawCoinBurstFrame,
  getFullestFrame,
  getSpriteReach,
} from "../../coinBurst";
import { COLOR } from "../../palette";
import { hash01 } from "../../shared/twinkle";
import { fillOutlined as outlined } from "../../utils";

const MOUND_RX = 66;
const MOUND_RY = 28;
const OUTLINE = 5;
const LEAF_H = 80;
const LEAF_W = 20;
const LEAF_ANGLES = [-0.5, 0, 0.5];
const LEAF_SWAY = 0.1;
const COIN_R = 40;
// the coin starts ripening (peeking out) this far through the growth
const RIPEN_AT = 0.55;
const PEEK = COIN_R * 1.1;
const YANK_SPINS = 2;
const CLODS = 7;
const CLOD_REACH = 90;
const CLOD_RISE = 70;
// how high a yanked coin flies, its middle above the ground
export const YANK_RISE = 190;

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function drawMound(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  size: number,
  dug: boolean,
): void {
  if (size <= 0) return;
  const rx = MOUND_RX * size;
  const ry = MOUND_RY * size;
  ctx.beginPath();
  ctx.ellipse(x, groundY, rx, ry, 0, Math.PI, 0);
  ctx.closePath();
  outlined(ctx, COLOR.soil, OUTLINE);
  ctx.fillStyle = COLOR.soilDark;
  for (let i = 0; i < 5; i++)
    ctx.fillRect(
      x + (hash01(i, 1) - 0.5) * rx * 1.3,
      groundY - ry * (0.2 + 0.5 * hash01(i, 2)),
      5,
      4,
    );
  if (!dug) return;
  ctx.beginPath();
  ctx.ellipse(x, groundY - ry * 0.55, rx * 0.45, ry * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

// three leaves fanning up out of (x, baseY), grow 0..1 of their length
function drawTuft(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  grow: number,
  now: number,
  seed: number,
): void {
  if (grow <= 0) return;
  ctx.save();
  ctx.lineJoin = "round";
  LEAF_ANGLES.forEach((angle, i) => {
    const length = LEAF_H * grow * (angle === 0 ? 1 : 0.8);
    ctx.save();
    ctx.translate(x, baseY);
    ctx.rotate(angle + Math.sin(now / 320 + seed * 2 + i) * LEAF_SWAY);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(LEAF_W, -length * 0.5, 0, -length);
    ctx.quadraticCurveTo(-LEAF_W, -length * 0.5, 0, 0);
    outlined(ctx, COLOR.cropLeaf, 4);
    ctx.beginPath();
    ctx.moveTo(0, -length * 0.15);
    ctx.lineTo(0, -length * 0.8);
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLOR.cropLeafLight;
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spin: number,
): void {
  drawCoinBurstFrame(
    ctx,
    { kind: "coin", spinFrame: getFullestFrame("coin") + spin, axisAngle: 0 },
    x,
    y,
    COIN_R / (getSpriteReach("coin") || 1),
    ctx.getTransform(),
  );
}

// dirt clods flung out of the ground at (x, y), t 0..1 through their flight
export function drawClods(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  seed: number,
  scale = 1,
): void {
  if (t < 0 || t >= 1) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (1 - t) * 3);
  for (let i = 0; i < CLODS; i++) {
    const s = seed * CLODS + i;
    const reach = (hash01(s, 1) - 0.5) * 2 * CLOD_REACH * scale;
    const rise = CLOD_RISE * scale * (0.5 + hash01(s, 2));
    const size = (6 + 6 * hash01(s, 3)) * scale;
    ctx.beginPath();
    ctx.arc(x + reach * t, y - 4 * rise * t * (1 - t), size, 0, Math.PI * 2);
    outlined(ctx, i % 2 ? COLOR.soil : COLOR.soilDark, 2.5);
  }
  ctx.restore();
}

// a crop on groundY: its patch heaping up and tuft growing over grow (0..1),
// its coin peeking out as it ripens; yank (0..1) pulls coin and tuft up and
// out, after which only the dug patch is left
export function drawCrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  grow: number,
  yank: number | null,
  now: number,
  seed: number,
): void {
  if (grow <= 0) return;
  const size = ease(clamp01(grow / 0.15));
  const peek = ease(clamp01((grow - RIPEN_AT) / (1 - RIPEN_AT)));
  const buried = groundY + COIN_R * 0.3 - PEEK * peek;
  if (yank === null) {
    // the coin only shows above the ground
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - COIN_R * 2, groundY - YANK_RISE * 2, COIN_R * 4, YANK_RISE * 2);
    ctx.clip();
    drawCoin(ctx, x, buried, 0);
    ctx.restore();
    drawMound(ctx, x, groundY, size, false);
    drawTuft(ctx, x, buried - COIN_R * 0.8, ease(clamp01(grow / 0.8)), now, seed);
    return;
  }
  drawMound(ctx, x, groundY, size, true);
  if (yank >= 1) return;
  const y = buried + (groundY - YANK_RISE - buried) * (1 - (1 - yank) ** 3);
  drawCoin(ctx, x, y, COIN_SPIN_FRAME_COUNT * YANK_SPINS * yank);
  drawTuft(ctx, x, y - COIN_R * 0.8, 1, now, seed);
  drawClods(ctx, x, groundY - MOUND_RY * 0.5, yank, seed);
}

// a seed tumbling through the air
export function drawSeed(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 14, 0, 0, Math.PI * 2);
  outlined(ctx, COLOR.seed, 3);
  ctx.beginPath();
  ctx.ellipse(-2, -2, 2.5, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.wispGlitter;
  ctx.fill();
  ctx.restore();
}
