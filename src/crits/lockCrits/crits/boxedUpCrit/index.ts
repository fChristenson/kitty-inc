// Boxed Up, a lock crit: the number bursts into hundreds of bits strewn all
// over the dark locked floor; an invisible force grabs them row by row, each
// row's bits twitching, then snapping in from all over the floor into a big
// cube over the lock, landing with a click and a jolt, quicker and quicker,
// the cube trembling and glowing as it fills; the last row clicks home and
// the cube slams down onto the lock, bursting the floor open, then bursts
// itself, its bits pouring into the new floor's bar: unpacking, each of its
// next payouts also levels it by one
import meta from "./meta";
import { defineBarEffect } from "../../../rateCrits/rateBonus";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { flingOut } from "../../../../shared/animationStyles/clutter";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  getIncomeBarBox,
  increaseIncomeRateBy,
  punchIncomeBar,
} from "../../../../floors/incomePanel";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

// the number arcing onto the lock and bursting, its bits flung out over
// SPREAD of the floor's width and height
const ARC_MS = 170;
const ARC_RISE = 120;
const ARRIVE_BLAST = 200;
const FLING_MS = 240;
const SPREAD_W = 0.46;
const SPREAD_H = 0.36;
const SPECK = 20;
const BOX_SPECK = 16;
// the cube: COLS bits a row, ROWS rows, CELL px apart, built LIFT px over
// the lock
const COLS = 14;
const ROWS = 12;
const BITS = COLS * ROWS;
const CELL = 22;
const CUBE_W = COLS * CELL;
const CUBE_H = ROWS * CELL;
const LIFT = 170;
// the rows pulled in bottom first, the next GAP_MS on, each flying FLY_MS
// (both shortening); a bit starts up to LATE_MS late and catches up, so the
// row lands at once; TWITCH_MS before it goes it twitches TWITCH px
const FIRST_ROW = ARC_MS + FLING_MS + 60;
const GAP_MS: [number, number] = [95, 25];
const FLY_MS: [number, number] = [190, 110];
const LATE_MS = 30;
const TWITCH_MS = 80;
const TWITCH = 6;
const LINE_MS = 140;
const LINE_W = 30;
const LINE_REACH = 40;
// the cube trembling TREMBLE px and glowing as it fills; a beat after the
// last row it slams down onto the lock
const TREMBLE = 12;
const GLOW = 420;
const HOLD_MS = 40;
const SLAM_MS = 110;
const OPEN_BLAST = 400;
// squashed by the slam, then bursting POUR_GAP_MS after
const SQUASH: [number, number] = [0.22, 0.3];
const POUR_GAP_MS = 90;
const BURST_BLAST = 240;
// the bits pouring along the bar (BAR_INSET px in from its ends), each
// leaving up to SPREAD_MS late, all landing POUR_FLY_MS after the last
// leaves, arcing POUR_RISE px
const SPREAD_MS = 90;
const POUR_FLY_MS = 190;
const POUR_RISE = 140;
const BAR_INSET = 50;
const BAR_BLAST = 300;
// shakes by step: a row clicking home, the slam, the bar
const SHAKES = [0.55, 3.4, 1.4];

interface State {
  // from the lock's middle: where each bit lies, its slot from the cube's
  // middle, its row, when it's pulled in and how long it flies
  spotX: Float32Array;
  spotY: Float32Array;
  slotX: Float32Array;
  slotY: Float32Array;
  lift: Float32Array;
  start: Float32Array;
  fly: Float32Array;
  row: Uint8Array;
  // where along the bar each bit lands, and when it leaves
  barX: Float32Array;
  pourStart: Float32Array;
  rowLand: Float32Array;
  slamAt: number;
  openAt: number;
  pourAt: number;
  landAt: number;
  // the bar's middle from the lock's middle
  bar: Point;
  charge: Charge;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };
const rest: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const glowAt: Point = { x: 0, y: 0 };
const lineFrom: Point = { x: 0, y: 0 };
const lineTo: Point = { x: 0, y: 0 };

