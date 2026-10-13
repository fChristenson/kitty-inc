// Overclock, a rate crit: a bolt cracks down onto each bar's left end from
// just over it, quicker each, the crit's own last, and crackles along it to
// the far end, where the bar's readout turns over onto twice its rate; the
// bolt keeps flickering along it while the crit plays out
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { drawDetonation } from "../../../../shared/explosion";
import {
  registerFloorCrit,
  type Point,
  type Running,
  byHeight,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const FIRST = 120;
// each strike this much sooner after the last, down to MIN_GAP
const GAP = 170;
const GAP_DROP = 30;
const MIN_GAP = 70;
const DROP_MS = 200;
const CRAWL_MS = 220;
// the bolt comes down from this far over the bar's left end, a little out
const SKY = 260;
const SKEW = 60;
const INSET = 40;
const STRIKE_BLAST = 80;
const OWN_STRIKE_BLAST = 130;
const END_BLAST = 60;
const OWN_END_BLAST = 170;
const TAIL_MS = 700;

interface State {
  // the others top to bottom, then the crit's own
  order: number[];
  strikes: number[];
  drops: Bolt[];
  runs: Bolt[];
}

const states = new WeakMap<Running, State>();
const head: Point = { x: 0, y: 0 };
const left: Point = { x: 0, y: 0 };
const right: Point = { x: 0, y: 0 };

registerFloorCrit("overclockCrit", {
  plan(r, bars, hit) {
    const order = [...byHeight(bars).filter((bar) => bar !== 0), 0];
    const strikes: number[] = [];
    let t = FIRST;
    order.forEach((bar, k) => {
      strikes.push(t);
      hit(bar, t, 0);
      hit(bar, t + CRAWL_MS, bar === 0 ? 2 : 1);
      t += Math.max(MIN_GAP, GAP - GAP_DROP * k);
    });
    const half = r.play.barHalfWidth - INSET;
    states.set(r, {
      order,
      strikes,
      drops: order.map(() =>
        createBolt({ x: -SKEW, y: -SKY }, { x: 0, y: 0 }, 1),
      ),
      runs: order.map(() =>
        createBolt({ x: -half, y: 0 }, { x: half, y: 0 }, 0),
      ),
    });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const { order, strikes, drops, runs } = states.get(r)!;
    const half = r.play.barHalfWidth - INSET;
    if (ms < FIRST)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / FIRST,
      });
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < order.length; k++) {
      const since = ms - strikes[k];
      if (since < -40) continue;
      const at = bars[order[k]];
      const drop = drops[k];
      drop.from.x = at.x - half - SKEW;
      drop.from.y = at.y - SKY;
      drop.to.x = at.x - half;
      drop.to.y = at.y;
      if (since < DROP_MS)
        drawBolt(ctx, drop, 1 - clamp01(since / DROP_MS), 1.4);
      if (since < 0) continue;
      const run = runs[k];
      run.from.x = at.x - half;
      run.from.y = at.y;
      run.to.x = at.x + half;
      run.to.y = at.y;
      const crawling = since < CRAWL_MS;
      drawBolt(
        ctx,
        run,
        crawling ? 1 : 0.25 + 0.2 * Math.sin(now * 0.05 + k),
        0.9,
      );
      if (crawling) {
        head.x = lerp(run.from.x, run.to.x, since / CRAWL_MS);
        head.y = at.y;
        drawStrike(ctx, head, 1, 1.2, now);
      }
    }
    ctx.restore();
    for (let k = 0; k < order.length; k++) {
      const at = bars[order[k]];
      const own = order[k] === 0;
      left.x = at.x - half;
      left.y = at.y;
      right.x = at.x + half;
      right.y = at.y;
      const since = ms - strikes[k];
      drawDetonation(
        ctx,
        left,
        since,
        own ? OWN_STRIKE_BLAST : STRIKE_BLAST,
        now,
      );
      drawDetonation(
        ctx,
        right,
        since - CRAWL_MS,
        own ? OWN_END_BLAST : END_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 2.8 : step === 1 ? 1 : 0.7),
});
