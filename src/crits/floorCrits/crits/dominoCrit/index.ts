// the domino floor crit: its number diving into the lowest bar, knocking up bar to bar
import { drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  FLOOR_CRIT_FONT,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
  drawPays,
} from "../../critPlayer";

// the number diving into the lowest bar in view, whose payout knocks up into
// the bar above, and on up, faster and paying a step more each time
const DOMINO_DIVE_MS = 180;
const DOMINO_FIRST_GAP_MS = 260;
const DOMINO_SPEEDUP = 0.78;
const DOMINO_MIN_GAP_MS = 110;
const DOMINO_ARC = 220;
const DOMINO_BLAST = 130;
const DOMINO_BLAST_STEP = 40;
const DOMINO_SHAKE = 0.5;
const DOMINO_SHAKE_STEP = 0.25;
const DOMINO_FONT = 110;
const DOMINO_TAIL_MS = 800;
const dominoGap = (k: number) =>
  Math.max(DOMINO_MIN_GAP_MS, DOMINO_FIRST_GAP_MS * DOMINO_SPEEDUP ** k);
// when the k-th bar up is knocked
const dominoAt = (k: number) => {
  let at = DOMINO_DIVE_MS;
  for (let i = 0; i < k; i++) at += dominoGap(i);
  return at;
};

registerFloorCrit("dominoCrit", {
  plan(_r, bars, hit) {
    // bottom to top; step is how many it has knocked before
    byHeight(bars)
      .reverse()
      .forEach((bar, k) => hit(bar, dominoAt(k), k));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars).reverse();
    // each knock lands on alternate ends of its bar
    const spot = (k: number) => along(r, bars, order[k], k % 2 ? -0.7 : 0.7);
    if (ms < DOMINO_DIVE_MS) {
      // diving into the lowest bar, faster and faster
      const p = (ms / DOMINO_DIVE_MS) ** 2;
      const to = spot(0);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        to.x * p,
        to.y * p,
        lerp(r.flashFont, FLOOR_CRIT_FONT, p),
        { rot: p * 4 },
      );
    }
    order.forEach((_, k) => {
      const at = dominoAt(k);
      if (k > 0) {
        // knocked up off the bar below in an arc, speeding into this one
        const from = spot(k - 1);
        const to = spot(k);
        const gap = dominoGap(k - 1);
        drawWispBetween(
          ctx,
          (t) => {
            const p = clamp01((t - (at - gap)) / gap) ** 1.3;
            return {
              x: lerp(from.x, to.x, p),
              y: lerp(from.y, to.y, p) - DOMINO_ARC * Math.sin(Math.PI * p),
            };
          },
          ms,
          now,
          WISP_SIZE * (1.2 + 0.3 * k),
          Math.min(1, 0.3 + 0.2 * k),
          at - gap,
          at,
        );
      }
      const last = k === order.length - 1;
      drawDetonation(
        ctx,
        spot(k),
        ms - at,
        (DOMINO_BLAST + DOMINO_BLAST_STEP * k) * (last ? 1.5 : 1),
        now,
      );
      drawPays(
        ctx,
        r,
        `x${k + 1}`,
        bars[order[k]],
        ms - at,
        DOMINO_FONT + 15 * k,
        DOMINO_TAIL_MS,
      );
    });
  },
  tailMs: DOMINO_TAIL_MS,
  shake: (step) => DOMINO_SHAKE + DOMINO_SHAKE_STEP * step,
});
