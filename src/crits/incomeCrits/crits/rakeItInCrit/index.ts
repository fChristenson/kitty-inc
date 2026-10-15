// Rake It In, an income crit: the number blows apart into hundreds of glitter
// bits and coins strewn in a messy patch under the total; a big rake of light
// combs through it in quickening strokes (a scrape and a jolt each), dragging
// the bits into neat furrows; then it pulls the rows up into the readout one
// by one, quicker each, a share and a flash each; the last pull rakes all
// that's left into one heap that slams up into the total
import { COLOR } from "../../../../palette";
import { flingOut } from "../../../../shared/animationStyles/clutter";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { DETONATION_MS } from "../../../../shared/animationStyles/explosion";
import { drawSpinCoin, loadSpinCoin } from "../../../../shared/coinFlip";
import { easeOut } from "../../../../shared/easing";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawGlitterLight } from "../../../../shared/wisp";
import { playSpinTick, playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

loadSpinCoin();

// the mess: BITS bits (every COIN_EVERY-th a coin) flung over FLING_MS into
// a patch from PATCH_TOP under the total, PATCH_H deep, EDGE in from the
// sides; half of it in CLUMPS clumps CLUMP px round
const BITS = 420;
const COIN_EVERY = 14;
const FLING_MS = 180;
const PATCH_TOP = 220;
const PATCH_H = 510;
const EDGE = 60;
const CLUMPS = 5;
const CLUMP = 110;
const BIT = 22;
const COIN = 15;
const COIN_TURN = 0.012;
const TWINKLE = 0.004;
// the furrows: ROWS of them across the patch, a bit NEAT_JITTER px off its
// spot in one
const ROWS = 6;
const NEAT_JITTER = 4;
// the combing strokes, back and forth, quicker each; after stroke k a bit
// is COMBED[k + 1] of the way from its mess to its furrow; a bit the rake
// passes snaps over SNAP_MS, dragged DRAG px along and hopping HOP px
const COMB_MS = FLING_MS + 20;
const STROKE_MS = [200, 165, 135, 110];
const STROKE_GAP_MS = 35;
const COMBED = [0, 0.5, 0.8, 0.95, 1];
const SNAP_MS = 70;
const DRAG = 60;
const HOP = 26;
const RAKE_OUT = 70;
const STROKE_AT: number[] = [];
for (let k = 0, t = COMB_MS; k < STROKE_MS.length; k++) {
  STROKE_AT.push(t);
  t += STROKE_MS[k] + STROKE_GAP_MS;
}
const COMB_END_MS =
  STROKE_AT[STROKE_MS.length - 1] + STROKE_MS[STROKE_MS.length - 1];
// the rake swung round over the total, then the pulls: one row each,
// quicker each, dropping onto its row for DROP of the pull and yanking it
// up into the readout, SPREAD px either side; the last pull rakes the rows
// left into one heap HEAP_W wide and HEAP_H deep
const SWING_MS = 70;
const PULL_MS = [190, 165, 145, 125];
const PULLS = PULL_MS.length;
const FINAL_MS = 250;
const DROP = 0.35;
const GATHER = 0.45;
const SPREAD = 280;
const HEAP_W = 220;
const HEAP_H = 90;
const PULL_AT: number[] = [];
for (let j = 0, t = COMB_END_MS + SWING_MS; j <= PULLS; j++) {
  PULL_AT.push(t);
  t += j < PULLS ? PULL_MS[j] : 0;
}
const END_MS = PULL_AT[PULLS] + FINAL_MS;
const pullMs = (j: number) => (j < PULLS ? PULL_MS[j] : FINAL_MS);
const ARRIVALS = PULL_MS.map((ms, j) => PULL_AT[j] + ms);
// the rake: a head HEAD px thick, tines TINE px long, a handle HANDLE px
// long tilted HANDLE_TILT off straight back; TINES tines while pulling
const HEAD = 24;
const TINE = 34;
const TINE_W = 11;
const HANDLE = 150;
const HANDLE_W = 14;
const HANDLE_TILT = 0.55;
const TINES = 10;
const FADE_IN_MS = 60;
// the flashes: the number blowing apart, a row landing in the readout
const OPEN_FLASH_MS = 200;
const OPEN_FLASH = 300;
const HIT_FLASH_MS = 150;
const HIT_FLASH = 150;
const WHITE = fadeStops(COLOR.white, 0.25);
const GOLD = fadeStops(COLOR.heavenlyGold);
// the jolts: each stroke a scrape, each pull's bite a tick
const STROKE_SHAKE: [number, number] = [0.6, 1.3];
const BITE_SHAKE = 0.5;
const KICKS = STROKE_MS.length + PULLS + 1;
const KICK_AT: number[] = STROKE_AT.slice();
for (let j = 0; j <= PULLS; j++) KICK_AT.push(PULL_AT[j] + pullMs(j) * DROP);
// shakes by step: a row in, the heap slamming in
const SHAKES = [0.8, 2.6];

interface Rake {
  // each bit's spot in the mess and in its furrow, packed x, y, its row,
  // how high it's flung, its spot in the heap
  mess: Float32Array;
  neat: Float32Array;
  row: Uint8Array;
  lift: Float32Array;
  heap: Float32Array;
  rowY: Float32Array;
  half: number;
  midY: number;
}
const rakes = new WeakMap<Running, Rake>();
const origin: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };
const a: Point = { x: 0, y: 0 };
const b: Point = { x: 0, y: 0 };
const flash: Point = { x: 0, y: 0 };
const rake = {
  x: 0,
  y: 0,
  heading: 0,
  length: 0,
  tines: ROWS,
  scraping: false,
  alpha: 1,
};

