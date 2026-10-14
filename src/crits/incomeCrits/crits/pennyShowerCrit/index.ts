// Penny Shower, an income crit: the green amount slams into the readout;
// drops of light fall a short way onto it, each landing in a splash, a flat
// ring rippling out under the readout and a share paid, a drizzle quickening
// to a downpour; then one huge drop falls from high onto its middle with a
// double ring and the biggest blast
import {
  drawDrop,
  drawRipple,
  drawSplash,
  rainTimes,
} from "../../../../shared/animationStyles/ripple";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import {
  registerFloorCrit,
  lerp,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, readoutSpot } from "../shared";

// the amount sliding into the readout, shrinking
const IN_MS = 160;
const IN_SHRINK = 0.4;
const IN_BLAST = 110;
// the drops: DROPS onto spots across the readout, RING_BELOW under it,
// quickening, each falling FALL px over FALL_MS
const DROPS = 16;
const FIRST_MS = IN_MS + 100;
const GAPS: [number, number] = [150, 35];
const RING_BELOW = 30;
const FALL = 220;
const FALL_MS = 180;
const DROP = 36;
const RIPPLE = 170;
const RIPPLE_W = 12;
const SPLASH = 20;
// the huge drop, BIG_GAP_MS after the last
const BIG_GAP_MS = 280;
const BIG_FALL = 600;
const BIG_FALL_MS = 380;
const BIG_DROP = 80;
const BIG_RIPPLE = 520;
const BIG_RIPPLE_W = 26;
const BIG_RIPPLE_MS = 700;
const BIG_SPLASH = 44;
const BIG_SPLASH_N = 12;
const BIG_SPLASH_MS = 500;
// shakes by step: a drop, the amount in, the huge drop
const SHAKES = [0.4, 1.4, 2.4];

interface Plan {
  times: number[];
  spots: Point[];
  bigAt: number;
}
const plans = new WeakMap<Running, Plan>();
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("pennyShowerCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const times = rainTimes(DROPS, FIRST_MS, GAPS);
    const bigAt = times[times.length - 1] + BIG_GAP_MS;
    plans.set(r, {
      times,
      spots: times.map((_, k) => readoutSpot(to, k, 1860)),
      bigAt,
    });
    hit(0, IN_MS, 1);
    for (const at of times) hit(0, at);
    hit(0, bigAt, 2);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, to.x, p),
        lerp(0, to.y, p),
        r.flashFont * lerp(1, IN_SHRINK, p),
      );
    }
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < plan.times.length; k++) {
      spot.x = plan.spots[k].x;
      spot.y = to.y + RING_BELOW;
      drawRipple(ctx, spot, ms - plan.times[k], RIPPLE, RIPPLE_W);
    }
    spot.x = to.x;
    spot.y = to.y + RING_BELOW;
    drawRipple(
      ctx,
      spot,
      ms - plan.bigAt,
      BIG_RIPPLE,
      BIG_RIPPLE_W,
      2,
      BIG_RIPPLE_MS,
    );
    beginLightBatch(ctx);
    for (let k = 0; k < plan.times.length; k++) {
      spot.x = plan.spots[k].x;
      spot.y = to.y + RING_BELOW;
      drawDrop(ctx, spot, plan.times[k] - ms, FALL_MS, FALL, DROP);
      drawSplash(ctx, spot, ms - plan.times[k], SPLASH);
    }
    spot.x = to.x;
    spot.y = to.y + RING_BELOW;
    drawDrop(ctx, spot, plan.bigAt - ms, BIG_FALL_MS, BIG_FALL, BIG_DROP);
    drawSplash(
      ctx,
      spot,
      ms - plan.bigAt,
      BIG_SPLASH,
      BIG_SPLASH_N,
      BIG_SPLASH_MS,
    );
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, to, ms - IN_MS, IN_BLAST, now);
    drawFinale(ctx, to, ms - plan.bigAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
