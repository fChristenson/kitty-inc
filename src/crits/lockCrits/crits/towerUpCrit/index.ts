// Tower Up, a lock crit: the number slams onto the dark locked floor and
// blows apart into glitter strewn all over it; the bits hop themselves into
// a tower on the lock in waves, each wave quicker and landing with a click
// and a jolt, the tower swaying harder the taller it gets; it trembles and
// glows at the top as the rumble builds, then slams straight down through
// the lock in the biggest blast, bursting the floor open, and wisps shoot
// out of it onto the new floor, a worker hired where each lands
import meta from "./meta";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { flingOut } from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { WORKER_FEET_Y } from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

// the number arcing onto the lock and blowing apart, the bits flung out over
// SPREAD of the floor's width and height
const ARC_MS = 170;
const ARC_RISE = 120;
const ARRIVE_BLAST = 160;
const FLING_MS = 260;
const SPREAD_W = 0.45;
const SPREAD_H = 0.36;
const SPECK = 20;
// the tower: COLS bits a row, ROWS high, its foot BASE below the lock
const COLS = 3;
const ROWS = 28;
const BITS = COLS * ROWS;
const COL_W = 28;
const ROW_H = 19;
const BASE = FLOOR_H * 0.32;
// the bits hop up in WAVES, each hop HOP_MS long and the next wave GAP_MS on
// (both shortening), a bit STAGGER_MS after the last in its wave
const WAVES = 6;
const HOP_MS: [number, number] = [320, 150];
const GAP_MS: [number, number] = [280, 90];
const STAGGER_MS: [number, number] = [9, 4];
const HOP_RISE = 160;
const WAVE_BLAST = 70;
// the tower swaying SWAY px at the top, wobbling at SWAY_RATE rad/ms
const SWAY = 26;
const SWAY_RATE = 0.018;
// the charge before the slam, trembling TREMBLE px at the top
const CHARGE_MS = 460;
const TREMBLE = 18;
const GLOW = 300;
// the slam down through the lock, then the floor bursting open
const SLAM_MS = 150;
const OPEN_BLAST = 360;
// the wisps out to the workers: REWARD_GAP_MS after it opens, one every
// REWARD_STEP_MS, each FLY_MS rising FLY_RISE
const REWARD_GAP_MS = 160;
const REWARD_STEP_MS = 110;
const FLY_MS = 240;
const FLY_RISE = 260;
const WISP = WISP_SIZE * 1.1;
const HIRE_BLAST = 120;
// shakes by step: a wave landing, the slam, a worker hired
const SHAKES = [0.6, 3.2, 1];

interface State {
  // from the lock's middle: where each bit lies, its slot in the tower
  spotX: Float32Array;
  spotY: Float32Array;
  slotX: Float32Array;
  slotY: Float32Array;
  lift: Float32Array;
  hopAt: Float32Array;
  hopMs: Float32Array;
  waveAt: number[];
  landAt: number[];
  slamAt: number;
  openAt: number;
  charge: Charge;
  top: Point;
  hires: {
    at: (ms: number) => Point | null;
    from: number;
    lands: number;
    to: Point;
  }[];
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };
const rest: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const glowAt: Point = { x: 0, y: 0 };

// where the hired workers land, across the floor's walk
const hireSpot = (k: number, n: number) =>
  n > 1 ? lerp(0.18, 0.82, k / (n - 1)) : 0.5;

