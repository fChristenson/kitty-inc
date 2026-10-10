// the sweep up income crit: the number blows apart into glitter all over
// the screen; a broom of light shoves it up in two hard pushes into a line
// under the total, the first bits spilling in; side brooms squeeze the line
// into a heap that slams up into the total
import { COLOR } from "../../../../palette";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawBroom, type BroomState } from "../../../../shared/clutter";
import { smoothstep } from "../../../../shared/easing";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const BITS = 380;
const COLS = 14;
const FLING_MS = 220;
const SHOVE1_MS = FLING_MS + 60;
const SHOVE_MS = 260;
const SHOVE2_MS = SHOVE1_MS + SHOVE_MS + 90;
const SQUEEZE_MS = SHOVE2_MS + SHOVE_MS + 260;
const SQUEEZE_FOR_MS = 240;
const SLAM_MS = SQUEEZE_MS + SQUEEZE_FOR_MS + 60;
const SLAM_FOR_MS = 140;
const END_MS = SLAM_MS + SLAM_FOR_MS;
const SPILLS = 6;
const SPILL_EVERY_MS = 45;
// the line it's all pushed into, under the total; the bits scattered from
// just under it down to the bottom (as far under the middle as this share
// of the total's height over it)
const LINE = 230;
const BOTTOM = 0.75;
const EDGE = 40;
const JITTER = 0.8;
// how far ahead of the broom a bit rides, and how thick the heap is
const AHEAD = 20;
const AHEAD_SPREAD = 50;
const HEAP = 140;
const SIDE_HALF = 140;
const SLAM_SPREAD = 200;
const BIT = 24;
const TWINKLE = 0.004;
const OPEN_BLAST = 300;
const SPILL_BLAST = 150;
const PASS_SHAKE = 1.2;
// shakes by step: a spill, the slam
const SHAKES = [0.5, 2.4];

interface Sweep {
  // each bit's spot, packed x, y, and how far ahead of a broom it rides
  spots: Float32Array;
  ahead: Float32Array;
  spills: Point[];
  bottom: number;
  line: number;
  left: number;
}
const sweeps = new WeakMap<Running, Sweep>();
const origin: Point = { x: 0, y: 0 };
const broom: BroomState = { x: 0, y: 0, heading: 0, length: 0, pushing: true };
// when each pass lands, for its swoosh and jolt
const PASSES = [
  SHOVE1_MS + SHOVE_MS,
  SHOVE2_MS + SHOVE_MS,
  SQUEEZE_MS + SQUEEZE_FOR_MS,
];
const spillAt = (k: number) => SHOVE2_MS + SHOVE_MS + 20 + k * SPILL_EVERY_MS;

function planSweep(to: Point, viewportWidth: number): Sweep {
  const line = to.y + LINE;
  const bottom = -to.y * BOTTOM;
  const left = -viewportWidth / 2 + EDGE;
  const rows = Math.ceil(BITS / COLS);
  const spots = new Float32Array(BITS * 2);
  const ahead = new Float32Array(BITS);
  for (let i = 0; i < BITS; i++) {
    spots[i * 2] = lerp(
      left,
      -left,
      ((i % COLS) + 0.5 + (holeHash(i, 211) - 0.5) * JITTER) / COLS,
    );
    spots[i * 2 + 1] = lerp(
      line + EDGE,
      bottom - EDGE,
      (Math.floor(i / COLS) + 0.5 + (holeHash(i, 212) - 0.5) * JITTER) / rows,
    );
    ahead[i] = AHEAD + holeHash(i, 213) * AHEAD_SPREAD;
  }
  const spills: Point[] = [];
  for (let k = 0; k < SPILLS; k++) spills.push(readoutSpot(to, k, 214));
  return { spots, ahead, spills, bottom, line, left };
}

// the main broom's height: under the screen, shoved to the middle, then up
// to the line
function broomY(sweep: Sweep, ms: number): number {
  const under = sweep.bottom + AHEAD;
  if (ms < SHOVE1_MS) return under;
  if (ms < SHOVE1_MS + SHOVE_MS)
    return lerp(under, 0, smoothstep((ms - SHOVE1_MS) / SHOVE_MS));
  if (ms < SHOVE2_MS) return 0;
  return lerp(
    0,
    sweep.line + AHEAD,
    smoothstep(clamp01((ms - SHOVE2_MS) / SHOVE_MS)),
  );
}

registerFloorCrit("sweepUpCrit", {
  plan(r, bars, hit) {
    const sweep = planSweep(bars[0], r.viewportWidth);
    sweeps.set(r, sweep);
    for (let k = 0; k < SPILLS; k++) hit(0, spillAt(k));
    hit(0, END_MS, 1);
  },
  draw(ctx, r, ms, bars) {
    const sweep = sweeps.get(r);
    if (!sweep) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    drawDetonation(ctx, origin, ms, OPEN_BLAST, now);
    while (r.kicked < PASSES.length && ms >= PASSES[r.kicked]) {
      r.kicked++;
      r.shake(PASS_SHAKE);
      playSwoosh();
    }
    const by = broomY(sweep, ms);
    // the side brooms' distance from the middle, closing in
    const squeeze = smoothstep(clamp01((ms - SQUEEZE_MS) / SQUEEZE_FOR_MS));
    const half = lerp(to.x - sweep.left, SIDE_HALF, squeeze);
    if (ms < END_MS) {
      const fling = 1 - (1 - clamp01(ms / FLING_MS)) ** 3;
      const slam = clamp01((ms - SLAM_MS) / SLAM_FOR_MS) ** 2;
      const { spots, ahead } = sweep;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < BITS; i++) {
        let x = spots[i * 2] * fling;
        let y = Math.min(spots[i * 2 + 1] * fling, by - ahead[i]);
        const dx = x - to.x;
        x = to.x + Math.max(-half, Math.min(half, dx));
        if (slam > 0) {
          x = lerp(x, to.x + (holeHash(i, 215) - 0.5) * SLAM_SPREAD, slam);
          y = lerp(y, to.y, slam);
        }
        stampGlimmer(
          ctx,
          x,
          y,
          BIT,
          i + ms * TWINKLE,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    if (ms >= SHOVE1_MS && ms < SQUEEZE_MS) {
      broom.x = 0;
      broom.y = by;
      broom.heading = -Math.PI / 2;
      broom.length = -2 * sweep.left;
      broom.pushing = ms < SHOVE1_MS + SHOVE_MS || ms >= SHOVE2_MS;
      drawBroom(ctx, broom, 1, ms, now);
    }
    if (ms >= SQUEEZE_MS && ms < SLAM_MS) {
      broom.y = sweep.line;
      broom.length = HEAP * 2;
      broom.pushing = true;
      for (let side = -1; side <= 1; side += 2) {
        broom.x = to.x + side * half;
        broom.heading = side < 0 ? 0 : Math.PI;
        drawBroom(ctx, broom, 1, ms, now);
      }
    }
    for (let k = 0; k < SPILLS; k++)
      drawDetonation(ctx, sweep.spills[k], ms - spillAt(k), SPILL_BLAST, now);
    drawFinale(ctx, to, ms - END_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
