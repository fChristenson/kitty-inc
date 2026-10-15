// Water Balloons, an income crit: the green amount slams into the readout;
// glossy gold water balloons lob in on fast arcs from round the total, each
// wobbling and bursting on the readout in a splat, flat gold rings and a
// green flash, a share each, a few quickening to a barrage; then one huge
// balloon, wobbling harder as it falls, drops straight onto the readout
// and bursts: the biggest ring, flash and shake, the last share
import { COLOR } from "../../../../palette";
import {
  drawRipple,
  drawSplash,
  rainTimes,
} from "../../../../shared/animationStyles/ripple";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { playCoinDrop } from "../../../../sound";
import {
  registerFloorCrit,
  lerp,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { readoutSpot } from "../shared";

// the amount sliding into the readout, shrinking, a green flash on landing
const IN_MS = 160;
const IN_SHRINK = 0.4;
// the balloons: BALLOONS landing across the readout, quickening, each lobbed
// from beside and under it (SIDE + up to SIDE_RND out, LOW + up to LOW_RND
// down) over an arc ARC px over the higher end, flying FLY_MS
const BALLOONS = 14;
const FLY_MS = 220;
const FIRST_MS = IN_MS + 80;
const GAPS: [number, number] = [150, 35];
const SIDE = 260;
const SIDE_RND = 180;
const LOW = 200;
const LOW_RND = 140;
const ARC = 180;
const BALLOON = 70;
const WOBBLE = 0.1;
const SPLAT_MS = 90;
const RIPPLE = 190;
const RIPPLE_W = 12;
const SPLASH = 20;
const FLASH_MS = 160;
const FLASH = 120;
// the huge balloon, BIG_GAP_MS after the last, falling BIG_FALL px
const BIG_GAP_MS = 260;
const BIG_FALL = 620;
const BIG_FALL_MS = 400;
const BIG = 210;
const BIG_SPLAT_MS = 150;
const BIG_RIPPLE = 560;
const BIG_RIPPLE_W = 28;
const BIG_RIPPLE_MS = 760;
const BIG_SPLASH = 46;
const BIG_SPLASH_N = 13;
const BIG_SPLASH_MS = 520;
const BIG_FLASH_MS = 320;
const BIG_FLASH = 420;
const FINALE_BLAST = 440;
// shakes by step: a balloon, the amount in, the huge balloon
const SHAKES = [0.5, 1.2, 2.8];

const GOLD = fadeStops(COLOR.heavenlyGold);
const GREEN = fadeStops(COLOR.moneyGreen);
const WHITE = fadeStops(COLOR.white, 0.2);

// a glossy gold balloon with its knot, drawn once; its middle MID down it
const SPRITE_W = 128;
const SPRITE_H = 156;
const MID = 0.44;
const ASPECT = SPRITE_H / SPRITE_W;
let balloonSprite: HTMLCanvasElement | null = null;
function balloon(): HTMLCanvasElement {
  if (balloonSprite) return balloonSprite;
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const c = canvas.getContext("2d")!;
  c.lineJoin = "round";
  c.lineWidth = 6;
  c.strokeStyle = COLOR.coinOutline;
  c.beginPath();
  c.moveTo(64, 128);
  c.lineTo(53, 146);
  c.lineTo(75, 146);
  c.closePath();
  c.fillStyle = COLOR.goldStandardAmber;
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(64, 6);
  c.bezierCurveTo(126, 6, 128, 92, 64, 130);
  c.bezierCurveTo(0, 92, 2, 6, 64, 6);
  const body = c.createRadialGradient(46, 44, 4, 64, 68, 76);
  body.addColorStop(0, COLOR.coinHighlight);
  body.addColorStop(0.45, COLOR.coinSpriteGold);
  body.addColorStop(1, COLOR.goldStandardAmber);
  c.fillStyle = body;
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(42, 38, 12, 20, -0.5, 0, Math.PI * 2);
  c.fillStyle = "rgba(255,255,255,0.85)";
  c.fill();
  c.beginPath();
  c.arc(36, 70, 5, 0, Math.PI * 2);
  c.fill();
  balloonSprite = canvas;
  return canvas;
}

// a balloon `size` px wide round (x, y), stretched by `wob` (+ wide, - tall)
function drawBalloon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  wob: number,
): void {
  const w = size * (1 + wob);
  const h = size * ASPECT * (1 - wob);
  ctx.drawImage(balloon(), x - w / 2, y - h * MID, w, h);
}

