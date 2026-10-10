// a gold coin spinning round its upright axis like the splash screen's coin,
// and a tapped one flipped up into the air, spinning fast, then sucked into
// the total at the peak of the flip. Shared by src/spawn/coin and a bubble's
// coin (shared/spawnPrize)
import { COLOR } from "../../palette";
import { playSwoosh } from "../../sound";
import { loadImageByName } from "../../loadAssets";
import { bezier } from "../curves";
import { easeIn, easeOut, lerp } from "../easing";
import { stampGlimmer } from "../twinkle";
import type { Point } from "../wisp";

const COIN_PX = 192;
// a flip goes FLIP_HIGH up, spinning FLIP_SPIN radians a ms faster, swelling
// a little; at the peak it's sucked into the total, shrinking as it goes
const FLIP_MS = 380;
const FLIP_HIGH = 300;
const FLIP_SPIN = 0.03;
const FLIP_GROW = 0.2;
const SUCK_MS = 320;
const SUCK_SHRINK = 0.65;
const SUCK_BOW = 60;
// the glint at the peak, this many radii across
const PEAK_GLINT = 1.5;
const PEAK_GLINT_MS = 180;

// the coin, rastered once from coin.webp
let face: HTMLCanvasElement | null = null;
let loading = false;
const peak: Point = { x: 0, y: 0 };
const bend: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// starts loading the coin; drawSpinCoin draws nothing until it has
export function loadSpinCoin(): void {
  if (loading) return;
  loading = true;
  loadImageByName("coin")
    .then((image) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = COIN_PX;
      const c = canvas.getContext("2d")!;
      c.imageSmoothingQuality = "high";
      c.drawImage(image, 0, 0, COIN_PX, COIN_PX);
      face = canvas;
    })
    .catch(() => {
      loading = false;
    });
}

// the coin turned `turn` round its upright axis, mirrored once past edge-on
export function drawSpinCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  turn: number,
): void {
  if (!face || radius <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(Math.cos(turn), 1);
  ctx.drawImage(face, -radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

export interface CoinFlip {
  // where it was tapped (screen units), performance.now() it was, its
  // radius and how far round it was turned then
  from: Point;
  at: number;
  radius: number;
  turn: number;
  swooshed: boolean;
  landed: boolean;
}

export function startCoinFlip(
  from: Point,
  at: number,
  radius: number,
  turn: number,
): CoinFlip {
  loadSpinCoin();
  return {
    from: { x: from.x, y: from.y },
    at,
    radius,
    turn,
    swooshed: false,
    landed: false,
  };
}

// the flip at t, sucked into `to`; calls land once as it gets there
export function drawCoinFlip(
  ctx: CanvasRenderingContext2D,
  flip: CoinFlip,
  t: number,
  to: Point,
  land: () => void,
): void {
  if (flip.landed) return;
  const since = t - flip.at;
  if (since < 0) return;
  const turn = flip.turn + since * FLIP_SPIN;
  const { from, radius } = flip;
  if (since < FLIP_MS) {
    const u = easeOut(since / FLIP_MS);
    const size = radius * (1 + FLIP_GROW * u);
    drawSpinCoin(ctx, from.x, from.y - FLIP_HIGH * u, size, 1, turn);
    return;
  }
  peak.x = from.x;
  peak.y = from.y - FLIP_HIGH;
  if (!flip.swooshed) {
    flip.swooshed = true;
    playSwoosh();
  }
  const glint = (since - FLIP_MS) / PEAK_GLINT_MS;
  if (glint < 1) {
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 1 - glint;
    const size = radius * PEAK_GLINT * (0.6 + glint);
    stampGlimmer(ctx, peak.x, peak.y, size, flip.at, COLOR.white);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
  }
  const p = (since - FLIP_MS) / SUCK_MS;
  if (p >= 1) {
    flip.landed = true;
    land();
    return;
  }
  bend.x = lerp([peak.x, to.x], 0.3);
  bend.y = Math.min(peak.y, to.y) - SUCK_BOW;
  const k = easeIn(p);
  bezier(peak, bend, to, k, spot);
  const size = radius * (1 + FLIP_GROW) * (1 - SUCK_SHRINK * k);
  drawSpinCoin(ctx, spot.x, spot.y, size, 1, turn);
}
