// Raindrops, a floor crit: drops of light fall from just over the bars and
// splash onto them, each throwing a ring rippling out along its bar and that
// bar's levels at once; the drizzle quickens to a downpour over every bar,
// then one huge drop hits its own bar in a crown of glitter, a wide double
// ring and a big blast
import {
  drawDrop,
  drawRipple,
  drawSplash,
  rainTimes,
} from "../../../../shared/animationStyles/ripple";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
} from "../../critPlayer";
import { BAR_HALF_H, holeHash, otherBars } from "../../critPlayer/shared";

// the number lifting over the bars and fading as the drops start
const IN_MS = 240;
const IN_RISE = 260;
// the drops: DROPS over the other bars, quickening, each falling FALL px in
// FALL_MS from just over its bar
const DROPS = 22;
const GAPS: [number, number] = [130, 38];
const FALL = 240;
const FALL_MS = 150;
const DROP = 44;
const RIPPLE = 300;
const RIPPLE_W = 16;
const SPLASH = 26;
const INSET = 140;
// the huge drop onto its own bar, from higher, BIG_GAP_MS after the last
const BIG_GAP_MS = 160;
const BIG_FALL = 420;
const BIG_FALL_MS = 260;
const BIG_DROP = 70;
const BIG_RIPPLE = 520;
const BIG_RIPPLE_W = 26;
const BIG_RIPPLE_MS = 700;
const BIG_SPLASH = 34;
const BIG_SPLASH_N = 14;
const BIG_SPLASH_MS = 600;
const BIG_BLAST = 220;
const CLUSTER = [-0.6, 0.6, -0.3, 0.3];
const CLUSTER_GAP_MS = 45;
const CLUSTER_BLAST = 100;
// shakes by step: a drop, the huge drop
const SHAKES = [0.35, 2.8];
const TAIL_MS = 900;

interface Drop {
  bar: number;
  side: number;
  at: number;
}
interface Rain {
  drops: Drop[];
  bigAt: number;
}
const rains = new WeakMap<Running, Rain>();
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("raindropsCrit", {
  // about seven drops splash onto each bar; the huge one onto its own
  // lands half
  levels: (count, step) => Math.ceil(count / (step ? 2 : 7)),
  plan(r, bars, hit) {
    const others = otherBars(bars);
    const times = rainTimes(DROPS, IN_MS, GAPS);
    const drops = times.map((at, k) => ({
      bar: others[k % others.length],
      side: holeHash(k, 1810) * 1.6 - 0.8,
      at,
    }));
    const bigAt = times[times.length - 1] + BIG_GAP_MS;
    rains.set(r, { drops, bigAt });
    for (const d of drops) hit(d.bar, d.at, 0);
    hit(0, bigAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const rain = rains.get(r);
    if (!rain) return;
    const now = r.startedAt + ms;
    const reach = r.play.barHalfWidth - INSET;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, -IN_RISE * p, r.flashFont, {
        alpha: 1 - p,
      });
    }

    // the rings first, then the drops and splashes over them
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (const d of rain.drops) {
      spot.x = bars[d.bar].x + d.side * reach;
      spot.y = bars[d.bar].y + BAR_HALF_H;
      drawRipple(ctx, spot, ms - d.at, RIPPLE, RIPPLE_W);
    }
    spot.x = bars[0].x;
    spot.y = bars[0].y + BAR_HALF_H;
    drawRipple(
      ctx,
      spot,
      ms - rain.bigAt,
      BIG_RIPPLE,
      BIG_RIPPLE_W,
      2,
      BIG_RIPPLE_MS,
    );
    beginLightBatch(ctx);
    for (const d of rain.drops) {
      spot.x = bars[d.bar].x + d.side * reach;
      spot.y = bars[d.bar].y;
      drawDrop(ctx, spot, d.at - ms, FALL_MS, FALL, DROP);
      drawSplash(ctx, spot, ms - d.at, SPLASH);
    }
    spot.x = bars[0].x;
    spot.y = bars[0].y;
    drawDrop(ctx, spot, rain.bigAt - ms, BIG_FALL_MS, BIG_FALL, BIG_DROP);
    drawSplash(
      ctx,
      spot,
      ms - rain.bigAt,
      BIG_SPLASH,
      BIG_SPLASH_N,
      BIG_SPLASH_MS,
    );
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    drawDetonation(ctx, bars[0], ms - rain.bigAt, BIG_BLAST, now);
    for (let k = 0; k < CLUSTER.length; k++) {
      spot.x = bars[0].x + CLUSTER[k] * reach;
      spot.y = bars[0].y;
      drawDetonation(
        ctx,
        spot,
        ms - rain.bigAt - (k + 1) * CLUSTER_GAP_MS,
        CLUSTER_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