function planRake(to: Point, viewportWidth: number): Rake {
  const half = viewportWidth / 2 - EDGE;
  const top = to.y + PATCH_TOP;
  const gap = PATCH_H / ROWS;
  const rowY = new Float32Array(ROWS);
  for (let r = 0; r < ROWS; r++) rowY[r] = top + (r + 0.5) * gap;
  const mess = new Float32Array(BITS * 2);
  const neat = new Float32Array(BITS * 2);
  const row = new Uint8Array(BITS);
  const lift = new Float32Array(BITS);
  const heap = new Float32Array(BITS * 2);
  const byRow: number[][] = [];
  for (let r = 0; r < ROWS; r++) byRow.push([]);
  for (let i = 0; i < BITS; i++) {
    let x = (holeHash(i, 3101) * 2 - 1) * half;
    let y = top + holeHash(i, 3102) * PATCH_H;
    if (i % 2) {
      const c = i % CLUMPS;
      const angle = holeHash(i, 3103) * Math.PI * 2;
      const d = CLUMP * Math.sqrt(holeHash(i, 3104));
      x = (holeHash(c, 3105) * 2 - 1) * half * 0.8 + Math.cos(angle) * d;
      y = top + holeHash(c, 3106) * PATCH_H + Math.sin(angle) * d * 0.7;
    }
    x = Math.max(-half, Math.min(half, x));
    y = Math.max(top, Math.min(top + PATCH_H, y));
    mess[i * 2] = x;
    mess[i * 2 + 1] = y;
    const r = Math.min(ROWS - 1, Math.max(0, Math.floor((y - top) / gap)));
    row[i] = r;
    byRow[r].push(i);
    lift[i] = holeHash(i, 3107);
    const up = holeHash(i, 3108) ** 0.6;
    heap[i * 2] = (holeHash(i, 3109) - 0.5) * HEAP_W * (1 - 0.7 * up);
    heap[i * 2 + 1] = up * HEAP_H;
  }
  for (let r = 0; r < ROWS; r++) {
    const ids = byRow[r].sort((p, q) => mess[p * 2] - mess[q * 2]);
    for (let k = 0; k < ids.length; k++) {
      const i = ids[k];
      neat[i * 2] =
        lerp(-half, half, (k + 0.5) / ids.length) +
        (holeHash(i, 3110) - 0.5) * NEAT_JITTER;
      neat[i * 2 + 1] = rowY[r] + (holeHash(i, 3111) - 0.5) * NEAT_JITTER;
    }
  }
  return {
    mess,
    neat,
    row,
    lift,
    heap,
    rowY,
    half,
    midY: top + PATCH_H / 2,
  };
}

// which pull takes a row: its own, or the last one for the rows left
const pullOf = (row: number) => Math.min(row, PULLS);

