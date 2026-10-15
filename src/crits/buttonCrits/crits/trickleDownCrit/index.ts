// Trickle Down, a button crit: a drop of light lands on the top button in
// view with a splash and a ring rippling out over it, then drips off it onto
// the button below, and on down the building; more drops follow, each
// trickling down quicker, until one huge drop from high lands on its own
// button with the biggest blast and a double ring, and every button turns
// over: its next taps also level the floors below it
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import {
  drawDrop,
  drawRipple,
  drawSplash,
} from "../../../../shared/animationStyles/ripple";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const IN_MS = 160;
// the trickles: TRICKLES of them, the first from FIRST_MS, each starting
// TRICKLE_GAP of the way into the last; each drop dripping from button to
// button over DRIP_MS (quicker each trickle), the first falling FALL px
const FIRST_MS = IN_MS + 200;
const TRICKLES = 3;
const TRICKLE_GAP = 0.45;
const DRIP_MS: [number, number] = [300, 120];
const FALL = 240;
const DROP = 34;
const SPLASH = 20;
const RIPPLE = BTN_W * 0.6;
const RIPPLE_W = 12;
// the huge drop from BIG_FALL up, BIG_GAP_MS after the last landing
const BIG_GAP_MS = 260;
const BIG_FALL = 620;
const BIG_FALL_MS = 260;
const BIG_DROP = 80;
const BIG_RIPPLE = BTN_W * 1.3;
const BIG_RIPPLE_W = 26;
const BIG_RIPPLE_MS = 640;
const BIG_SPLASH = 44;
const BIG_SPLASH_N = 12;
const BIG_SPLASH_MS = 480;
const TURN_EVERY = 45;
const BLAST = 110;
const BIG_BLAST = 230;
const TAIL_MS = 900;
// shakes by step: a drop's tick, a button, the huge drop
const SHAKES = [0.3, 0.5, 2.4];

interface Landing {
  bar: number;
  // the button it dripped off, or -1 for a fresh drop
  from: number;
  at: number;
  fallMs: number;
}
interface State {
  landings: Landing[];
  bigAt: number;
  turns: { bar: number; at: number }[];
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };

const topOf = (button: Point, into: Point): Point => {
  into.x = button.x;
  into.y = button.y - BTN_H / 2;
  return into;
};

// each tap levelling up to trickleDownFloors floors below too
const tideTaps = defineTapPerk("Tide", (t) => {
  const index = t.floors.indexOf(t.floor);
  const last = Math.max(0, index - meta.values.floors);
  for (let below = index - 1; below >= last; below--)
    t.levelUp(t.floors[below], 1, "+1 Lvl");
});

registerFloorCrit("trickleDownCrit", {
  // trickling taps, twice as many on its own
  reward(t) {
    const taps = Math.max(1, Math.round(t.count * meta.values.taps));
    tideTaps.add(t.floor, t.own ? taps * 2 : taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = bars.map((_, i) => i).sort((a, b) => bars[a].y - bars[b].y);
    const landings: Landing[] = [];
    let start = FIRST_MS;
    for (let c = 0; c < TRICKLES; c++) {
      const drip = lerp(DRIP_MS[0], DRIP_MS[1], c / (TRICKLES - 1));
      let t = start;
      order.forEach((bar, k) => {
        landings.push({
          bar,
          from: k ? order[k - 1] : -1,
          at: t,
          fallMs: drip,
        });
        t += drip;
      });
      start += (t - start) * TRICKLE_GAP;
    }
    for (const l of landings) hit(l.bar, l.at, 0);
    const bigAt = Math.max(...landings.map((l) => l.at)) + BIG_GAP_MS;
    hit(0, bigAt, 2);
    const turns = order
      .filter((bar) => bar !== 0)
      .map((bar, k) => ({ bar, at: bigAt + (k + 1) * TURN_EVERY }));
    for (const t of turns) hit(t.bar, t.at, 1);
    states.set(r, { landings, bigAt, turns });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (const l of state.landings)
      drawRipple(ctx, topOf(bars[l.bar], spot), ms - l.at, RIPPLE, RIPPLE_W);
    topOf(bars[0], spot);
    drawRipple(
      ctx,
      spot,
      ms - state.bigAt,
      BIG_RIPPLE,
      BIG_RIPPLE_W,
      2,
      BIG_RIPPLE_MS,
    );
    beginLightBatch(ctx);
    for (const l of state.landings) {
      topOf(bars[l.bar], spot);
      // a fresh drop falls FALL; a drip falls off the button above's bottom
      const fall = l.from < 0 ? FALL : spot.y - (bars[l.from].y + BTN_H / 2);
      drawDrop(ctx, spot, l.at - ms, l.fallMs, fall, DROP);
      drawSplash(ctx, spot, ms - l.at, SPLASH);
    }
    topOf(bars[0], spot);
    drawDrop(ctx, spot, state.bigAt - ms, BIG_FALL_MS, BIG_FALL, BIG_DROP);
    drawSplash(
      ctx,
      spot,
      ms - state.bigAt,
      BIG_SPLASH,
      BIG_SPLASH_N,
      BIG_SPLASH_MS,
    );
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, spot, ms - state.bigAt, BIG_BLAST, now);
    for (const t of state.turns)
      drawDetonation(ctx, topOf(bars[t.bar], spot), ms - t.at, BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
