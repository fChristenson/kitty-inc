// Drizzler, a floor crit: the number puffs into a rain wisp that drifts over
// each bar in turn dripping drops of light onto it, each landing in a splash
// with a ring rippling out flat along the bar and a level, the drips coming
// quicker and the wisp darting faster from bar to bar, a drizzle turning to a
// downpour; then it soars high over its own bar, swelling and trembling as
// the rumble builds, and lets go one huge drop: the biggest blast, a double
// ring, and a ring rippling along every other bar with its levels
import {
  drawDrop,
  drawRipple,
  drawSplash,
  RIPPLE_MS,
} from "../../../../shared/animationStyles/ripple";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, ownLast } from "../../critPlayer/shared";

const IN_MS = 140;
// the wisp over each bar CLOUD px up, drifting along DRIFT of its half width
// either way while it drips DRIPS drops, DWELL_MS there (shorter each bar),
// darting to the next over HOP_MS (quicker each)
const CLOUD = 230;
const DRIFT = 0.7;
const DRIPS = 4;
const DWELL_MS: [number, number] = [380, 160];
const HOP_MS: [number, number] = [150, 70];
const FALL_MS = 150;
const WISP = WISP_SIZE * 1.4;
const DROP = 26;
const SPLASH = 16;
const RIPPLE_W = 12;
const RIPPLE = 0.7;
// the huge drop: the wisp soaring to SOAR px over its own bar over SOAR_MS,
// charging CHARGE_MS, the drop falling over BIG_FALL_MS
const SOAR = 620;
const SOAR_MS = 220;
const CHARGE_MS = 420;
const BIG_FALL_MS = 240;
const BIG_DROP = 70;
const BIG_SPLASH = 40;
const BIG_RIPPLE_W = 28;
const BIG_RIPPLE_MS = 640;
const TREMBLE = 16;
const GLOW = 360;
const BIG_BLAST = 340;
// the ring rippling along every other bar RING_GAP_MS after the huge drop,
// RING_STEP_MS apart
const RING_GAP_MS = 80;
const RING_STEP_MS = 45;
// shakes by step: a drop, the ring on another bar, the huge drop
const SHAKES = [0.3, 0.8, 3];

