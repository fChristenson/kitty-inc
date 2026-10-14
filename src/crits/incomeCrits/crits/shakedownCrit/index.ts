// Shakedown, an income crit: the green amount slams in and blows apart into
// glitter strewn all over the screen; then the whole screen jolts, harder
// and quicker each time, and every jolt bounces every bit a hop nearer its
// spot, until the mess has shaken itself into neat stacks in a row under the
// total; the stacks slam up into the readout one after another from the
// outside in, a blast and a share each, then the huge last blast
import { COLOR } from "../../../../palette";
import { flingOut } from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSpinTick, playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale } from "../shared";

// the amount slamming in and blowing apart, the bits flung out over FLING_MS
// across the screen below the total, from TOP to BOTTOM under it
const BURST_MS = 140;
const BURST_BLAST = 260;
const FLING_MS = 320;
const EDGE = 70;
const TOP = 280;
const BOTTOM = 1750;
const SPECK = 20;
// the stacks: STACKS across SPAN either side, LEVELS high, LEVEL_H apart,
// their feet FOOT under the total
const STACKS = 7;
const LEVELS = 20;
const BITS = STACKS * LEVELS;
const SPAN = 430;
const LEVEL_H = 15;
const FOOT = 560;
// the jolts: JOLTS from JOLT_MS, GAPS_MS apart (closing), each hop HOP_MS
// at most and HOP px high (lower as they settle)
const JOLT_MS = BURST_MS + FLING_MS + 140;
const JOLTS = 7;
const GAPS_MS: [number, number] = [270, 75];
const HOP_MS = 150;
const HOP: [number, number] = [110, 40];
const JOLT_SHAKE: [number, number] = [0.5, 1.5];
// the stacks slamming up: RISE_GAP_MS after the last jolt, one every
// STACK_GAP_MS, each bit RISE_MS, a level STAGGER_MS after the one under it
const RISE_GAP_MS = 150;
const STACK_GAP_MS = 70;
const RISE_MS = 180;
const STAGGER_MS = 6;
const STACK_BLAST = 140;
const FINALE_GAP_MS = 100;
// shakes by step: a stack in, -, the finale
const SHAKES = [0.9, 1.2, 2.6];
// the stacks from the outside in
const RISE_ORDER = [0, 6, 1, 5, 2, 4, 3];

interface State {
  // from the total: where each bit lands from the blast, its slot
  spotX: Float32Array;
  spotY: Float32Array;
  slotX: Float32Array;
  slotY: Float32Array;
  lift: Float32Array;
  jolts: number[];
  hops: number[];
  // when each bit's stack starts up
  riseAt: Float32Array;
  arrivals: number[];
  endMs: number;
}
const states = new WeakMap<Running, State>();
const bit: Point = { x: 0, y: 0 };
const rest: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };

registerFloorCrit("shakedownCrit", {
  plan(r, _bars, hit) {
    const half = r.viewportWidth / 2 - EDGE;
    const spotX = new Float32Array(BITS);
    const spotY = new Float32Array(BITS);
    const slotX = new Float32Array(BITS);
    const slotY = new Float32Array(BITS);
    const lift = new Float32Array(BITS);
    const riseAt = new Float32Array(BITS);
    for (let i = 0; i < BITS; i++) {
      spotX[i] = (holeHash(i, 2410) * 2 - 1) * half;
      spotY[i] = lerp(TOP, BOTTOM, holeHash(i, 2411));
      slotX[i] = lerp(-SPAN, SPAN, (i % STACKS) / (STACKS - 1));
      slotY[i] = FOOT - Math.floor(i / STACKS) * LEVEL_H;
      lift[i] = holeHash(i, 2412);
    }
    const jolts: number[] = [];
    const hops: number[] = [];
    let t = JOLT_MS;
    for (let k = 0; k < JOLTS; k++) {
      const gap = lerp(GAPS_MS[0], GAPS_MS[1], k / (JOLTS - 1));
      jolts.push(t);
      hops.push(Math.min(HOP_MS, gap * 0.85));
      t += gap;
    }
    const arrivals: number[] = [];
    let rise = jolts[JOLTS - 1] + hops[JOLTS - 1] + RISE_GAP_MS;
    for (const stack of RISE_ORDER) {
      for (let i = stack; i < BITS; i += STACKS)
        riseAt[i] = rise + Math.floor(i / STACKS) * STAGGER_MS;
      const arrives = rise + (LEVELS - 1) * STAGGER_MS + RISE_MS;
      arrivals.push(arrives);
      hit(0, arrives, 0);
      rise += STACK_GAP_MS;
    }
    const endMs = arrivals[arrivals.length - 1] + FINALE_GAP_MS;
    hit(0, endMs, 2);
    states.set(r, {
      spotX,
      spotY,
      slotX,
      slotY,
      lift,
      jolts,
      hops,
      riseAt,
      arrivals,
      endMs,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    if (ms < BURST_MS) {
      const p = ms / BURST_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 + 0.3 * p));
    }
    // a click and a jolt at every jolt, harder each, a swoosh as they rise
    while (r.kicked < JOLTS && ms >= state.jolts[r.kicked]) {
      const u = r.kicked / (JOLTS - 1);
      r.shake(lerp(JOLT_SHAKE[0], JOLT_SHAKE[1], u));
      playSpinTick(1 + u);
      r.kicked++;
    }
    if (r.kicked === JOLTS && ms >= state.riseAt[RISE_ORDER[0]]) {
      playSwoosh();
      r.kicked++;
    }
    let jolt = 0;
    while (jolt < JOLTS && ms >= state.jolts[jolt]) jolt++;
    // the hop under way (jolt - 1), how far through it, how high
    const k = jolt - 1;
    const hop = k >= 0 ? Math.min(1, (ms - state.jolts[k]) / state.hops[k]) : 1;
    const high = k >= 0 ? lerp(HOP[0], HOP[1], k / (JOLTS - 1)) : 0;
    const before = Math.max(0, k) / JOLTS;
    const after = jolt / JOLTS;
    const flung = (ms - BURST_MS) / FLING_MS;
    from.x = -to.x;
    from.y = -to.y;
    ctx.save();
    ctx.translate(to.x, to.y);
    drawDetonation(ctx, from, ms, BURST_BLAST, now);
    if (ms >= BURST_MS) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < BITS; i++) {
        const sx = state.spotX[i];
        const sy = state.spotY[i];
        const rising = ms - state.riseAt[i];
        if (rising >= RISE_MS) continue;
        if (flung < 1) {
          rest.x = sx;
          rest.y = sy;
          flingOut(from, rest, state.lift[i], flung, bit);
        } else {
          const f = jolt === 0 ? 0 : lerp(before, after, hop);
          bit.x = lerp(sx, state.slotX[i], f);
          bit.y =
            lerp(sy, state.slotY[i], f) -
            high * 4 * hop * (1 - hop) * (0.6 + 0.4 * state.lift[i]);
          if (rising > 0) {
            const u = (rising / RISE_MS) ** 2;
            bit.x = lerp(bit.x, bit.x * 0.4, u);
            bit.y = lerp(bit.y, 0, u);
          }
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
    for (let s = 0; s < STACKS; s++) {
      blast.x = state.slotX[RISE_ORDER[s]] * 0.4;
      blast.y = 0;
      drawDetonation(ctx, blast, ms - state.arrivals[s], STACK_BLAST, now);
    }
    ctx.restore();
    drawFinale(ctx, to, ms - state.endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
