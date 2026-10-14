// Rapids, a floor crit: the number bursts into a wisp that shoots the rapids
// down the building, cutting through each bar and swinging wide round its
// end into the next, quicker and quicker, a river of cash pouring along
// behind it through every turn, each bar it cuts blasting; it plunges into
// its own bar and the whole river pours in after it, a jolt every few coins,
// the last slamming in with the biggest blast
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import { alongRoute } from "../../../../shared/curves";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

const IN_MS = 180;
// it cuts each bar CUT of the way out to an end, swinging SWING past the
// other end between bars; each leg LEG_MS, first to last
const CUT = 0.45;
const SWING = 90;
const LEG_MS: [number, number] = [300, 110];
const WISP = WISP_SIZE * 1.6;
// the river: COINS coins SPACING ms apart on the wisp's path, COIN px; a
// jolt every POUR_EVERY coins into its own bar
const COINS = 90;
const SPACING = 8;
const COIN = 30;
const BILL_EVERY = 4;
const COIN_SPIN = 0.02;
const POUR_EVERY = 15;
const CUT_BLAST = 160;
const POUR_BLAST = 90;
const PLUNGE_BLAST = 200;
const LAST_BLAST = 400;
// shakes by step: a pour jolt, a cut or the plunge, the last coin in
const SHAKES = [0.35, 0.9, 2.6];

const sprites: CoinBurstSprite[] = Array.from({ length: COINS }, (_, i) => ({
  kind: i % BILL_EVERY === 0 ? "bill" : "coin",
  spinFrame: 0,
  axisAngle: (holeHash(i, 3100) - 0.5) * Math.PI,
}));

interface State {
  // the route from bars[0], and when the wisp reaches each of its points
  route: Point[];
  reach: number[];
  // each bar it cuts, where (from the bar's middle) and when
  cuts: { bar: number; x: number; at: number }[];
  plungeAt: number;
  lastAt: number;
  // bars[0] this frame
  offset: Point;
  wispAt: (t: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };

// the wisp's spot t ms in, null before it sets off or once it's in
function pathAt(state: State, t: number, into: Point): Point | null {
  const { reach, route } = state;
  if (t < IN_MS || t > state.plungeAt) return null;
  let k = 0;
  while (k < reach.length - 2 && t >= reach[k + 1]) k++;
  const local = (t - reach[k]) / (reach[k + 1] - reach[k]);
  alongRoute(route, (k + local) / (route.length - 1), into);
  into.x += state.offset.x;
  into.y += state.offset.y;
  return into;
}

registerFloorCrit("rapidsCrit", {
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const base = bars[0];
    const order = ownLast(bars);
    const route: Point[] = [{ x: -base.x, y: -base.y }];
    const cutAt: number[] = [];
    order.forEach((bar, k) => {
      const dir = k % 2 ? 1 : -1;
      const at = bars[bar];
      cutAt.push(route.length);
      route.push({ x: at.x - base.x + dir * CUT * half, y: at.y - base.y });
      const next = order[k + 1];
      if (next === undefined) return;
      route.push({
        x: at.x - base.x - dir * (half + SWING),
        y: (at.y + bars[next].y) / 2 - base.y,
      });
    });
    const legs = route.length - 1;
    const reach = [IN_MS];
    for (let k = 0; k < legs; k++)
      reach.push(reach[k] + lerp(...LEG_MS, legs > 1 ? k / (legs - 1) : 1));
    const cuts = order.map((bar, k) => ({
      bar,
      x: route[cutAt[k]].x + base.x - bars[bar].x,
      at: reach[cutAt[k]],
    }));
    const plungeAt = reach[legs];
    const lastAt = plungeAt + COINS * SPACING;
    for (const cut of cuts) hit(cut.bar, cut.at, 1);
    for (let i = POUR_EVERY - 1; i < COINS - 1; i += POUR_EVERY)
      hit(0, plungeAt + (i + 1) * SPACING, 0);
    hit(0, lastAt, 2);
    const state: State = {
      route,
      reach,
      cuts,
      plungeAt,
      lastAt,
      offset: { x: 0, y: 0 },
      wispAt: (t) => pathAt(state, t, spot),
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    state.offset.x = bars[0].x;
    state.offset.y = bars[0].y;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - ms / IN_MS), {
        alpha: 1 - ms / IN_MS,
      });
    // the river, tail first so the coins nearest the wisp are on top
    if (ms > IN_MS && ms < state.lastAt) {
      const base = ctx.getTransform();
      beginCoinBatch(ctx);
      for (let i = COINS - 1; i >= 0; i--) {
        if (!pathAt(state, ms - (i + 1) * SPACING, spot)) continue;
        const coin = sprites[i];
        coin.spinFrame = ms * COIN_SPIN + i;
        drawCoinBurstFrame(ctx, coin, spot.x, spot.y, COIN, base);
      }
      endCoinBatch(ctx);
    }
    if (ms <= state.plungeAt)
      drawWisp(
        ctx,
        state.wispAt,
        ms,
        now,
        WISP,
        clamp01((ms - IN_MS) / (state.plungeAt - IN_MS)),
      );
    const own = state.cuts[state.cuts.length - 1];
    for (const cut of state.cuts) {
      blast.x = bars[cut.bar].x + cut.x;
      blast.y = bars[cut.bar].y;
      drawDetonation(
        ctx,
        blast,
        ms - cut.at,
        cut === own ? PLUNGE_BLAST : CUT_BLAST,
        now,
      );
    }
    blast.x = bars[0].x + own.x;
    blast.y = bars[0].y;
    for (let i = POUR_EVERY - 1; i < COINS - 1; i += POUR_EVERY)
      drawDetonation(
        ctx,
        blast,
        ms - state.plungeAt - (i + 1) * SPACING,
        POUR_BLAST,
        now,
      );
    drawDetonation(ctx, blast, ms - state.lastAt, LAST_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
