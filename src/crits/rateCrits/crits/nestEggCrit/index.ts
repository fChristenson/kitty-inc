// Nest Egg, a rate crit: the number blows apart into hundreds of glitter bits
// strewn all over the bars in view; a plough of light sweeps along every bar
// in three brisk strokes, quicker each, a whoosh and a jolt each, pushing the
// mess into a heap beside its readout that grows and wobbles; the heaps
// crouch and hop into their readouts bar after bar, quicker each, its own
// last, the biggest, trembling and rumbling first; each lands in a flash
// (its own in a blast) that turns the readout over: the bar saves up, its
// next payouts put away, then one payout lands the whole nest egg at once
// with a bonus on top
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  BLOW_UP,
  drawBroom,
  flingOut,
  type BroomState,
} from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { smoothstep } from "../../../../shared/easing";
import { playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import {
  BAR_HALF_H,
  holeHash,
  ownLast,
} from "../../../floorCrits/critPlayer/shared";

// the number swelling and blowing apart, the mess flung out over FLING_MS
const BLOW_MS = 110;
const FLING_MS = 280;
// about BITS bits in all, PER_BAR on a bar, OWN_MORE times as many on its own
const BITS = 300;
const PER_BAR: [number, number] = [40, 110];
const OWN_MORE = 1.6;
const SPECK = 18;
// the readouts READOUT of a bar's half width out, CONTACT_Y off its middle;
// each heap HEAP_GAP px left of it, HEAP_W wide, its foot FOOT_Y down
const READOUT = 0.6;
const CONTACT_Y = -20;
const HEAP_GAP = 130;
const HEAP_W = 70;
const HEAP_H = 70;
const OWN_HEAP_H = 110;
const FOOT_Y = BAR_HALF_H * 0.7;
// the mess strewn from LEFT of the bar's half width, SPREAD_Y above and below
const LEFT = 0.95;
const SPREAD_Y = BAR_HALF_H * 1.2;
// the plough: in over LEAD_MS, then STROKES strokes dragged over DRAG_MS,
// each re-planted BACK of a stroke behind, lifted over LIFT_MS; out over
// FADE_MS
const SWEEP_AT = BLOW_MS + FLING_MS + 60;
const LEAD_MS = 80;
const DRAG_MS = [190, 140, 100];
const LIFT_MS = [80, 60];
const STROKES = DRAG_MS.length;
const BACK = 0.3;
const START_U = -0.08;
const FADE_MS = 120;
const BROOM = BAR_HALF_H * 2.7;
const STROKE_SHAKE = [0.5, 0.8, 1.1];
// the heaps wobbling WOBBLE px at their tops (its own trembling up to
// OWN_WOBBLE), crouching CROUCH over CROUCH_MS, then hopping in HOP_MS
// apart: SETTLE_MS after the sweep, HOP_GAPS_MS apart, its own after
// OWN_WAIT_MS of rumble
const WOBBLE: [number, number] = [2, 9];
const OWN_WOBBLE = 15;
const WOBBLE_RATE = 0.05;
const TREMBLE_MS = 16;
const CROUCH_MS = 70;
const CROUCH = 0.35;
const SETTLE_MS = 120;
const HOP_GAPS_MS: [number, number] = [140, 70];
const OWN_WAIT_MS = 190;
const RUMBLE_MS = 45;
const RUMBLE_SHAKE: [number, number] = [0.3, 1];
// each bit hops HOP_MS on an arc HOP_RISE px high (its own OWN_HOP_RISE),
// staggered STAGGER_MS over STAGGERS
const HOP_MS = 170;
const HOP_RISE = 110;
const OWN_HOP_RISE = 170;
const STAGGERS = 6;
const STAGGER_MS = 9;
const LAND_MS = HOP_MS + (STAGGER_MS * (STAGGERS - 1)) / 2;
const BLAST = 140;
const LAND_FLASH_MS = 160;
const OWN_BLAST = 320;
// shakes by step: -, a readout, its own
const SHAKES = [0.5, 1.3, 3];

// when each stroke drags and the sweep ends
const STROKE_AT: number[] = [];
const STROKE_END: number[] = [];
{
  let t = SWEEP_AT;
  for (let k = 0; k < STROKES; k++) {
    STROKE_AT.push(t);
    t += DRAG_MS[k];
    STROKE_END.push(t);
    t += LIFT_MS[k] ?? 0;
  }
}
const SWEEP_END = STROKE_END[STROKES - 1];

interface State {
  count: number;
  // each bit's bar, where it lies and where the heap leaves it (from its
  // bar's middle), and how high it's flung
  barOf: Int16Array;
  sx: Float32Array;
  sy: Float32Array;
  ex: Float32Array;
  ey: Float32Array;
  lift: Float32Array;
  // the plough's lane, the readout's x, all from a bar's middle
  x0: number;
  x1: number;
  readX: number;
  heapH: Float32Array;
  hopAt: Float64Array;
  landAt: Float64Array;
  // this frame's wobble and crouch per bar
  wobble: Float32Array;
  crouch: Float32Array;
  // shakes kicked by the crit itself, and whether each whooshes
  kickAt: number[];
  kickShake: number[];
  kickSwoosh: Uint8Array;
  endMs: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const broom: BroomState = {
  x: 0,
  y: 0,
  heading: 0,
  length: BROOM,
  pushing: false,
};
// the plough this frame along its lane, 0..1: where it is, and the furthest
// it has pushed the mess
let broomU = 0;
let frontU = 0;

// a bar saving up: `left` payouts to go, the last the nest egg, after
// `held` put away
interface Nest {
  left: number;
  held: number;
}
const nests = defineBarEffect<Nest>({
  payout: (n) =>
    n.left > 1
      ? meta.values.hold
      : 1 + n.held * (1 - meta.values.hold + meta.values.bonus),
  onPayout: (n) =>
    n.left > 1 ? { left: n.left - 1, held: n.held } : undefined,
});

// the plough at ms (broomU, frontU, broom.pushing)
function sweepAt(ms: number): void {
  broom.pushing = false;
  for (let k = 0; k < STROKES; k++) {
    const from = k === 0 ? START_U : (k - BACK) / STROKES;
    if (ms < STROKE_AT[k]) {
      const u =
        k === 0 ? 1 : smoothstep((ms - STROKE_END[k - 1]) / LIFT_MS[k - 1]);
      broomU = lerp(k === 0 ? START_U : k / STROKES, from, u);
      frontU = k / STROKES;
      return;
    }
    if (ms < STROKE_END[k]) {
      const u = 1 - (1 - (ms - STROKE_AT[k]) / DRAG_MS[k]) ** 1.6;
      broomU = lerp(from, (k + 1) / STROKES, u);
      frontU = Math.max(k / STROKES, broomU);
      broom.pushing = true;
      return;
    }
  }
  broomU = 1;
  frontU = 1;
}

registerFloorCrit("nestEggCrit", {
  reward(t) {
    t.flipRate();
    const held = t.own ? meta.values.ownHeld : meta.values.held;
    const was = nests.get(t.floor);
    nests.set(
      t.floor,
      was
        ? { left: was.left + held, held: was.held + held }
        : { left: held + 1, held },
    );
    t.punch("Nest Egg!");
  },
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const n = bars.length;
    const readX = half * READOUT;
    const heapX = readX - HEAP_GAP;
    const x0 = -half * LEFT;
    const x1 = Math.max(x0 + 60, heapX - HEAP_W / 2 - 10);
    const per = Math.round(
      Math.max(PER_BAR[0], Math.min(PER_BAR[1], BITS / (n - 1 + OWN_MORE))),
    );
    const own = Math.round(per * OWN_MORE);
    const count = own + per * (n - 1);
    const heapH = new Float32Array(n);
    for (let b = 0; b < n; b++) heapH[b] = b === 0 ? OWN_HEAP_H : HEAP_H;
    const barOf = new Int16Array(count);
    const sx = new Float32Array(count);
    const sy = new Float32Array(count);
    const ex = new Float32Array(count);
    const ey = new Float32Array(count);
    const lift = new Float32Array(count);
    let i = 0;
    for (let b = 0; b < n; b++) {
      const bits = b === 0 ? own : per;
      for (let j = 0; j < bits; j++, i++) {
        barOf[i] = b;
        sx[i] = lerp(x0 + 10, x1, Math.random());
        sy[i] = (Math.random() * 2 - 1) * SPREAD_Y;
        ex[i] = x1 + 10 + Math.random() * HEAP_W;
        const off = (ex[i] - heapX) / (HEAP_W / 2);
        ey[i] = FOOT_Y - heapH[b] * (1 - off * off) * Math.random() ** 0.6;
        lift[i] = holeHash(i, 5120);
      }
    }
    const kickAt: number[] = [BLOW_MS];
    const kickShake: number[] = [BLOW_UP.shake];
    const swoosh: number[] = [0];
    for (let k = 0; k < STROKES; k++) {
      kickAt.push(STROKE_AT[k]);
      kickShake.push(STROKE_SHAKE[k]);
      swoosh.push(1);
    }
    const hopAt = new Float64Array(n);
    const landAt = new Float64Array(n);
    const order = ownLast(bars);
    let t = SWEEP_END + SETTLE_MS;
    order.forEach((bar, k) => {
      if (bar === 0) {
        const rumbles = Math.floor(OWN_WAIT_MS / RUMBLE_MS);
        for (let j = 1; j <= rumbles; j++) {
          kickAt.push(t + j * RUMBLE_MS);
          kickShake.push(
            lerp(RUMBLE_SHAKE[0], RUMBLE_SHAKE[1], j / Math.max(1, rumbles)),
          );
          swoosh.push(0);
        }
        t += OWN_WAIT_MS;
      }
      hopAt[bar] = t;
      landAt[bar] = t + LAND_MS;
      hit(bar, landAt[bar], bar === 0 ? 2 : 1);
      t += lerp(
        HOP_GAPS_MS[0],
        HOP_GAPS_MS[1],
        k / Math.max(1, order.length - 2),
      );
    });
    states.set(r, {
      count,
      barOf,
      sx,
      sy,
      ex,
      ey,
      lift,
      x0,
      x1,
      readX,
      heapH,
      hopAt,
      landAt,
      wobble: new Float32Array(n),
      crouch: new Float32Array(n),
      kickAt,
      kickShake,
      kickSwoosh: Uint8Array.from(swoosh),
      endMs: landAt[0] + STAGGER_MS * STAGGERS,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    if (ms < BLOW_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + (0.35 * ms) / BLOW_MS),
      );
    while (r.kicked < s.kickAt.length && ms >= s.kickAt[r.kicked]) {
      r.shake(s.kickShake[r.kicked]);
      if (s.kickSwoosh[r.kicked]) playSwoosh();
      r.kicked++;
    }
    drawDetonation(ctx, ORIGIN, ms - BLOW_MS * 0.5, BLOW_UP.size, now);
    const n = Math.min(s.hopAt.length, bars.length);
    sweepAt(ms);
    const front = lerp(s.x0, s.x1, frontU);
    // the heaps wobbling harder up to their hops, its own trembling
    for (let b = 0; b < n; b++) {
      const g = clamp01(
        (ms - STROKE_AT[STROKES - 1]) / (s.hopAt[b] - STROKE_AT[STROKES - 1]),
      );
      const sway = Math.sin(ms * WOBBLE_RATE + b * 1.7);
      if (b === 0) {
        const jolt = holeHash(Math.floor(ms / TREMBLE_MS), 5121) * 2 - 1;
        s.wobble[b] = lerp(WOBBLE[0], OWN_WOBBLE, g) * lerp(sway, jolt, g * g);
      } else s.wobble[b] = lerp(WOBBLE[0], WOBBLE[1], g) * sway;
      s.crouch[b] = clamp01((ms - s.hopAt[b] + CROUCH_MS) / CROUCH_MS);
    }
    if (ms >= BLOW_MS && ms < s.endMs) {
      const flung = (ms - BLOW_MS) / FLING_MS;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < s.count; i++) {
        const b = s.barOf[i];
        if (b >= n) continue;
        const hop = (ms - s.hopAt[b] - (i % STAGGERS) * STAGGER_MS) / HOP_MS;
        if (hop >= 1) continue;
        const bx = bars[b].x;
        const by = bars[b].y;
        if (flung < 1) {
          spot.x = bx + s.sx[i];
          spot.y = by + s.sy[i];
          flingOut(ORIGIN, spot, s.lift[i], flung, bit);
        } else {
          const from = s.sx[i];
          const to = s.ex[i];
          const x = Math.max(from, front + to - s.x1);
          const p = to > from ? clamp01((x - from) / (to - from)) : 1;
          let y = lerp(s.sy[i], s.ey[i], p);
          const top = (FOOT_Y - y) / s.heapH[b];
          bit.x = bx + x + s.wobble[b] * top * p;
          y = FOOT_Y + (y - FOOT_Y) * (1 - CROUCH * s.crouch[b]);
          bit.y = by + y;
          if (hop > 0) {
            const rise = b === 0 ? OWN_HOP_RISE : HOP_RISE;
            bit.x = lerp(bit.x, bx + s.readX, hop);
            bit.y =
              lerp(bit.y, by + CONTACT_Y, hop) - rise * 4 * hop * (1 - hop);
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
      // the other bars' heaps land in a flash; its own detonates below
      for (let b = 1; b < n; b++) {
        const since = ms - s.landAt[b];
        if (since < 0 || since >= LAND_FLASH_MS) continue;
        stampGlimmer(
          ctx,
          bars[b].x + s.readX,
          bars[b].y + CONTACT_Y,
          BLAST * (1 - since / LAND_FLASH_MS),
          b,
          COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    // the plough on every bar
    const alpha =
      clamp01((ms - SWEEP_AT + LEAD_MS) / LEAD_MS) *
      clamp01(1 - (ms - SWEEP_END) / FADE_MS);
    if (alpha > 0) {
      const x = lerp(s.x0, s.x1, broomU);
      for (let b = 0; b < n; b++) {
        broom.x = bars[b].x + x;
        broom.y = bars[b].y;
        drawBroom(ctx, broom, alpha, ms, now);
      }
    }
    spot.x = bars[0].x + s.readX;
    spot.y = bars[0].y + CONTACT_Y;
    drawDetonation(ctx, spot, ms - s.landAt[0], OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
