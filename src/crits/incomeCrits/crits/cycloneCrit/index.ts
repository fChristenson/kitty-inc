// Cyclone, an income crit: the number bursts into hundreds of coins and
// glitter strewn in a wide band under the total; a tornado touches down at
// one end and its foot sweeps back and forth along the band, growing and
// spinning up, catching everything it touches and spinning it up the funnel,
// each sweep quicker; every pass under the readout its top licks the total
// (a share, a jolt, a flash); at the climax it parks under the middle, whips
// round flat out trembling and flings everything up into the total at once
// in the huge blast
import {
  drawTornado,
  flingFrom,
  liftAt,
  planTornado,
  type Tornado,
} from "../../../../shared/animationStyles/tornado";
import {
  chargeAt,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { DETONATION_MS } from "../../../../shared/animationStyles/explosion";
import {
  beginCoinBatch,
  coinSpot,
  endCoinBatch,
  isCoinBatchOpen,
  queueCoinSpot,
} from "../../../../coinBurst";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { easeOutCubic } from "../../../../shared/easing";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

// the number's burst: COINS coins and GLITTER specks strewn over SCATTER_MS
const COINS = 220;
const GLITTER = 180;
const ITEMS = COINS + GLITTER;
const SCATTER_MS = 220;
// the band: BAND_DROP px under the total, out to EDGE px from the screen's
// sides (at most HALF_MAX either way); the foot weaving WAVE px up and down
// it, flat within CALM px of the readout so its top meets it there
const BAND_DROP = 380;
const EDGE = 50;
const HALF_MAX = 480;
const WAVE = 70;
const WAVE_FREQ = 0.012;
const CALM = 220;
const JITTER = 45;
// the foot: touching down at TOUCH_MS, sweeping across in LEGS_MS each
// (quicker each), then a dash to park under the middle
const TOUCH_MS = 140;
const LEGS_MS = [400, 310, 240, 190, 130];
const SWEEPS = LEGS_MS.length - 1;
const LEG_START = new Float32Array(LEGS_MS.length + 1);
for (let k = 0; k < LEGS_MS.length; k++)
  LEG_START[k + 1] = LEG_START[k] + LEGS_MS[k];
for (let k = 0; k <= LEGS_MS.length; k++) LEG_START[k] += TOUCH_MS;
const PARK_MS = LEG_START[LEGS_MS.length];
// the whip: swelling and trembling over CHARGE_LEAD_MS + WHIP_MS, then the
// fling into the total over FLING_MS, the funnel gone COLLAPSE_MS after
const CHARGE_LEAD_MS = 200;
const WHIP_MS = 240;
const CLIMAX_MS = PARK_MS + WHIP_MS;
const FLING_MS = 200;
const END_MS = CLIMAX_MS + FLING_MS;
const COLLAPSE_MS = 200;
const TREMBLE = 14;
// the funnel, its top LICK px past the readout; growing over the sweeps
const LICK = 20;
const FOOT: [number, number, number] = [20, 36, 48];
const TOP: [number, number, number] = [80, 150, 215];
const SWAY = 25;
const GROW_MS = 260;
const SPIN_HZ: [number, number] = [1, 6];
// a thing is pulled off the band TEAR_MS before the foot reaches it
const TEAR_MS = 90;
const COIN = 26;
const COIN_SPIN = 0.02;
const LIFT_SPIN = 3;
const SPECK = 22;
const TWINKLE = 0.004;
// where things land on the readout, either way of its middle
const LAND_X = 280;
const LAND_Y = 30;
// the burst's flash, and each lick's: glow and star, bigger each lick
const BURST_GLOW = 260;
const BURST_MS = 140;
const LICK_MS = 170;
const LICK_GLOW = 220;
const LICK_STAR = 120;
const LICK_GROW = 0.25;
// shakes by step: a lick, the fling landing
const SHAKES = [0.9, 2.8];
const WHITE = fadeStops(COLOR.white, 0.15);
const GOLD = fadeStops(COLOR.heavenlyGold);

interface State {
  to: Point;
  tornado: Tornado;
  charge: Charge;
  // when its top licks the readout on each sweep
  lickMs: Float32Array;
  swooshed: boolean;
  // each thing: its spot on the band (y under the total), when the foot
  // catches it, its seed up the funnel, its landing off the readout's middle
  // and its coin's tilt
  hx: Float32Array;
  hy: Float32Array;
  caught: Float32Array;
  seed: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  cos: Float32Array;
  sin: Float32Array;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const home: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

// the foot's weave up and down the band on leg k, flat under the readout
const wave = (x: number, k: number, toX: number): number =>
  WAVE *
  Math.sin(x * WAVE_FREQ + k * 2.1) *
  Math.min(1, Math.abs(x - toX) / CALM);

// the leg the foot is on at ms
function legAt(ms: number): number {
  let k = 0;
  while (k < LEGS_MS.length - 1 && ms >= LEG_START[k + 1]) k++;
  return k;
}

// thing i at ms, written into spot; false once it's landed
function place(s: State, i: number, ms: number): boolean {
  if (ms >= END_MS) return false;
  const { tornado, to } = s;
  const caught = s.caught[i];
  if (ms >= CLIMAX_MS) {
    home.x = to.x + s.tx[i];
    home.y = to.y + s.ty[i];
    flingFrom(
      tornado,
      CLIMAX_MS,
      caught,
      s.seed[i],
      home,
      (ms - CLIMAX_MS) / FLING_MS,
      spot,
    );
    return true;
  }
  liftAt(tornado, ms, caught, s.seed[i], spot);
  if (ms >= caught) return true;
  const out = easeOutCubic(clamp01(ms / SCATTER_MS));
  const fx = s.hx[i] * out;
  const fy = (to.y + s.hy[i]) * out;
  const u = clamp01((ms - caught + TEAR_MS) / TEAR_MS);
  const e = u * u;
  spot.x = fx + (spot.x - fx) * e;
  spot.y = fy + (spot.y - fy) * e;
  return true;
}

registerFloorCrit("cycloneCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const toX = to.x;
    const half = Math.min(HALF_MAX, r.viewportWidth / 2 - EDGE);
    // sweeping end to end from the left, then dashing back to the middle
    const legX = new Float32Array(LEGS_MS.length + 1);
    for (let k = 0; k <= SWEEPS; k++) legX[k] = k % 2 ? half : -half;
    legX[LEGS_MS.length] = toX;
    const lickMs = new Float32Array(SWEEPS);
    for (let k = 0; k < SWEEPS; k++) {
      lickMs[k] =
        LEG_START[k] +
        LEGS_MS[k] * clamp01((toX - legX[k]) / (legX[k + 1] - legX[k]));
      hit(0, lickMs[k], 0);
    }
    hit(0, END_MS, 1);
    const hx = new Float32Array(ITEMS);
    const hy = new Float32Array(ITEMS);
    const caught = new Float32Array(ITEMS);
    const seed = new Float32Array(ITEMS);
    const tx = new Float32Array(ITEMS);
    const ty = new Float32Array(ITEMS);
    const cos = new Float32Array(ITEMS);
    const sin = new Float32Array(ITEMS);
    for (let i = 0; i < ITEMS; i++) {
      // each thing lies on one sweep's track, caught as the foot gets there
      const k = i % SWEEPS;
      const x = lerp(-half, half, holeHash(i, 7710));
      hx[i] = x;
      hy[i] =
        BAND_DROP + wave(x, k, toX) + (holeHash(i, 7711) * 2 - 1) * JITTER;
      caught[i] =
        LEG_START[k] +
        LEGS_MS[k] * clamp01((x - legX[k]) / (legX[k + 1] - legX[k]));
      seed[i] = holeHash(i, 7712);
      tx[i] = (holeHash(i, 7713) * 2 - 1) * LAND_X;
      ty[i] = (holeHash(i, 7714) * 2 - 1) * LAND_Y;
      const a = (holeHash(i, 7715) - 0.5) * Math.PI;
      cos[i] = Math.cos(a);
      sin[i] = Math.sin(a);
    }
    const charge = planCharge(
      PARK_MS - CHARGE_LEAD_MS,
      CHARGE_LEAD_MS + WHIP_MS,
      { climaxShake: 1.4, bang: false },
    );
    const foot = (ms: number, into: Point): Point => {
      const k = legAt(ms);
      const x = lerp(
        legX[k],
        legX[k + 1],
        clamp01((ms - LEG_START[k]) / LEGS_MS[k]),
      );
      trembleAt(chargeAt(charge, ms), ms, TREMBLE, shiver);
      into.x = x + shiver.x;
      into.y = state.to.y + BAND_DROP + wave(x, k, toX) + shiver.y;
      return into;
    };
    const state: State = {
      to,
      tornado: planTornado(foot, {
        startMs: TOUCH_MS,
        endMs: CLIMAX_MS,
        height: BAND_DROP + LICK,
        foot: FOOT[0],
        top: TOP[0],
        spinHz: SPIN_HZ,
        sway: SWAY,
        growMs: GROW_MS,
      }),
      charge,
      lickMs,
      swooshed: false,
      hx,
      hy,
      caught,
      seed,
      tx,
      ty,
      cos,
      sin,
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const to = bars[0];
    state.to = to;
    const now = r.startedAt + ms;
    const { tornado, charge, lickMs } = state;
    drawNumberShrink(ctx, r, ms);
    if (!state.swooshed && ms >= TOUCH_MS) {
      state.swooshed = true;
      playSwoosh();
    }
    while (r.kicked < SWEEPS && ms >= lickMs[r.kicked])
      playSpinTick(1 + 0.2 * r.kicked++);
    tickCharge(charge, ms, r.shake);
    // growing over the sweeps, swelling as it whips round in the middle
    const run = clamp01((ms - TOUCH_MS) / (PARK_MS - TOUCH_MS));
    const c = chargeAt(charge, Math.min(ms, CLIMAX_MS));
    tornado.foot = lerp(lerp(FOOT[0], FOOT[1], run), FOOT[2], c);
    tornado.top = lerp(lerp(TOP[0], TOP[1], run), TOP[2], c);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    if (ms < BURST_MS) {
      ctx.globalAlpha = 1 - ms / BURST_MS;
      drawGlow(ctx, WHITE, 0, 0, BURST_GLOW * (0.5 + ms / BURST_MS));
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = previous;
    const collapse = clamp01((ms - CLIMAX_MS) / COLLAPSE_MS);
    if (collapse < 1) drawTornado(ctx, tornado, ms, 1 - collapse);
    if (ms < END_MS) {
      const { caught, cos, sin } = state;
      const base = ctx.getTransform();
      beginCoinBatch(ctx);
      if (isCoinBatchOpen(ctx))
        for (let i = 0; i < COINS; i++) {
          if (!place(state, i, ms)) continue;
          coinSpot[0] = spot.x;
          coinSpot[1] = spot.y;
          coinSpot[2] = COIN;
          coinSpot[3] = 1;
          coinSpot[4] = ms * COIN_SPIN * (ms >= caught[i] ? LIFT_SPIN : 1) + i;
          coinSpot[5] = cos[i];
          coinSpot[6] = sin[i];
          queueCoinSpot(ctx, false, base);
        }
      endCoinBatch(ctx);
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = COINS; i < ITEMS; i++) {
        if (!place(state, i, ms)) continue;
        stampGlimmer(
          ctx,
          spot.x,
          spot.y,
          SPECK,
          i + ms * TWINKLE,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    // each lick: a cheap flash on the readout, bigger each pass
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < SWEEPS; k++) {
      const since = ms - lickMs[k];
      if (since < 0 || since >= LICK_MS) continue;
      const p = since / LICK_MS;
      const big = 1 + LICK_GROW * k;
      ctx.globalAlpha = 1 - p;
      drawGlow(ctx, GOLD, to.x, to.y, LICK_GLOW * big * (0.6 + 0.4 * p), 0.5);
      drawGlow(ctx, WHITE, to.x, to.y, LICK_GLOW * 0.5 * big, 0.4);
      beginLightBatch(ctx);
      stampGlimmer(ctx, to.x, to.y, LICK_STAR * big * (1 - p), k, COLOR.white);
      endLightBatch(ctx);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    drawFinale(ctx, to, ms - END_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
