// the pearls floor crit: a chain of fragments sweeping into the bars, bigger each time
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";
import { quadratic, METEOR_LIFT_MS, holeHash } from "../../critPlayer/shared";

// the number thrown off the top, torn into a chain of glowing fragments that
// sweep in from the top corner one behind another, two onto each bar (top to
// bottom, twice over), each bigger than the last; step is its place in line
const PEARLS_PER_BAR = 2;
const PEARL_EVERY_MS = 95;
const PEARL_FALL_MS = 650;
const PEARL_SIZE = 1;
const PEARL_GROW = 0.12;
const PEARL_BLAST = 70;
const PEARL_BLAST_STEP = 18;
const PEARL_SHAKE = 0.3;
const PEARL_SHAKE_STEP = 0.12;
const PEARL_TAIL_MS = 600;
const pearlStarts = (k: number) => METEOR_LIFT_MS + k * PEARL_EVERY_MS;
// pearl k's bar (top to bottom, round and round) and where along it
const pearlBar = (bars: Point[], k: number) => {
  const order = byHeight(bars);
  return order[k % order.length];
};

registerFloorCrit("pearlsCrit", {
  plan(_r, bars, hit) {
    for (let k = 0; k < bars.length * PEARLS_PER_BAR; k++)
      hit(pearlBar(bars, k), pearlStarts(k) + PEARL_FALL_MS, k);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    if (ms < METEOR_LIFT_MS) {
      // thrown up off the top into the sky the chain comes down from
      const p = (ms / METEOR_LIFT_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, w * 0.4 * p, -w * 1.2 * p, r.flashFont, {
        along: -Math.PI / 3,
        stretch: 1 + p,
        alpha: 1 - p,
      });
    }
    const top = Math.min(...bars.map((b) => b.y));
    const from = { x: w * 0.75, y: top - w * 0.6 };
    for (let k = 0; k < bars.length * PEARLS_PER_BAR; k++) {
      const starts = pearlStarts(k);
      const hits = starts + PEARL_FALL_MS;
      if (ms < starts || ms > hits + DETONATION_MS) continue;
      const to = along(r, bars, pearlBar(bars, k), holeHash(k, 81) * 2 - 1);
      const pull = { x: w * 0.4, y: Math.min(to.y, top) - w * 0.15 };
      drawWispBetween(
        ctx,
        (t) => quadratic(from, pull, to, clamp01((t - starts) / PEARL_FALL_MS)),
        ms,
        now,
        WISP_SIZE * (PEARL_SIZE + PEARL_GROW * k),
        0.8,
        starts,
        hits,
      );
      drawDetonation(
        ctx,
        to,
        ms - hits,
        PEARL_BLAST + PEARL_BLAST_STEP * k,
        now,
      );
    }
  },
  tailMs: PEARL_TAIL_MS,
  shake: (step) => PEARL_SHAKE + PEARL_SHAKE_STEP * step,
});
