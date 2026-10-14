// Rip Current, a rate crit: a hole opens off the bars' left ends and starts
// to pull: the glitter lying along every bar in view is torn loose, nearest
// first, and dragged into it on spiralling, stretching streaks, a trickle
// then a flood, the strays breaking away and yanked back; the hole swells,
// trembles and glows as it swallows, the rumble rising, until it takes the
// last, collapses to a point and bursts, firing wisps back onto every bar,
// its own last: each readout turns over, its next payouts coming twice as
// fast
import meta from "./meta";
import { countDown, defineBarEffect } from "../../rateBonus";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawGravityHole } from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import {
  BAR_HALF_H,
  holeHash,
  ownLast,
} from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the hole INSET in from the screen's left edge, level with the bars' middle
const INSET = 150;
const HOLE: [number, number] = [70, 220];
const GLOW = 280;
const TREMBLE = 14;
// the glitter: PER_BAR specks along each bar, SPREAD of its half height
const PER_BAR = 18;
const SPREAD = 0.55;
const SPECK = 22;
// lying, a speck trembles JITTER px and leans TUG px towards the hole
const JITTER = 7;
const TUG = 40;
// torn loose from PULL_MS, nearest first, the last SPAN_MS on; each flies
// FLY_MS (quicker as the flood comes), wound TURN rad round the hole, every
// STRAY_EVERY-th breaking STRAY of its way back out before it's yanked in
const PULL_MS = IN_MS + 140;
const SPAN_MS = 950;
const FLY_MS: [number, number] = [560, 180];
const TURN = 3.6;
const STRAY_EVERY = 5;
const STRAY = 0.45;
// the collapse, then the burst firing wisps back, one every GAP_MS (closing)
const COLLAPSE_GAP_MS = 40;
const COLLAPSE_MS = 90;
const BURST_BLAST = 340;
const GAP_MS: [number, number] = [90, 45];
const WISP_MS = 220;
const WISP = WISP_SIZE * 1.1;
const LAND_BLAST = 130;
const OWN_BLAST = 230;
// shakes by step: the burst, a bar, its own
const SHAKES = [2.4, 0.9, 1.8];

