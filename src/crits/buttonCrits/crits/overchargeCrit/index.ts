// Overcharge, a button crit: bolts fork out of the number into every other
// button in view in a blink, each left crackling, charged with the levels
// its next tap lands; then a giant bolt cracks down from the sky into the
// crit's own
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/animationStyles/lightning";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  registerFloorCrit,
  type Point,
  type Running,
  byHeight,
  clamp01,
  drawText,
} from "../../../floorCrits/critPlayer";

const FORK_AT = 110;
const STRIKE_GAP_MS = 60;
const BOLT_MS = 220;
const GIANT_GAP_MS = 300;
const GIANT_MS = 320;
const GIANT_WIDTH = 2.8;
// the giant comes down from this far above its button, a little to its side
const SKY = 1.1;
const SKEW = 0.12;
const BLAST = 80;
const GIANT_BLAST = 200;
const TAIL_MS = 900;

interface State {
  // the other buttons top to bottom, each struck STRIKE_GAP_MS after the last
  order: number[];
  bolts: Bolt[];
  giant: Bolt;
  giantAt: number;
}

const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };

const strikeAt = (k: number) => FORK_AT + k * STRIKE_GAP_MS;
const skyOf = (r: Running, at: Point, out: Point) => {
  out.x = at.x + r.viewportWidth * SKEW;
  out.y = at.y - r.viewportWidth * SKY;
  return out;
};

registerFloorCrit("overchargeCrit", {
  plan(r, bars, hit) {
    const order = byHeight(bars).filter((bar) => bar !== 0);
    order.forEach((bar, k) => hit(bar, strikeAt(k), 1));
    const giantAt = order.length
      ? strikeAt(order.length - 1) + GIANT_GAP_MS
      : FORK_AT + GIANT_GAP_MS / 2;
    hit(0, giantAt, 2);
    hit(0, FORK_AT, 0);
    states.set(r, {
      order,
      bolts: order.map((bar) => createBolt({ ...ORIGIN }, { ...bars[bar] }, 2)),
      giant: createBolt(skyOf(r, bars[0], { x: 0, y: 0 }), { ...bars[0] }, 3),
      giantAt,
    });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const { order, bolts, giant, giantAt } = states.get(r)!;
    if (ms < FORK_AT) {
      // crackling as it charges
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont);
      drawStrike(ctx, ORIGIN, 0.5 + 0.5 * Math.random(), 2.2, now);
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < order.length; k++) {
      const at = bars[order[k]];
      const since = ms - strikeAt(k);
      if (since < -40) continue;
      if (since < BOLT_MS) {
        const bolt = bolts[k];
        bolt.to.x = at.x;
        bolt.to.y = at.y;
        drawBolt(ctx, bolt, 1 - clamp01(since / BOLT_MS), 1.3);
      }
      // the charged button crackling till the giant lands
      if (since >= 0 && ms < giantAt + GIANT_MS)
        drawStrike(ctx, at, 0.35 + 0.35 * Math.random(), 0.9, now);
    }
    const g = ms - giantAt;
    if (g >= -60 && g < GIANT_MS) {
      skyOf(r, bars[0], giant.from);
      giant.to.x = bars[0].x;
      giant.to.y = bars[0].y;
      drawBolt(ctx, giant, 1 - clamp01(g / GIANT_MS), GIANT_WIDTH);
      if (g >= 0) drawStrike(ctx, bars[0], 1 - g / GIANT_MS, 3, now);
    }
    ctx.restore();
    for (let k = 0; k < order.length; k++)
      drawDetonation(ctx, bars[order[k]], ms - strikeAt(k), BLAST, now);
    drawDetonation(ctx, bars[0], g, GIANT_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 2.8 : step === 1 ? 1 : 0.7),
});