// the rake at ms, into `rake`; false while it's not out
function placeRake(s: Rake, ms: number, to: Point): boolean {
  if (ms < COMB_MS || ms >= END_MS) return false;
  rake.alpha = clamp01((ms - COMB_MS) / FADE_IN_MS);
  rake.scraping = false;
  if (ms < COMB_END_MS + SWING_MS) {
    let k = 0;
    while (k + 1 < STROKE_AT.length && ms >= STROKE_AT[k + 1]) k++;
    const d = k % 2 ? -1 : 1;
    const local = ms - STROKE_AT[k];
    rake.y = s.midY;
    rake.length = PATCH_H;
    rake.tines = ROWS;
    if (local < STROKE_MS[k]) {
      rake.x = lerp(-d, d, local / STROKE_MS[k]) * (s.half + RAKE_OUT);
      rake.heading = d > 0 ? Math.PI : 0;
      rake.scraping = true;
      return true;
    }
    // turning round for the next stroke, or swinging up over the total
    const last = k === STROKE_AT.length - 1;
    const u = clamp01(
      (local - STROKE_MS[k]) / (last ? SWING_MS : STROKE_GAP_MS),
    );
    const from = d > 0 ? Math.PI : 0;
    rake.x = d * (s.half + RAKE_OUT);
    rake.heading = lerp(from, last ? Math.PI / 2 : Math.PI - from, u);
    if (!last) return true;
    const e = easeOut(u);
    rake.x = lerp(rake.x, to.x, e);
    rake.y = lerp(s.midY, to.y - TINE, e);
    rake.length = lerp(PATCH_H, s.half * 2, e);
    rake.tines = u < 0.5 ? ROWS : TINES;
    return true;
  }
  let j = 0;
  while (j < PULLS && ms >= PULL_AT[j + 1]) j++;
  const dur = pullMs(j);
  const local = ms - PULL_AT[j];
  const bottom = s.rowY[j < PULLS ? j : ROWS - 1] - TINE;
  rake.heading = Math.PI / 2;
  rake.tines = TINES;
  rake.length = s.half * 2;
  if (local < dur * DROP) {
    const e = 1 - (1 - local / (dur * DROP)) ** 2;
    rake.x = lerp(to.x, 0, e);
    rake.y = lerp(to.y - TINE, bottom, e);
    return true;
  }
  const v = clamp01((local - dur * DROP) / (dur * (1 - DROP)));
  const e = v * v;
  rake.x = lerp(0, to.x, e);
  rake.y = lerp(bottom, to.y - TINE, e);
  rake.scraping = true;
  if (j === PULLS)
    rake.length = lerp(s.half * 2, HEAP_W + 60, easeOut(clamp01(v / GATHER)));
  return true;
}

// bit i at ms, into `bit`; false once it's in the readout
function placeBit(s: Rake, i: number, ms: number, to: Point): boolean {
  const mx = s.mess[i * 2];
  const my = s.mess[i * 2 + 1];
  const nx = s.neat[i * 2];
  const ny = s.neat[i * 2 + 1];
  if (ms < FLING_MS) {
    spot.x = mx;
    spot.y = my;
    flingOut(origin, spot, s.lift[i], ms / FLING_MS, bit);
    return true;
  }
  if (ms < COMB_END_MS + SWING_MS) {
    let k = -1;
    while (k + 1 < STROKE_AT.length && ms >= STROKE_AT[k + 1]) k++;
    if (k < 0) {
      bit.x = mx;
      bit.y = my;
      return true;
    }
    const f0 = COMBED[k];
    const d = k % 2 ? -1 : 1;
    const px = lerp(mx, nx, f0);
    const x0 = -d * (s.half + RAKE_OUT);
    const cross =
      STROKE_AT[k] + (STROKE_MS[k] * (px - x0)) / (2 * d * (s.half + RAKE_OUT));
    if (ms < cross) {
      bit.x = px;
      bit.y = lerp(my, ny, f0);
      return true;
    }
    const u = clamp01((ms - cross) / SNAP_MS);
    const f = lerp(f0, COMBED[k + 1], easeOut(u));
    const bump = Math.sin(Math.PI * u) * (1 - f0);
    bit.x = lerp(mx, nx, f) + d * DRAG * bump;
    bit.y = lerp(my, ny, f) - HOP * bump * (0.5 + s.lift[i]);
    return true;
  }
  const j = pullOf(s.row[i]);
  const dur = pullMs(j);
  const yank = PULL_AT[j] + dur * DROP;
  bit.x = nx;
  bit.y = ny;
  if (ms < yank) return true;
  const v = (ms - yank) / (dur * (1 - DROP));
  if (v >= 1) return false;
  const e = v * v;
  if (j < PULLS) {
    bit.x = lerp(nx, to.x + (nx / s.half) * SPREAD, e);
    bit.y = lerp(ny, to.y, e);
    return true;
  }
  // the last pull: gathered into a heap in the tines, slammed up with them
  const g = easeOut(clamp01(v / GATHER));
  const rakeX = lerp(0, to.x, e);
  const rakeY = lerp(s.rowY[ROWS - 1] - TINE, to.y - TINE, e);
  const squash = 1 - 0.6 * e;
  bit.x = lerp(nx, rakeX + s.heap[i * 2] * squash, g);
  bit.y = lerp(ny, rakeY + TINE * 0.4 + s.heap[i * 2 + 1] * squash, g);
  return true;
}

