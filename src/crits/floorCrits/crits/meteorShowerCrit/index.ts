// the meteorShower floor crit: a hail of meteors, the last huge one into its own bar
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  along,
  drawPays,
} from "../../critPlayer";
import {
  quadratic,
  METEOR_LIFT_MS,
  METEOR_SHAKE,
  METEOR_PAYS,
  METEOR_FONT,
  holeHash,
} from "../../critPlayer/shared";

// a hail of meteors streaking in from the top corner onto the bars, then one
// huge one into its own; step 1 marks the huge one
const SHOWER_METEORS = 20;
const SHOWER_EVERY_MS = 50;
const SHOWER_FALL_MS = 700;
const SHOWER_LAST_DELAY_MS = 120;
// big glowing balls trailing their tails, like the volcano's blobs
const SHOWER_SIZE = 1.6;
const SHOWER_HEAT = 0.8;
const SHOWER_BIG_SIZE = 3;
const SHOWER_BLAST = 90;
const SHOWER_BIG_BLAST = 400;
const SHOWER_SHAKE = 0.25;
const SHOWER_TAIL_MS = 900;
const showerStarts = (i: number) =>
  METEOR_LIFT_MS +
  i * SHOWER_EVERY_MS +
  (i === SHOWER_METEORS - 1 ? SHOWER_LAST_DELAY_MS : 0);
// meteor i's bar, where along it (-1..1), where it comes in from (just over
// the top bar, so its whole fall is in view) and the pull that curves it
const showerMeteor = (r: Running, bars: Point[], i: number) => {
  const last = i === SHOWER_METEORS - 1;
  const bar = last ? 0 : i % bars.length;
  const w = r.viewportWidth;
  const top = Math.min(...bars.map((b) => b.y));
  const to = last ? bars[0] : along(r, bars, bar, holeHash(i, 21) * 2 - 1);
  const from = {
    x: w * (0.25 + 0.3 * holeHash(i, 22)),
    y: top - w * (0.35 + 0.2 * holeHash(i, 23)),
  };
  return {
    last,
    to,
    from,
    pull: { x: (from.x + to.x) / 2 + w * 0.2, y: from.y - w * 0.15 },
  };
};

registerFloorCrit("meteorShowerCrit", {
  plan(_r, bars, hit) {
    for (let i = 0; i < SHOWER_METEORS; i++) {
      const last = i === SHOWER_METEORS - 1;
      hit(
        last ? 0 : i % bars.length,
        showerStarts(i) + SHOWER_FALL_MS,
        last ? 1 : 0,
      );
    }
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    if (ms < METEOR_LIFT_MS) {
      // thrown up off the top into the sky the meteors come down from
      const p = (ms / METEOR_LIFT_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, w * 0.4 * p, -w * 1.2 * p, r.flashFont, {
        along: -Math.PI / 3,
        stretch: 1 + p,
        alpha: 1 - p,
      });
    }
    for (let i = 0; i < SHOWER_METEORS; i++) {
      const starts = showerStarts(i);
      const hits = starts + SHOWER_FALL_MS;
      if (ms < starts || ms > hits + DETONATION_MS) continue;
      const m = showerMeteor(r, bars, i);
      drawWispBetween(
        ctx,
        (t) => {
          const p = clamp01((t - starts) / SHOWER_FALL_MS);
          return quadratic(m.from, m.pull, m.to, p);
        },
        ms,
        now,
        WISP_SIZE * (m.last ? SHOWER_BIG_SIZE : SHOWER_SIZE),
        m.last ? 1 : SHOWER_HEAT,
        starts,
        hits,
      );
      drawDetonation(
        ctx,
        m.to,
        ms - hits,
        m.last ? SHOWER_BIG_BLAST : SHOWER_BLAST,
        now,
      );
      if (m.last)
        drawPays(
          ctx,
          r,
          METEOR_PAYS,
          bars[0],
          ms - hits,
          METEOR_FONT,
          SHOWER_TAIL_MS,
        );
    }
  },
  tailMs: SHOWER_TAIL_MS,
  shake: (step) => step ? METEOR_SHAKE : SHOWER_SHAKE,
});
