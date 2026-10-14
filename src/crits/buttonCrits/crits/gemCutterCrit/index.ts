// Gem Cutter, a button crit: over every button in turn a pen wisp cuts a big
// gem out of glitter in one stroke, faster and faster, a click and a jolt
// every few dots, each gem quicker than the last, its own last and biggest;
// each finished gem blazes and drops into its button, and the button turns
// over: its next taps also level the building's lowest floor
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import {
  drawDots,
  shapeOutline,
  SHAPES,
} from "../../../../shared/animationStyles/drawing";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { BTN_H } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// each gem's stroke takes PEN_MS (quicker each, its own OWN_PEN_MS), the
// next starting NEXT of the way into it; its dots land quicker and quicker
// (a dot's time share is its count share to PACE)
const PEN_MS: [number, number] = [480, 280];
const OWN_PEN_MS = 560;
const NEXT = 0.6;
const PACE = 0.65;
const DOTS = 64;
const OWN_DOTS = 84;
const CLICK_EVERY = 16;
// a gem SIZE px from its middle to its edge, its tip GAP over its button
const SIZE = 95;
const OWN_SIZE = 125;
const GAP = 20;
const DOT = 18;
const OWN_DOT = 22;
const PEN = WISP_SIZE * 0.9;
// finished, it blazes over BLAZE_MS, then drops into its button over
// DROP_MS, shrinking to DROP_SHRINK
const BLAZE_MS = 140;
const DROP_MS = 110;
const DROP_SHRINK = 0.45;
const BLAST = 110;
const OWN_BLAST = 220;
const TAIL_MS = 900;
// shakes by step: a click, a button, its own
const SHAKES = [0.25, 0.9, 2.6];

interface Gem {
  bar: number;
  own: boolean;
  dots: Point[];
  size: number;
  dot: number;
  startMs: number;
  penMs: number;
  landMs: number;
  pen: (ms: number) => Point | null;
}
interface State {
  bars: Point[];
  gems: Gem[];
}
const states = new WeakMap<Running, State>();
const centre: Point = { x: 0, y: 0 };

// where gem's middle is over its button, its tip GAP over it
const gemAt = (button: Point, size: number, into: Point): Point => {
  into.x = button.x;
  into.y = button.y - BTN_H / 2 - GAP - size;
  return into;
};

// how many of a stroke's dots have landed by `since` into it
const landed = (since: number, penMs: number, dots: number): number =>
  dots * clamp01(since / penMs) ** (1 / PACE);

// each tap also levelling the building's lowest open floor
const gemTaps = defineTapPerk("Gem", (t) => {
  let lowest: Floor | null = null;
  for (const floor of t.floors)
    if (
      floor !== t.floor &&
      floor.unlocked &&
      !isFloorMaxed(floor) &&
      (!lowest || floor.upgradeCount < lowest.upgradeCount)
    )
      lowest = floor;
  if (lowest) t.levelUp(lowest, 1, "+1 Lvl");
});

registerFloorCrit("gemCutterCrit", {
  // gem taps, twice as many on its own
  reward(t) {
    const taps = Math.max(1, Math.round(t.count * meta.values.taps));
    gemTaps.add(t.floor, t.own ? taps * 2 : taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const state: State = { bars, gems: [] };
    let start = IN_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const size = own ? OWN_SIZE : SIZE;
      const count = own ? OWN_DOTS : DOTS;
      const penMs = own
        ? OWN_PEN_MS
        : lerp(PEN_MS[0], PEN_MS[1], k / Math.max(1, order.length - 2));
      // traced from its top left corner, local to its middle
      const dots = shapeOutline(SHAPES.gem, count, { x: 0, y: 0 }, size);
      const pen: Point = { x: 0, y: 0 };
      const startMs = start;
      const gem: Gem = {
        bar,
        own,
        dots,
        size,
        dot: own ? OWN_DOT : DOT,
        startMs,
        penMs,
        landMs: startMs + penMs + BLAZE_MS + DROP_MS,
        pen: (ms) => {
          const f = Math.min(
            dots.length - 1,
            landed(ms - startMs, penMs, dots.length - 1),
          );
          const i = Math.floor(f);
          const a = dots[i];
          const b = dots[Math.min(dots.length - 1, i + 1)];
          gemAt(state.bars[bar], size, centre);
          pen.x = centre.x + lerp(a.x, b.x, f - i);
          pen.y = centre.y + lerp(a.y, b.y, f - i);
          return pen;
        },
      };
      state.gems.push(gem);
      for (let d = CLICK_EVERY; d < dots.length; d += CLICK_EVERY)
        hit(bar, startMs + penMs * (d / dots.length) ** PACE, 0);
      hit(bar, gem.landMs, own ? 2 : 1);
      start += penMs * NEXT;
    });
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
    for (const gem of state.gems) {
      const since = ms - gem.startMs;
      if (since < 0) continue;
      const button = bars[gem.bar];
      const doneMs = gem.penMs + BLAZE_MS;
      if (ms < gem.landMs) {
        gemAt(button, gem.size, centre);
        const drop = clamp01((since - doneMs) / DROP_MS) ** 2;
        const tip = button.y - BTN_H / 2;
        ctx.save();
        ctx.translate(centre.x, lerp(centre.y, tip, drop));
        const scale = lerp(1, DROP_SHRINK, drop);
        ctx.scale(scale, scale);
        drawDots(
          ctx,
          gem.dots,
          Math.ceil(landed(since, gem.penMs, gem.dots.length)),
          gem.dot,
          ms,
          clamp01((since - gem.penMs) / BLAZE_MS),
        );
        ctx.restore();
      }
      drawWispBetween(
        ctx,
        gem.pen,
        ms,
        now,
        gem.own ? PEN * 1.3 : PEN,
        0.6,
        gem.startMs,
        gem.startMs + gem.penMs,
      );
      centre.x = button.x;
      centre.y = button.y - BTN_H / 2;
      drawDetonation(
        ctx,
        centre,
        ms - gem.landMs,
        gem.own ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
