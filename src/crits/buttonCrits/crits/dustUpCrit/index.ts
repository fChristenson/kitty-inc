// Dust Up, a button crit: the number blows apart into glitter strewn all
// over the floors in view; then gusts of wind sweep it towards the buttons,
// each harder and sooner than the last, a whoosh and a jolt each, the mess
// drifting together into a heap beside every button; the heaps hop into
// their buttons one after another, quicker each, its own last, each landing
// in a blast: the button turns over, each of its next taps also paying out
// the floors above and below it
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import {
  BLOW_UP,
  flingOut,
  simulateClean,
  type Force,
  type Swept,
} from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

// the number blowing apart, the mess flung out over FLING_MS: EDGE in from
// the screen's left, up to GAP short of the buttons, SPREAD above and below
const BLOW_MS = 120;
const FLING_MS = 300;
const EDGE = 60;
const GAP = 120;
const SPREAD = 300;
const BITS = 120;
const SPECK = 20;
// the heaps HEAP px left of each button, on its bottom edge
const HEAP = 80;
// the gusts: GUSTS from FIRST_MS, GUST_MS long, GAPS_MS apart (closing),
// pushing PUSH px/ms² towards the heaps (harder each), easing off within EASE
const FIRST_MS = BLOW_MS + FLING_MS + 150;
const GUSTS = 6;
const GUST_MS = 120;
const GAPS_MS: [number, number] = [320, 110];
const PUSH: [number, number] = [0.01, 0.02];
const EASE = 90;
const GUST_SHAKE: [number, number] = [0.4, 1];
// the heaps hopping in: SETTLE_MS after the last gust, HOP_GAPS_MS apart,
// each bit HOP_MS on an arc HOP_RISE px high
const SETTLE_MS = 300;
const HOP_GAPS_MS: [number, number] = [150, 80];
const HOP_MS = 200;
const HOP_RISE = 130;
const BLAST = 130;
const OWN_BLAST = 280;
// shakes by step: -, a button, its own
const SHAKES = [0.4, 1, 2.6];

interface State {
  bars: Point[];
  spots: Point[];
  lift: Float32Array;
  // each bit's button, and when its heap hops in
  heapOf: Int16Array;
  hopAt: number[];
  swept: Swept;
  gusts: number[];
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };

// the floors that can pay out round a floor
const around = <T>(floors: T[], floor: T): T[] => {
  const k = floors.indexOf(floor);
  const near: T[] = [];
  if (floors[k - 1]) near.push(floors[k - 1]);
  if (floors[k + 1]) near.push(floors[k + 1]);
  return near;
};

// each tap also paying out the floors above and below
const dustpanTaps = defineTapPerk("Dustpan", (t) => {
  for (const floor of around(t.floors, t.floor))
    if (floor.unlocked) t.payout(floor, 1);
});

registerFloorCrit("dustUpCrit", {
  reward(t) {
    dustpanTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    let top = Infinity;
    let bottom = -Infinity;
    let left = Infinity;
    for (const b of bars) {
      top = Math.min(top, b.y);
      bottom = Math.max(bottom, b.y);
      left = Math.min(left, b.x - BTN_W / 2);
    }
    const heaps = bars.map((b) => ({
      x: b.x - BTN_W / 2 - HEAP,
      y: b.y + BTN_H / 2 - 10,
    }));
    const x0 = -r.viewportWidth / 2 + EDGE;
    const x1 = Math.max(x0 + 100, left - GAP);
    const spots: Point[] = [];
    const heapOf = new Int16Array(BITS);
    for (let i = 0; i < BITS; i++) {
      const p = {
        x: lerp(x0, x1, holeHash(i, 3610)),
        y: lerp(top - SPREAD, bottom + SPREAD, holeHash(i, 3611)),
      };
      spots.push(p);
      let best = 0;
      for (let k = 1; k < bars.length; k++)
        if (Math.abs(bars[k].y - p.y) < Math.abs(bars[best].y - p.y)) best = k;
      heapOf[i] = best;
    }
    const gusts: number[] = [];
    let t = FIRST_MS;
    for (let k = 0; k < GUSTS; k++) {
      gusts.push(t);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / (GUSTS - 1));
    }
    const lastGust = gusts[GUSTS - 1] + GUST_MS;
    // a gust pushes every bit towards the heap level with it
    const force: Force = {
      kind: "force",
      push: (x, y, ms, into) => {
        let k = -1;
        for (let g = 0; g < GUSTS; g++)
          if (ms >= gusts[g] && ms < gusts[g] + GUST_MS) k = g;
        if (k < 0) return null;
        let best = heaps[0];
        for (const h of heaps)
          if (Math.abs(h.y - y) < Math.abs(best.y - y)) best = h;
        const dx = best.x - x;
        const dy = best.y - y;
        const d = Math.hypot(dx, dy) || 1;
        const a =
          lerp(PUSH[0], PUSH[1], k / (GUSTS - 1)) * Math.min(1, d / EASE);
        into.x = (dx / d) * a;
        into.y = (dy / d) * a;
        return into;
      },
    };
    const swept = simulateClean(
      spots,
      [force],
      BLOW_MS + FLING_MS,
      lastGust + SETTLE_MS,
    );
    const hopAt: number[] = [];
    const order = ownLast(bars);
    let h = lastGust + SETTLE_MS;
    order.forEach((bar, k) => {
      hopAt[bar] = h;
      hit(bar, h + HOP_MS, bar === 0 ? 2 : 1);
      h += lerp(
        HOP_GAPS_MS[0],
        HOP_GAPS_MS[1],
        k / Math.max(1, order.length - 1),
      );
    });
    states.set(r, {
      bars,
      spots,
      lift: Float32Array.from(spots, (_, i) => holeHash(i, 3612)),
      heapOf,
      hopAt,
      swept,
      gusts,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < BLOW_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + (0.3 * ms) / BLOW_MS),
      );
    // a whoosh and a jolt at every gust, harder each
    while (r.kicked < GUSTS && ms >= state.gusts[r.kicked]) {
      r.shake(lerp(GUST_SHAKE[0], GUST_SHAKE[1], r.kicked / (GUSTS - 1)));
      playSwoosh();
      r.kicked++;
    }
    drawDetonation(ctx, ORIGIN, ms, BLOW_UP.size, now);
    if (ms >= BLOW_MS) {
      const flung = (ms - BLOW_MS) / FLING_MS;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < BITS; i++) {
        const heap = state.heapOf[i];
        const hop = (ms - state.hopAt[heap] - (i % 6) * 8) / HOP_MS;
        if (hop >= 1) continue;
        if (flung < 1)
          flingOut(ORIGIN, state.spots[i], state.lift[i], flung, bit);
        else if (hop <= 0) state.swept.at(i, ms, bit);
        else {
          const end = state.swept.end(i);
          const to = bars[heap];
          bit.x = lerp(end.x, to.x, hop);
          bit.y = lerp(end.y, to.y, hop) - HOP_RISE * 4 * hop * (1 - hop);
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
    for (let bar = 0; bar < bars.length; bar++)
      drawDetonation(
        ctx,
        bars[bar],
        ms - state.hopAt[bar] - HOP_MS,
        bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