// the rake: a blazing head across its front, tines along its heading, a
// handle leading the other way, sparks scraping off the tines' tips
function drawRake(
  ctx: CanvasRenderingContext2D,
  ms: number,
  now: number,
): void {
  const ux = Math.cos(rake.heading);
  const uy = Math.sin(rake.heading);
  const half = rake.length / 2;
  const alpha = rake.alpha;
  a.x = rake.x + uy * half;
  a.y = rake.y - ux * half;
  b.x = rake.x - uy * half;
  b.y = rake.y + ux * half;
  drawBeam(ctx, a, b, HEAD, 0.9 * alpha);
  const back = rake.heading + Math.PI + HANDLE_TILT;
  b.x = rake.x + Math.cos(back) * HANDLE;
  b.y = rake.y + Math.sin(back) * HANDLE;
  a.x = rake.x;
  a.y = rake.y;
  drawBeam(ctx, a, b, HANDLE_W, 0.7 * alpha);
  for (let k = 0; k < rake.tines; k++) {
    const lat = ((k + 0.5) / rake.tines - 0.5) * rake.length;
    a.x = rake.x - uy * lat;
    a.y = rake.y + ux * lat;
    const jitter = rake.scraping ? Math.sin(ms * 0.07 + k * 2.1) * 6 : 0;
    b.x = a.x + ux * (TINE + jitter);
    b.y = a.y + uy * (TINE + jitter);
    drawBeam(ctx, a, b, TINE_W, 0.85 * alpha);
    if (!rake.scraping) continue;
    drawGlitterLight(
      ctx,
      b.x + Math.sin(ms * 0.11 + k) * 10,
      b.y + Math.cos(ms * 0.13 + k * 1.3) * 10,
      14,
      k + 60,
      alpha,
      now,
    );
  }
}

// a cheap flash: a white core in a gold glow, fading over `fadeMs`
function drawFlash(
  ctx: CanvasRenderingContext2D,
  at: Point,
  since: number,
  fadeMs: number,
  size: number,
): void {
  if (since < 0 || since >= fadeMs) return;
  const p = since / fadeMs;
  ctx.globalAlpha = 1 - p;
  drawGlow(ctx, GOLD, at.x, at.y, size * (1.4 + 0.8 * p));
  drawGlow(ctx, WHITE, at.x, at.y, size * (0.6 + 0.4 * p));
  ctx.globalAlpha = 1;
}

registerFloorCrit("rakeItInCrit", {
  plan(r, bars, hit) {
    rakes.set(r, planRake(bars[0], r.viewportWidth));
    for (let j = 0; j < PULLS; j++) hit(0, ARRIVALS[j], 0);
    hit(0, END_MS, 1);
  },
  draw(ctx, r, ms, bars) {
    const s = rakes.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    while (r.kicked < KICKS && ms >= KICK_AT[r.kicked]) {
      const k = r.kicked++;
      if (k < STROKE_MS.length) {
        r.shake(
          lerp(STROKE_SHAKE[0], STROKE_SHAKE[1], k / (STROKE_MS.length - 1)),
        );
        playSwoosh();
      } else {
        r.shake(BITE_SHAKE);
        playSpinTick(1 + (k - STROKE_MS.length) * 0.25);
      }
    }
    drawNumberShrink(ctx, r, ms);
    if (ms < END_MS) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      drawFlash(ctx, origin, ms, OPEN_FLASH_MS, OPEN_FLASH);
      flash.x = to.x;
      flash.y = to.y;
      for (let j = 0; j < PULLS; j++)
        drawFlash(ctx, flash, ms - ARRIVALS[j], HIT_FLASH_MS, HIT_FLASH);
      for (let i = 0; i < BITS; i++) {
        if (i % COIN_EVERY === 0 || !placeBit(s, i, ms, to)) continue;
        stampGlimmer(
          ctx,
          bit.x,
          bit.y,
          BIT,
          i + ms * TWINKLE,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      if (placeRake(s, ms, to)) drawRake(ctx, ms, now);
      endLightBatch(ctx);
      ctx.restore();
      for (let i = 0; i < BITS; i += COIN_EVERY) {
        if (!placeBit(s, i, ms, to)) continue;
        drawSpinCoin(ctx, bit.x, bit.y, COIN, 1, i + ms * COIN_TURN);
      }
    }
    drawFinale(ctx, to, ms - END_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