// unpacking: each of the bar's next `left` payouts also levels its floor
const unpacks = defineBarEffect<{ floor: Floor; left: number; color: string }>({
  onPayout: (v) => {
    if (isFloorMaxed(v.floor)) return undefined;
    increaseIncomeRateBy(v.floor, 1);
    punchIncomeBar(v.floor, "+1 Lvl", v.color);
    v.left--;
    return v.left > 0 ? v : undefined;
  },
});

registerFloorCrit("boxedUpCrit", {
  // the opened floor's next payouts each levelling it
  reward(t) {
    const { payouts } = meta.values;
    t.flipRate();
    const left = (unpacks.get(t.floor)?.left ?? 0) + payouts;
    unpacks.set(t.floor, { floor: t.floor, left, color: t.color });
    t.punch(`+1 Lvl x${payouts}`);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const box = getIncomeBarBox(false);
    const bar: Point = {
      x: box.x + box.width / 2 - lock.x,
      y: box.y + box.height / 2 - lock.y,
    };
    const barSpan = box.width - BAR_INSET * 2;
    const width = FLOOR_X_MAX - FLOOR_X_MIN;
    const mid = (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x;
    const spotX = new Float32Array(BITS);
    const spotY = new Float32Array(BITS);
    const slotX = new Float32Array(BITS);
    const slotY = new Float32Array(BITS);
    const lift = new Float32Array(BITS);
    const start = new Float32Array(BITS);
    const fly = new Float32Array(BITS);
    const row = new Uint8Array(BITS);
    const barX = new Float32Array(BITS);
    const pourStart = new Float32Array(BITS);
    const rowStart = new Float32Array(ROWS);
    const rowLand = new Float32Array(ROWS);
    let t = FIRST_ROW;
    for (let k = 0; k < ROWS; k++) {
      const u = k / (ROWS - 1);
      rowStart[k] = t;
      rowLand[k] = t + lerp(FLY_MS[0], FLY_MS[1], u);
      hit(0, rowLand[k], 0);
      t += lerp(GAP_MS[0], GAP_MS[1], u);
    }
    const slamAt = rowLand[ROWS - 1] + HOLD_MS;
    const openAt = slamAt + SLAM_MS;
    const pourAt = openAt + POUR_GAP_MS;
    const landAt = pourAt + SPREAD_MS + POUR_FLY_MS;
    for (let i = 0; i < BITS; i++) {
      const k = Math.floor(i / COLS);
      spotX[i] = mid + (holeHash(i, 3410) * 2 - 1) * width * SPREAD_W;
      spotY[i] = (holeHash(i, 3411) * 2 - 1) * FLOOR_H * SPREAD_H;
      slotX[i] = ((i % COLS) - (COLS - 1) / 2) * CELL;
      slotY[i] = CUBE_H / 2 - (k + 0.5) * CELL;
      lift[i] = holeHash(i, 3412);
      row[i] = k;
      start[i] = rowStart[k] + holeHash(i, 3413) * LATE_MS;
      fly[i] = rowLand[k] - start[i];
      barX[i] = bar.x + (holeHash(i, 3415) - 0.5) * barSpan;
      pourStart[i] = pourAt + holeHash(i, 3414) * SPREAD_MS;
    }
    hit(0, ARC_MS, 0);
    hit(0, openAt, 1);
    hit(0, landAt, 2);
    states.set(r, {
      spotX,
      spotY,
      slotX,
      slotY,
      lift,
      start,
      fly,
      row,
      barX,
      pourStart,
      rowLand,
      slamAt,
      openAt,
      pourAt,
      landAt,
      bar,
      charge: planCharge(FIRST_ROW, slamAt - FIRST_ROW, {
        bang: false,
        climaxShake: 0.3,
        shake: [0.05, 0.5],
      }),
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
    // a click as each row lands, higher and higher, then a swoosh as it pours
    while (r.kicked < ROWS && ms >= state.rowLand[r.kicked]) {
      r.kicked++;
      playSpinTick(1 + r.kicked / ROWS);
    }
    if (r.kicked === ROWS && ms >= state.pourAt) {
      r.kicked++;
      playSwoosh();
    }
    tickCharge(state.charge, ms, r.shake);
    const c = ms < state.slamAt ? chargeAt(state.charge, ms) : 0;
    trembleAt(c, ms, TREMBLE, shiver);
    let landed = 0;
    while (landed < ROWS && ms >= state.rowLand[landed]) landed++;
    // the cube's middle, slammed down onto the lock, then squashed by it
    const slam = clamp01((ms - state.slamAt) / SLAM_MS);
    const cx = shiver.x;
    const cy = -LIFT * (1 - slam * slam) + shiver.y;
    const squash =
      ms >= state.openAt && ms < state.pourAt
        ? 1 - (ms - state.openAt) / (state.pourAt - state.openAt)
        : 0;
    const sx = 1 + SQUASH[1] * squash;
    const sy = 1 - SQUASH[0] * squash;
    const foot = cy + CUBE_H / 2;
    ctx.save();
    ctx.translate(lock.x, lock.y);
    drawDetonation(ctx, ORIGIN, ms - ARC_MS, ARRIVE_BLAST, now);
    if (c > 0) {
      glowAt.x = cx;
      glowAt.y = cy;
      drawChargeGlow(ctx, glowAt, c, GLOW, now);
    }
    // the packed rows, a solid crate
    if (landed > 0 && ms < state.pourAt) {
      const h = landed * CELL * sy;
      ctx.globalAlpha = 0.32 + 0.4 * squash;
      ctx.fillStyle = COLOR.heavenlyGold;
      ctx.fillRect(cx - (CUBE_W / 2) * sx, foot - h, CUBE_W * sx, h);
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = 5;
      ctx.strokeRect(cx - (CUBE_W / 2) * sx, foot - h, CUBE_W * sx, h);
      ctx.globalAlpha = 1;
    }
    if (ms >= ARC_MS) {
      const flung = (ms - ARC_MS) / FLING_MS;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < BITS; i++) {
        const since = ms - state.start[i];
        let size = SPECK;
        if (ms >= state.pourStart[i]) {
          const fly = state.landAt - state.pourStart[i];
          const u = (ms - state.pourStart[i]) / fly;
          if (u >= 1) continue;
          const e = 0.5 * u + 0.5 * u * u;
          bit.x = lerp(state.slotX[i], state.barX[i], e);
          bit.y =
            lerp(state.slotY[i], state.bar.y, e) - POUR_RISE * 4 * e * (1 - e);
        } else if (since >= state.fly[i]) {
          bit.x = cx + state.slotX[i] * sx;
          bit.y = foot - (CUBE_H / 2 - state.slotY[i]) * sy;
          size = BOX_SPECK;
        } else if (since >= 0) {
          // pulled straight in, ever faster, snapping onto its slot
          const u = since / state.fly[i];
          const e = u * u;
          bit.x = lerp(state.spotX[i], cx + state.slotX[i], e);
          bit.y = lerp(state.spotY[i], cy + state.slotY[i], e);
        } else if (flung < 1) {
          rest.x = state.spotX[i];
          rest.y = state.spotY[i];
          flingOut(ORIGIN, rest, state.lift[i], flung, bit);
        } else {
          bit.x = state.spotX[i];
          bit.y = state.spotY[i];
          if (since > -TWITCH_MS) {
            const w = TWITCH * (1 + since / TWITCH_MS);
            bit.x += w * Math.sin(ms * 0.09 + i);
            bit.y += w * Math.cos(ms * 0.11 + i);
          }
        }
        stampGlimmer(
          ctx,
          bit.x,
          bit.y,
          size,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    // each row's seam flashing as it clicks home
    for (let k = 0; k < landed; k++) {
      const age = ms - state.rowLand[k];
      if (age >= LINE_MS || ms >= state.slamAt) continue;
      lineFrom.x = cx - CUBE_W / 2 - LINE_REACH;
      lineTo.x = cx + CUBE_W / 2 + LINE_REACH;
      lineFrom.y = lineTo.y = foot - (k + 1) * CELL;
      drawBeam(ctx, lineFrom, lineTo, LINE_W, 1 - age / LINE_MS);
    }
    drawDetonation(ctx, ORIGIN, ms - state.openAt, OPEN_BLAST, now);
    drawDetonation(ctx, ORIGIN, ms - state.pourAt, BURST_BLAST, now);
    drawDetonation(ctx, state.bar, ms - state.landAt, BAR_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