interface Drip {
  bar: number;
  // from its bar's middle
  x: number;
  landMs: number;
}
interface Leg {
  bar: number;
  arriveMs: number;
  leaveMs: number;
}
interface State {
  bars: Point[];
  legs: Leg[];
  drips: Drip[];
  // the huge drop: the wisp over its own bar from soarMs, letting go at
  // dropMs, landing at bigMs
  soarMs: number;
  dropMs: number;
  bigMs: number;
  charge: Charge;
  wisp: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

// the wisp's spot at ms: drifting along over a bar, darting to the next, or
// soaring over its own bar
function wispAt(
  state: State,
  ms: number,
  half: number,
  into: Point,
): Point | null {
  if (ms < IN_MS || ms > state.dropMs) return null;
  const { legs, bars } = state;
  const own = bars[0];
  if (ms >= state.soarMs) {
    const last = legs[legs.length - 1];
    const from = bars[last.bar];
    const u = clamp01((ms - state.soarMs) / SOAR_MS);
    const e = 1 - (1 - u) ** 2;
    into.x = lerp(from.x + half * DRIFT, own.x, e);
    into.y = lerp(from.y - CLOUD, own.y - SOAR, e);
    return into;
  }
  let k = 0;
  while (k < legs.length - 1 && ms >= legs[k + 1].arriveMs) k++;
  const leg = legs[k];
  const bar = bars[leg.bar];
  if (ms < leg.leaveMs || k === legs.length - 1) {
    const u = clamp01((ms - leg.arriveMs) / (leg.leaveMs - leg.arriveMs));
    into.x = bar.x + lerp(-half, half, u) * DRIFT;
    into.y = bar.y - CLOUD;
    return into;
  }
  const next = bars[legs[k + 1].bar];
  const u = (ms - leg.leaveMs) / (legs[k + 1].arriveMs - leg.leaveMs);
  const e = u * u * (3 - 2 * u);
  into.x = lerp(bar.x + half * DRIFT, next.x - half * DRIFT, e);
  into.y = lerp(bar.y, next.y, e) - CLOUD;
  return into;
}

registerFloorCrit("drizzlerCrit", {
  // every other drop lands two levels, the ring after the huge drop the
  // crit's multiple
  levels: (count, step) => (step === 0 ? 2 : count),
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const order = ownLast(bars).slice(0, -1);
    const legs: Leg[] = [];
    const drips: Drip[] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      const u = k / Math.max(1, order.length - 1);
      const dwell = lerp(DWELL_MS[0], DWELL_MS[1], u);
      legs.push({ bar, arriveMs: t, leaveMs: t + dwell });
      for (let d = 0; d < DRIPS; d++) {
        const v = (d + 0.5) / DRIPS;
        const landMs = t + dwell * v + FALL_MS;
        drips.push({ bar, x: lerp(-half, half, v) * DRIFT, landMs });
        if (d % 2) hit(bar, landMs, 0);
      }
      t += dwell + lerp(HOP_MS[0], HOP_MS[1], u);
    });
    // alone, it drips on its own bar first
    if (!legs.length)
      legs.push({ bar: 0, arriveMs: IN_MS, leaveMs: IN_MS + DWELL_MS[0] });
    const soarMs = legs[legs.length - 1].leaveMs;
    const dropMs = soarMs + SOAR_MS + CHARGE_MS;
    const bigMs = dropMs + BIG_FALL_MS;
    hit(0, bigMs, 2);
    order.forEach((bar, k) =>
      hit(bar, bigMs + RING_GAP_MS + k * RING_STEP_MS, 1),
    );
    const at: Point = { x: 0, y: 0 };
    const state: State = {
      bars,
      legs,
      drips,
      soarMs,
      dropMs,
      bigMs,
      charge: planCharge(soarMs + SOAR_MS, CHARGE_MS, { bang: false }),
      wisp: (ms) => wispAt(state, ms, half, at),
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    const half = r.play.barHalfWidth;
    const ripple = half * RIPPLE;
    const fall = CLOUD - BAR_HALF_H;
    const own = bars[0];
    // the rings, flat along each bar
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const drip of state.drips) {
      const since = ms - drip.landMs;
      if (since < 0 || since >= RIPPLE_MS) continue;
      const bar = bars[drip.bar];
      spot.x = bar.x + drip.x;
      spot.y = bar.y;
      drawRipple(ctx, spot, since, ripple, RIPPLE_W);
    }
    drawRipple(
      ctx,
      own,
      ms - state.bigMs,
      half * 1.1,
      BIG_RIPPLE_W,
      2,
      BIG_RIPPLE_MS,
    );
    for (let k = 0; k < state.legs.length; k++)
      drawRipple(
        ctx,
        bars[state.legs[k].bar],
        ms - state.bigMs - RING_GAP_MS - k * RING_STEP_MS,
        half,
        BIG_RIPPLE_W * 0.6,
        2,
      );
    ctx.restore();
    // the drops falling and splashing
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (const drip of state.drips) {
      const bar = bars[drip.bar];
      spot.x = bar.x + drip.x;
      spot.y = bar.y - BAR_HALF_H;
      drawDrop(ctx, spot, drip.landMs - ms, FALL_MS, fall, DROP);
      drawSplash(ctx, spot, ms - drip.landMs, SPLASH);
    }
    spot.x = own.x;
    spot.y = own.y - BAR_HALF_H;
    drawDrop(
      ctx,
      spot,
      state.bigMs - ms,
      BIG_FALL_MS,
      SOAR - BAR_HALF_H,
      BIG_DROP,
    );
    drawSplash(ctx, spot, ms - state.bigMs, BIG_SPLASH, 12, 480);
    endLightBatch(ctx);
    ctx.restore();
    // the wisp, swelling and trembling before it lets go
    tickCharge(state.charge, ms, r.shake);
    const c = chargeAt(state.charge, ms);
    if (c > 0 && ms < state.dropMs) {
      trembleAt(c, ms, TREMBLE, shiver);
      spot.x = own.x + shiver.x;
      spot.y = own.y - SOAR + shiver.y;
      drawChargeGlow(ctx, spot, c, GLOW, now);
    }
    drawWispBetween(
      ctx,
      state.wisp,
      ms,
      now,
      WISP * (1 + 0.6 * c),
      0.3 + 0.7 * c,
      IN_MS,
      state.dropMs,
    );
    drawDetonation(ctx, own, ms - state.bigMs, BIG_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