interface Plan {
  times: number[];
  fromX: Float32Array;
  fromY: Float32Array;
  toX: Float32Array;
  toY: Float32Array;
  bigAt: number;
  popped: number;
}
const plans = new WeakMap<Running, Plan>();
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("waterBalloonsCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    balloon();
    const times = rainTimes(BALLOONS, FIRST_MS, GAPS);
    const bigAt = times[BALLOONS - 1] + BIG_GAP_MS;
    const fromX = new Float32Array(BALLOONS);
    const fromY = new Float32Array(BALLOONS);
    const toX = new Float32Array(BALLOONS);
    const toY = new Float32Array(BALLOONS);
    for (let k = 0; k < BALLOONS; k++) {
      const land = readoutSpot(to, k, 6410);
      toX[k] = land.x;
      toY[k] = land.y;
      const side = (k + (holeHash(k, 6411) < 0.3 ? 1 : 0)) % 2 ? 1 : -1;
      fromX[k] = land.x + side * (SIDE + holeHash(k, 6412) * SIDE_RND);
      fromY[k] = to.y + LOW + holeHash(k, 6413) * LOW_RND;
      hit(0, times[k], 0);
    }
    hit(0, IN_MS, 1);
    hit(0, bigAt, 2);
    plans.set(r, { times, fromX, fromY, toX, toY, bigAt, popped: 0 });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const { times, fromX, fromY, toX, toY, bigAt } = plan;
    const now = r.startedAt + ms;
    const to = bars[0];
    while (plan.popped <= BALLOONS) {
      const at = plan.popped < BALLOONS ? times[plan.popped] : bigAt;
      if (ms < at) break;
      playCoinDrop();
      plan.popped++;
    }
    const alpha = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;
    // the flat rings under everything
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < BALLOONS; k++) {
      const since = ms - times[k];
      if (since < 0) break;
      spot.x = toX[k];
      spot.y = toY[k];
      drawRipple(ctx, spot, since, RIPPLE, RIPPLE_W);
    }
    const sinceBig = ms - bigAt;
    drawRipple(ctx, to, sinceBig, BIG_RIPPLE, BIG_RIPPLE_W, 2, BIG_RIPPLE_MS);
    ctx.globalCompositeOperation = previous;
    // the balloons flying in, wobbling, then splatting flat
    for (let k = 0; k < BALLOONS; k++) {
      const since = ms - times[k];
      if (since < -FLY_MS) break;
      if (since < 0) {
        const t = 1 + since / FLY_MS;
        const u = 1 - t;
        const cx = (fromX[k] + toX[k]) / 2;
        const cy = Math.min(fromY[k], toY[k]) - ARC;
        drawBalloon(
          ctx,
          u * u * fromX[k] + 2 * u * t * cx + t * t * toX[k],
          u * u * fromY[k] + 2 * u * t * cy + t * t * toY[k],
          BALLOON * (0.7 + 0.3 * t),
          WOBBLE * Math.sin(ms * 0.045 + k * 1.7),
        );
      } else if (since < SPLAT_MS) {
        const u = since / SPLAT_MS;
        ctx.globalAlpha = alpha * (1 - u);
        drawBalloon(ctx, toX[k], toY[k], BALLOON * (1 + 0.9 * u), 0.85 * u);
        ctx.globalAlpha = alpha;
      }
    }
    const bigUntil = bigAt - ms;
    if (bigUntil > 0 && bigUntil <= BIG_FALL_MS) {
      const u = 1 - bigUntil / BIG_FALL_MS;
      drawBalloon(
        ctx,
        to.x,
        to.y - BIG_FALL * (1 - u * u),
        BIG,
        (0.05 + 0.12 * u) * Math.sin(ms * 0.05 + u * u * 22),
      );
    } else if (sinceBig >= 0 && sinceBig < BIG_SPLAT_MS) {
      const u = sinceBig / BIG_SPLAT_MS;
      ctx.globalAlpha = alpha * (1 - u);
      drawBalloon(ctx, to.x, to.y, BIG * (1 + 1.2 * u), 0.9 * u);
      ctx.globalAlpha = alpha;
    }
    // the splashes and flashes on the readout
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (ms >= IN_MS && ms < IN_MS + FLASH_MS) {
      const fade = 1 - (ms - IN_MS) / FLASH_MS;
      ctx.globalAlpha = alpha * fade;
      drawGlow(ctx, GREEN, to.x, to.y, FLASH * 2 * (1.3 - 0.3 * fade), 0.5);
      ctx.globalAlpha = alpha;
    }
    for (let k = 0; k < BALLOONS; k++) {
      const since = ms - times[k];
      if (since < 0) break;
      spot.x = toX[k];
      spot.y = toY[k];
      drawSplash(ctx, spot, since, SPLASH);
      if (since < FLASH_MS) {
        const fade = 1 - since / FLASH_MS;
        ctx.globalAlpha = alpha * fade;
        drawGlow(ctx, GREEN, spot.x, spot.y, FLASH * (1.3 - 0.3 * fade), 0.5);
        drawGlow(ctx, WHITE, spot.x, spot.y, FLASH * 0.35 * fade);
        ctx.globalAlpha = alpha;
      }
    }
    if (bigUntil > 0 && bigUntil <= BIG_FALL_MS) {
      // the gold gathering on the readout under the falling balloon
      const u = 1 - bigUntil / BIG_FALL_MS;
      ctx.globalAlpha = alpha * u;
      drawGlow(ctx, GOLD, to.x, to.y, lerp(80, 320, u * u), 0.35);
      ctx.globalAlpha = alpha;
    }
    drawSplash(ctx, to, sinceBig, BIG_SPLASH, BIG_SPLASH_N, BIG_SPLASH_MS);
    if (sinceBig >= 0 && sinceBig < BIG_FLASH_MS) {
      const fade = 1 - sinceBig / BIG_FLASH_MS;
      ctx.globalAlpha = alpha * fade;
      drawGlow(ctx, GREEN, to.x, to.y, BIG_FLASH * (1.4 - 0.4 * fade), 0.5);
      drawGlow(ctx, WHITE, to.x, to.y, BIG_FLASH * 0.45 * fade);
      ctx.globalAlpha = alpha;
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    // the amount sliding into the readout, shrinking
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, to.x, p),
        lerp(0, to.y, p),
        r.flashFont * lerp(1, IN_SHRINK, p),
      );
    }
    drawDetonation(ctx, to, sinceBig, FINALE_BLAST, now);
  },
  tailMs: Math.max(DETONATION_MS, BIG_RIPPLE_MS),
  shake: (step) => SHAKES[step],
});
