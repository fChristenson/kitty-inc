// Tip Jar, an income crit: a glass jar of liquid gold pops up beside the
// total and the green amount drops into it, melting into gold; coins plink
// in, each landing in flat rings across the gold and flicking a drop of it
// up onto the readout, a share each, a drizzle quickening to a downpour as
// the gold rises and sloshes; then one huge coin drops in with the biggest
// ring and splash, and the jar overflows, gold gushing over its lip onto
// the readout: the last share and the blast
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
import { stampGlimmer } from "../../../../shared/twinkle";
import { playCoinDrop } from "../../../../sound";
import {
  registerFloorCrit,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { readoutSpot } from "../shared";

// the jar: JAR_DX beside the total and JAR_DY under it, popping up over
// POP_MS; EDGE of it must fit on screen. In its own px from its middle:
// mouth, bottom, walls, and the gold's surface INNER px either side
const POP_MS = 170;
const JAR_DX = 430;
const JAR_DY = 210;
const EDGE = 150;
const MOUTH = -130;
const BOTTOM = 140;
const WALL = 112;
const LIP = 80;
const INNER = 120;
const SEGS = 12;
// the amount dropping into the mouth, shrinking, then melting into gold
// up to LEVEL0 over MELT_MS
const IN_MS = 200;
const IN_SHRINK = 0.3;
const IN_BLAST = 120;
const MELT_MS = 140;
// the coins: DROPS across SPREAD of the surface, quickening, each falling
// FALL px over FALL_MS; the gold rising to LEVEL_TOP, each coin a STEP up
// over RISE_MS and kicking a slosh of KICK px
const DROPS = 14;
const FIRST_MS = IN_MS + MELT_MS + 40;
const GAPS: [number, number] = [130, 30];
const SPREAD = 62;
const FALL = 320;
const FALL_MS = 200;
const COIN = 46;
const LEVEL0 = 70;
const LEVEL_TOP = -75;
const STEP = (LEVEL_TOP - LEVEL0) / DROPS;
const RISE_MS = 110;
const KICK = 7;
const SLOSH_MS = 260;
const JOLT = 0.035;
const JOLT_MS = 70;
const RIPPLE = 105;
const RIPPLE_W = 9;
const SPLASH = 15;
// each coin's drop of gold leaping onto the readout, which flashes
const LEAP_MS = 130;
const LEAP_ARC = 140;
const LEAP = 26;
const FLASH_MS = 150;
const FLASH = 120;
// the huge coin, BIG_GAP_MS after the last, and the overflow
const BIG_GAP_MS = 260;
const BIG_FALL = 560;
const BIG_FALL_MS = 360;
const BIG_COIN = 110;
const BIG_RIPPLE = 430;
const BIG_RIPPLE_W = 24;
const BIG_RIPPLE_MS = 650;
const BIG_SPLASH = 36;
const BIG_SPLASH_N = 12;
const BIG_SPLASH_MS = 480;
const BIG_KICK = 30;
const BIG_JOLT = 0.14;
const BIG_JOLT_MS = 110;
const OVER = -150;
const SURGE_MS = 120;
// the gush over the lip onto the readout, and the dribble down the walls
const GUSH_N = 26;
const GUSH_FROM = 60;
const GUSH_SPREAD = 90;
const GUSH_FLY = 130;
const GUSH_ARC = 170;
const GUSH = 30;
const GUSH_X = 300;
const DRIBBLE_N = 10;
const DRIBBLE_EVERY = 25;
const DRIBBLE_MS = 160;
const DRIBBLE = 18;
const FINALE_BLAST = 400;
const OUT_MS = 220;
// shakes by step: a share, the huge coin, the overflow
const SHAKES = [0.4, 1.8, 2.6];

const GLASS = "rgba(210,240,255,0.18)";
const OUTLINE = "#16202c";
const RIM = "#d8eef8";

// the jar's glass, its gloss streak and its rim, round its middle
const JAR = new Path2D();
JAR.moveTo(-LIP + 2, MOUTH);
JAR.lineTo(-LIP + 2, MOUTH + 22);
JAR.quadraticCurveTo(-WALL, MOUTH + 32, -WALL, MOUTH + 70);
JAR.lineTo(-WALL, BOTTOM - 32);
JAR.quadraticCurveTo(-WALL, BOTTOM, -WALL + 32, BOTTOM);
JAR.lineTo(WALL - 32, BOTTOM);
JAR.quadraticCurveTo(WALL, BOTTOM, WALL, BOTTOM - 32);
JAR.lineTo(WALL, MOUTH + 70);
JAR.quadraticCurveTo(WALL, MOUTH + 32, LIP - 2, MOUTH + 22);
JAR.lineTo(LIP - 2, MOUTH);
JAR.closePath();
const GLOSS = new Path2D();
GLOSS.moveTo(-WALL + 24, MOUTH + 90);
GLOSS.lineTo(-WALL + 24, BOTTOM - 40);
const RIM_PATH = new Path2D();
RIM_PATH.rect(-LIP - 12, MOUTH - 16, (LIP + 12) * 2, 20);

const GOLD = fadeStops(COLOR.heavenlyGold);
const GREEN = fadeStops(COLOR.moneyGreen);
const WHITE = fadeStops(COLOR.white, 0.2);

let liquidFill: CanvasGradient | null = null;
function liquid(ctx: CanvasRenderingContext2D): CanvasGradient {
  if (!liquidFill) {
    liquidFill = ctx.createLinearGradient(0, MOUTH, 0, BOTTOM);
    liquidFill.addColorStop(0, COLOR.heavenlyGold);
    liquidFill.addColorStop(0.5, COLOR.coinSpriteFace);
    liquidFill.addColorStop(1, COLOR.goldStandardAmber);
  }
  return liquidFill;
}

// a plain gold coin, drawn once
const COIN_PX = 96;
let coinSprite: HTMLCanvasElement | null = null;
function coin(): HTMLCanvasElement {
  if (coinSprite) return coinSprite;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = COIN_PX;
  const c = canvas.getContext("2d")!;
  const h = COIN_PX / 2;
  c.beginPath();
  c.arc(h, h, h - 5, 0, Math.PI * 2);
  c.fillStyle = COLOR.coinSpriteGold;
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = COLOR.coinOutline;
  c.stroke();
  c.beginPath();
  c.arc(h, h, h - 18, 0, Math.PI * 2);
  c.lineWidth = 4;
  c.strokeStyle = COLOR.coinHighlight;
  c.stroke();
  c.beginPath();
  c.arc(h, h, h - 14, Math.PI * 1.1, Math.PI * 1.45);
  c.lineWidth = 6;
  c.strokeStyle = COLOR.white;
  c.stroke();
  coinSprite = canvas;
  return canvas;
}

// a coin `size` px at (x, y), tumbling: turned `spin` round its upright
function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  spin: number,
): void {
  const w = size * Math.max(0.2, Math.abs(Math.cos(spin)));
  ctx.drawImage(coin(), x - w / 2, y - size / 2, w, size);
}