interface Speck {
  bar: number;
  // along its bar, from its middle
  ox: number;
  oy: number;
  // from the hole, when torn loose
  angle: number;
  reach: number;
  startMs: number;
  flyMs: number;
  turn: number;
  stray: number;
}
interface Shot {
  bar: number;
  from: number;
  lands: number;
  at: (ms: number) => Point | null;
}
interface State {
  bars: Point[];
  hole: Point;
  specks: Speck[];
  charge: Charge;
  collapseMs: number;
  burstMs: number;
  shots: Shot[];
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const core: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

// a ripped bar: `speed` times as fast for its next payouts
const ripped = defineBarEffect<number>({
  speed: () => meta.values.speed,
  onPayout: countDown,
});

// where a torn-loose speck is u (0..1) of its way in, from the hole
function flightAt(speck: Speck, u: number, hole: Point, into: Point): Point {
  const e = u * u;
  const bulge = speck.stray * Math.sin(Math.PI * Math.min(1, u * 2));
  const a = speck.angle + speck.turn * e;
  const d = speck.reach * (1 - e) * (1 + bulge);
  into.x = hole.x + Math.cos(a) * d;
  into.y = hole.y + Math.sin(a) * d;
  return into;
}

registerFloorCrit("ripCurrentCrit", {
  reward(t) {
    const { payouts, ownPayouts } = meta.values;
    t.flipRate();
    ripped.set(
      t.floor,
      (ripped.get(t.floor) ?? 0) + (t.own ? ownPayouts : payouts),
    );
    t.punch(`x${meta.values.speed} Speed`);
  },
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    let mid = 0;
    for (const bar of bars) mid += bar.y / bars.length;
    const hole = { x: -r.viewportWidth / 2 + INSET, y: mid };
    const specks: Speck[] = [];
    bars.forEach((bar, b) => {
      for (let j = 0; j < PER_BAR; j++) {
        const i = b * PER_BAR + j;
        const ox = lerp(-half, half, (j + holeHash(i, 3010)) / PER_BAR);
        const oy = (holeHash(i, 3011) * 2 - 1) * BAR_HALF_H * SPREAD;
        const x = bar.x + ox - hole.x;
        const y = bar.y + oy - hole.y;
        specks.push({
          bar: b,
          ox,
          oy,
          angle: Math.atan2(y, x),
          reach: Math.hypot(x, y),
          startMs: 0,
          flyMs: 0,
          turn: i % 2 ? -TURN : TURN,
          stray: i % STRAY_EVERY === 0 ? STRAY : 0,
        });
      }
    });
    specks.sort((a, b) => a.reach - b.reach);
    let last = 0;
    specks.forEach((speck, i) => {
      const u = i / Math.max(1, specks.length - 1);
      speck.startMs = PULL_MS + SPAN_MS * Math.sqrt(u);
      speck.flyMs = lerp(FLY_MS[0], FLY_MS[1], u);
      last = Math.max(last, speck.startMs + speck.flyMs);
    });
    const collapseMs = last + COLLAPSE_GAP_MS;
    const burstMs = collapseMs + COLLAPSE_MS;
    hit(0, burstMs, 0);
    const state: State = {
      bars,
      hole,
      specks,
      charge: planCharge(PULL_MS, collapseMs - PULL_MS, { bang: false }),
      collapseMs,
      burstMs,
      shots: [],
    };
    // the wisps back, nearest the hole first, its own last
    const order = ownLast(bars);
    const rest = order
      .slice(0, -1)
      .sort(
        (a, b) =>
          Math.hypot(bars[a].x - hole.x, bars[a].y - hole.y) -
          Math.hypot(bars[b].x - hole.x, bars[b].y - hole.y),
      );
    let t = burstMs;
    [...rest, 0].forEach((bar, k) => {
      const from = t;
      const lands = from + WISP_MS;
      const at: Point = { x: 0, y: 0 };
      state.shots.push({
        bar,
        from,
        lands,
        at: (ms) => {
          if (ms < from || ms > lands) return null;
          const u = (ms - from) / WISP_MS;
          const to = state.bars[bar];
          at.x = lerp(hole.x, to.x, u);
          at.y = lerp(hole.y, to.y, u) - 160 * 4 * u * (1 - u);
          return at;
        },
      });
      hit(bar, lands, bar === 0 ? 2 : 1);
      t += lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, order.length - 1));
    });
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    const { hole } = state;
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, hole.x, p),
        lerp(0, hole.y, p),
        r.flashFont * lerp(1, 0.3, p),
      );
    }
    tickCharge(state.charge, ms, r.shake);
    const c = chargeAt(state.charge, ms);
    // the hole, swelling and trembling as it swallows, then collapsing
    if (ms >= IN_MS && ms < state.burstMs) {
      const shrink =
        ms < state.collapseMs ? 1 : 1 - (ms - state.collapseMs) / COLLAPSE_MS;
      trembleAt(c, ms, TREMBLE, shiver);
      core.x = hole.x + shiver.x;
      core.y = hole.y + shiver.y;
      const grow = clamp01((ms - IN_MS) / 200);
      drawGravityHole(
        ctx,
        core,
        lerp(HOLE[0], HOLE[1], c) * grow * shrink,
        1,
        ms,
        now,
      );
      drawChargeGlow(ctx, core, c, GLOW * shrink, now);
    }
    // the glitter: lying on the bars and trembling, or streaking in
    const jitter = JITTER * (0.3 + c);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (ms >= IN_MS)
      for (let i = 0; i < state.specks.length; i++) {
        const speck = state.specks[i];
        const color = i % 3 ? COLOR.heavenlyGold : COLOR.white;
        const since = ms - speck.startMs;
        if (since >= speck.flyMs) continue;
        if (since < 0) {
          const bar = bars[speck.bar];
          const lean = (TUG * c) / Math.max(1, speck.reach);
          const x = bar.x + speck.ox;
          const y = bar.y + speck.oy;
          stampGlimmer(
            ctx,
            x + (hole.x - x) * lean + Math.sin(ms * 0.05 + i) * jitter,
            y + (hole.y - y) * lean + Math.cos(ms * 0.06 + i * 1.7) * jitter,
            SPECK,
            i,
            color,
          );
          continue;
        }
        const u = since / speck.flyMs;
        flightAt(speck, u, hole, spot);
        stampGlimmer(ctx, spot.x, spot.y, SPECK * (1 - 0.5 * u), i, color);
      }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, hole, ms - state.burstMs, BURST_BLAST, now);
    for (const shot of state.shots) {
      drawWispBetween(ctx, shot.at, ms, now, WISP, 0.8, shot.from, shot.lands);
      drawDetonation(
        ctx,
        bars[shot.bar],
        ms - shot.lands,
        shot.bar === 0 ? OWN_BLAST : LAND_BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