registerFloorCrit("towerUpCrit", {
  reward(t) {
    t.hire(hireSpot(t.index, meta.values.hires));
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const width = FLOOR_X_MAX - FLOOR_X_MIN;
    const mid = (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x;
    const spotX = new Float32Array(BITS);
    const spotY = new Float32Array(BITS);
    const slotX = new Float32Array(BITS);
    const slotY = new Float32Array(BITS);
    const lift = new Float32Array(BITS);
    const hopAt = new Float32Array(BITS);
    const hopMs = new Float32Array(BITS);
    for (let i = 0; i < BITS; i++) {
      spotX[i] = mid + (holeHash(i, 2210) * 2 - 1) * width * SPREAD_W;
      spotY[i] = (holeHash(i, 2211) * 2 - 1) * FLOOR_H * SPREAD_H;
      const row = Math.floor(i / COLS);
      slotX[i] =
        mid + ((i % COLS) - (COLS - 1) / 2 + (row % 2 ? 0.25 : -0.25)) * COL_W;
      slotY[i] = BASE - row * ROW_H;
      lift[i] = holeHash(i, 2212);
    }
    const perWave = Math.ceil(BITS / WAVES);
    const waveAt: number[] = [];
    const landAt: number[] = [];
    let t = ARC_MS + FLING_MS + 80;
    for (let k = 0; k < WAVES; k++) {
      const u = k / (WAVES - 1);
      const hop = lerp(HOP_MS[0], HOP_MS[1], u);
      const stagger = lerp(STAGGER_MS[0], STAGGER_MS[1], u);
      const first = k * perWave;
      const last = Math.min(BITS, first + perWave);
      for (let i = first; i < last; i++) {
        hopAt[i] = t + (i - first) * stagger;
        hopMs[i] = hop;
      }
      const lands = t + (last - 1 - first) * stagger + hop;
      waveAt.push(t);
      landAt.push(lands);
      hit(0, lands, 0);
      t += lerp(GAP_MS[0], GAP_MS[1], u);
    }
    const chargeAt0 = landAt[WAVES - 1];
    const slamAt = chargeAt0 + CHARGE_MS;
    const openAt = slamAt + SLAM_MS;
    hit(0, ARC_MS, 0);
    hit(0, openAt, 1);
    const feetY = WORKER_FEET_Y - lock.y - 30;
    const n = meta.values.hires;
    const hires = Array.from({ length: n }, (_, k) => {
      const from = openAt + REWARD_GAP_MS + k * REWARD_STEP_MS;
      const lands = from + FLY_MS;
      const to = { x: FLOOR_X_MIN + width * hireSpot(k, n) - lock.x, y: feetY };
      const spot: Point = { x: 0, y: 0 };
      hit(0, lands, 2);
      return {
        from,
        lands,
        to,
        at: (ms: number): Point | null => {
          if (ms < from || ms > lands) return null;
          const u = (ms - from) / FLY_MS;
          spot.x = to.x * u;
          spot.y = to.y * u - FLY_RISE * 4 * u * (1 - u);
          return spot;
        },
      };
    });
    states.set(r, {
      spotX,
      spotY,
      slotX,
      slotY,
      lift,
      hopAt,
      hopMs,
      waveAt,
      landAt,
      slamAt,
      openAt,
      charge: planCharge(chargeAt0, CHARGE_MS, { bang: false }),
      top: { x: mid, y: BASE - (ROWS - 1) * ROW_H },
      hires,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.5 * p),
      );
    }
    // a swoosh as each wave hops
    while (r.kicked < WAVES && ms >= state.waveAt[r.kicked]) {
      r.kicked++;
      playSwoosh();
    }
    tickCharge(state.charge, ms, r.shake);
    const c = chargeAt(state.charge, ms);
    trembleAt(c, ms, TREMBLE, shiver);
    let landed = 0;
    while (landed < WAVES && ms >= state.landAt[landed]) landed++;
    const sway = SWAY * (landed / WAVES) * Math.sin(ms * SWAY_RATE);
    ctx.save();
    ctx.translate(lock.x, lock.y);
    drawDetonation(ctx, ORIGIN, ms - ARC_MS, ARRIVE_BLAST, now);
    if (ms >= ARC_MS && ms < state.openAt) {
      const slam = clamp01((ms - state.slamAt) / SLAM_MS) ** 2;
      const flung = (ms - ARC_MS) / FLING_MS;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < BITS; i++) {
        const since = ms - state.hopAt[i];
        if (flung < 1 && since < 0) {
          rest.x = state.spotX[i];
          rest.y = state.spotY[i];
          flingOut(ORIGIN, rest, state.lift[i], flung, bit);
        } else if (since < 0) {
          bit.x = state.spotX[i];
          bit.y = state.spotY[i];
        } else {
          const h = (BASE - state.slotY[i]) / (BASE - state.top.y);
          const x = state.slotX[i] + (sway + shiver.x) * h * h;
          const y = state.slotY[i] + shiver.y * h;
          const u = Math.min(1, since / state.hopMs[i]);
          const rise = HOP_RISE * 4 * u * (1 - u);
          bit.x = lerp(lerp(state.spotX[i], x, u), 0, slam);
          bit.y = lerp(lerp(state.spotY[i], y, u) - rise, 0, slam);
        }
        stampGlimmer(
          ctx,
          bit.x,
          bit.y,
          SPECK,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    for (let k = 0; k < WAVES; k++) {
      glowAt.x = state.top.x;
      glowAt.y = BASE - ((k + 1) / WAVES) * (BASE - state.top.y);
      drawDetonation(ctx, glowAt, ms - state.landAt[k], WAVE_BLAST, now);
    }
    if (c > 0 && ms < state.slamAt) {
      glowAt.x = state.top.x + shiver.x + sway;
      glowAt.y = state.top.y + shiver.y;
      drawChargeGlow(ctx, glowAt, c, GLOW, now);
    }
    drawDetonation(ctx, ORIGIN, ms - state.openAt, OPEN_BLAST, now);
    for (const h of state.hires) {
      drawWispBetween(ctx, h.at, ms, now, WISP, 0.6, h.from, h.lands);
      drawDetonation(ctx, h.to, ms - h.lands, HIRE_BLAST, now);
    }
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