// the gold's surface at x, the jar's own px: tilting and rippling with the
// slosh
const surfaceY = (x: number, level: number, slosh: number, ms: number) =>
  level +
  slosh * (x / INNER) * Math.sin(ms * 0.022) +
  slosh * 0.35 * Math.sin(x * 0.09 - ms * 0.03);

const backOut = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
const easeOut = (t: number) => 1 - (1 - Math.min(1, t)) ** 2;

interface Plan {
  times: number[];
  spotX: Float32Array;
  outX: Float32Array;
  outY: Float32Array;
  bigAt: number;
  finaleMs: number;
  side: number;
  plinked: number;
}
const plans = new WeakMap<Running, Plan>();
const ORIGIN: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("tipJarCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const times = rainTimes(DROPS, FIRST_MS, GAPS);
    const bigAt = times[DROPS - 1] + BIG_GAP_MS;
    const finaleMs = bigAt + GUSH_FROM + GUSH_SPREAD + GUSH_FLY;
    const spotX = new Float32Array(DROPS);
    const outX = new Float32Array(DROPS);
    const outY = new Float32Array(DROPS);
    for (let k = 0; k < DROPS; k++) {
      spotX[k] = (holeHash(k, 6310) * 2 - 1) * SPREAD;
      const out = readoutSpot(ORIGIN, k, 6320);
      outX[k] = out.x;
      outY[k] = out.y;
      hit(0, times[k] + LEAP_MS, 0);
    }
    hit(0, bigAt, 1);
    hit(0, finaleMs, 2);
    const side = to.x + JAR_DX + EDGE > r.viewportWidth / 2 ? -1 : 1;
    plans.set(r, {
      times,
      spotX,
      outX,
      outY,
      bigAt,
      finaleMs,
      side,
      plinked: 0,
    });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const { times, spotX, outX, outY, bigAt, finaleMs } = plan;
    const now = r.startedAt + ms;
    const to = bars[0];
    const jx = to.x + plan.side * JAR_DX;
    const jy = to.y + JAR_DY;
    while (plan.plinked <= DROPS) {
      const at = plan.plinked < DROPS ? times[plan.plinked] : bigAt;
      if (ms < at) break;
      playCoinDrop();
      plan.plinked++;
    }
    // the gold's level and slosh, and the jar's jolt, from the coins in
    let level =
      ms < IN_MS
        ? BOTTOM
        : lerp(BOTTOM, LEVEL0, easeOut((ms - IN_MS) / MELT_MS));
    let slosh = 0;
    let jolt = 0;
    for (let k = 0; k < DROPS; k++) {
      const since = ms - times[k];
      if (since < 0) break;
      level += STEP * easeOut(since / RISE_MS);
      slosh += KICK * Math.exp(-since / SLOSH_MS);
      jolt += JOLT * Math.exp(-since / JOLT_MS);
    }
    const sinceBig = ms - bigAt;
    if (sinceBig >= 0) {
      level = lerp(level, OVER, easeOut(sinceBig / SURGE_MS));
      slosh += BIG_KICK * Math.exp(-sinceBig / SLOSH_MS);
      jolt += BIG_JOLT * Math.exp(-sinceBig / BIG_JOLT_MS);
    }
    const out = Math.max(0, Math.min(1, (ms - finaleMs) / OUT_MS));
    const pop = ms < POP_MS ? backOut(ms / POP_MS) : 1;
    const s = pop * (1 - 0.4 * out);
    const alpha = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;
    if (out < 1) {
      ctx.globalAlpha = alpha * (1 - out);
      // the glass and the gold in it
      ctx.save();
      ctx.translate(jx, jy);
      ctx.scale(s * (1 + jolt), s * (1 - jolt));
      ctx.fillStyle = GLASS;
      ctx.fill(JAR);
      if (ms >= IN_MS) {
        ctx.save();
        ctx.clip(JAR);
        ctx.beginPath();
        ctx.moveTo(-INNER, surfaceY(-INNER, level, slosh, ms));
        for (let i = 1; i <= SEGS; i++) {
          const x = lerp(-INNER, INNER, i / SEGS);
          ctx.lineTo(x, surfaceY(x, level, slosh, ms));
        }
        ctx.lineTo(INNER, BOTTOM + 10);
        ctx.lineTo(-INNER, BOTTOM + 10);
        ctx.closePath();
        ctx.fillStyle = liquid(ctx);
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = COLOR.white;
        ctx.globalAlpha = alpha * (1 - out) * 0.6;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      // the coins tumbling in, then the huge one
      for (let k = 0; k < DROPS; k++) {
        const until = times[k] - ms;
        if (until <= 0) continue;
        if (until > FALL_MS) break;
        const u = 1 - until / FALL_MS;
        drawCoin(
          ctx,
          jx + spotX[k] * s,
          jy + (LEVEL0 + STEP * k) * s - FALL * (1 - u * u),
          COIN,
          ms * 0.025 + k * 1.3,
        );
      }
      const bigUntil = bigAt - ms;
      if (bigUntil > 0 && bigUntil <= BIG_FALL_MS) {
        const u = 1 - bigUntil / BIG_FALL_MS;
        drawCoin(
          ctx,
          jx,
          jy + LEVEL_TOP * s - BIG_FALL * (1 - u * u),
          BIG_COIN,
          ms * 0.018,
        );
      }
      // the glass's outline, gloss and rim over them
      ctx.save();
      ctx.translate(jx, jy);
      ctx.scale(s * (1 + jolt), s * (1 - jolt));
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = 9;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke(JAR);
      ctx.lineWidth = 3;
      ctx.strokeStyle = COLOR.white;
      ctx.stroke(JAR);
      ctx.lineWidth = 10;
      ctx.globalAlpha = alpha * (1 - out) * 0.5;
      ctx.stroke(GLOSS);
      ctx.globalAlpha = alpha * (1 - out);
      ctx.fillStyle = RIM;
      ctx.fill(RIM_PATH);
      ctx.lineWidth = 7;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke(RIM_PATH);
      ctx.restore();
      ctx.globalAlpha = alpha;
    }
    // the rings flat across the gold
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < DROPS; k++) {
      if (ms < times[k]) break;
      spot.x = jx + spotX[k] * s;
      spot.y = jy + surfaceY(spotX[k], level, slosh, ms) * s;
      drawRipple(ctx, spot, ms - times[k], RIPPLE * s, RIPPLE_W);
    }
    spot.x = jx;
    spot.y = jy + MOUTH * s;
    drawRipple(ctx, spot, sinceBig, BIG_RIPPLE, BIG_RIPPLE_W, 2, BIG_RIPPLE_MS);
    beginLightBatch(ctx);
    for (let k = 0; k < DROPS; k++) {
      const since = ms - times[k];
      if (since < 0) break;
      const sx = jx + spotX[k] * s;
      const sy = jy + (LEVEL0 + STEP * k) * s;
      spot.x = sx;
      spot.y = sy;
      drawSplash(ctx, spot, since, SPLASH);
      // its drop of gold leaping onto the readout, which flashes green
      const ex = to.x + outX[k];
      const ey = to.y + outY[k];
      if (since < LEAP_MS) {
        const t = since / LEAP_MS;
        const e = t * t;
        const u = 1 - e;
        const cy = Math.min(sy, ey) - LEAP_ARC;
        stampGlimmer(
          ctx,
          u * u * sx + 2 * u * e * ((sx + ex) / 2) + e * e * ex,
          u * u * sy + 2 * u * e * cy + e * e * ey,
          LEAP * (1.2 - 0.4 * t),
          k,
          COLOR.heavenlyGold,
        );
      } else if (since < LEAP_MS + FLASH_MS) {
        const fade = 1 - (since - LEAP_MS) / FLASH_MS;
        ctx.globalAlpha = alpha * fade;
        drawGlow(ctx, GREEN, ex, ey, FLASH * (1.3 - 0.3 * fade), 0.5);
        drawGlow(ctx, WHITE, ex, ey, FLASH * 0.35 * fade);
        ctx.globalAlpha = alpha;
      }
    }
    // the huge coin glowing hotter as it falls, then its splash
    const bigUntil = bigAt - ms;
    if (bigUntil > 0 && bigUntil <= BIG_FALL_MS) {
      const u = 1 - bigUntil / BIG_FALL_MS;
      drawGlow(
        ctx,
        GOLD,
        jx,
        jy + LEVEL_TOP * s - BIG_FALL * (1 - u * u),
        BIG_COIN * (0.6 + u),
      );
    }
    spot.x = jx;
    spot.y = jy + MOUTH * s;
    drawSplash(ctx, spot, sinceBig, BIG_SPLASH, BIG_SPLASH_N, BIG_SPLASH_MS);
    // the overflow: gold gushing over the lip onto the readout, dribbling
    // down the walls
    const lipX = jx - plan.side * LIP * s;
    const lipY = jy + MOUTH * s;
    for (let i = 0; i < GUSH_N; i++) {
      const t =
        (sinceBig - GUSH_FROM - holeHash(i, 6330) * GUSH_SPREAD) / GUSH_FLY;
      if (t < 0 || t >= 1) continue;
      const sx = lipX + (holeHash(i, 6331) - 0.5) * 40;
      const ex = to.x + (holeHash(i, 6332) * 2 - 1) * GUSH_X;
      const e = t * t;
      const u = 1 - e;
      const cy = Math.min(lipY, to.y) - GUSH_ARC;
      stampGlimmer(
        ctx,
        u * u * sx + 2 * u * e * ((sx + ex) / 2) + e * e * ex,
        u * u * lipY + 2 * u * e * cy + e * e * to.y,
        GUSH * (1.2 - 0.4 * t),
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    for (let i = 0; i < DRIBBLE_N; i++) {
      const d = (sinceBig - i * DRIBBLE_EVERY) / DRIBBLE_MS;
      if (d < 0 || d >= 1) continue;
      const wall = i % 2 ? 1 : -1;
      stampGlimmer(
        ctx,
        jx + wall * (WALL + 8) * s,
        jy + lerp(MOUTH, BOTTOM, d * d) * s,
        DRIBBLE * (1 - 0.5 * d),
        i,
        COLOR.heavenlyGold,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    // the amount dropping into the jar, shrinking
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, jx, p),
        lerp(0, jy + MOUTH, p),
        r.flashFont * lerp(1, IN_SHRINK, p),
      );
    }
    spot.x = jx;
    spot.y = jy + MOUTH;
    drawDetonation(ctx, spot, ms - IN_MS, IN_BLAST, now);
    drawDetonation(ctx, to, ms - finaleMs, FINALE_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
