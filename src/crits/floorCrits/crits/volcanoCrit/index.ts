// the volcano floor crit: an eruption under the bars flinging glowing blobs onto them
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  FLOOR_CRIT_FONT,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { quadratic, holeHash } from "../../critPlayer/shared";

// the number diving into a vent under the lowest bar, which erupts twice,
// flinging glowing blobs in high arcs down onto the bars
const VOLCANO_DIVE_MS = 220;
const VOLCANO_AGAIN_MS = 1150;
const VOLCANO_BLOBS = 12;
const VOLCANO_EVERY_MS = 45;
const VOLCANO_FLY_MS = 700;
const VOLCANO_DEPTH = 300;
const VOLCANO_BLAST = 260;
const VOLCANO_BIG_BLAST = 360;
const VOLCANO_SHAKE = 1.4;
const VOLCANO_BIG_SHAKE = 2.2;
const VOLCANO_BLOB_BLAST = 200;
const VOLCANO_BLOB_SIZE = 1.6;
const VOLCANO_BLOB_SHAKE = 0.6;
const VOLCANO_TAIL_MS = 600;
const volcanoVent = (bars: Point[]): Point => ({
  x: 0,
  y: Math.max(...bars.map((b) => b.y)) + VOLCANO_DEPTH,
});
const volcanoStarts = (i: number) =>
  (i < VOLCANO_BLOBS / 2 ? VOLCANO_DIVE_MS : VOLCANO_AGAIN_MS) +
  (i % (VOLCANO_BLOBS / 2)) * VOLCANO_EVERY_MS;

registerFloorCrit("volcanoCrit", {
  plan(_r, bars, hit) {
    for (let i = 0; i < VOLCANO_BLOBS; i++)
      hit(i % bars.length, volcanoStarts(i) + VOLCANO_FLY_MS);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const vent = volcanoVent(bars);
    if (ms < VOLCANO_DIVE_MS) {
      // diving down into the vent, faster and faster
      const p = (ms / VOLCANO_DIVE_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        vent.x * p,
        vent.y * p,
        lerp(r.flashFont, FLOOR_CRIT_FONT, p),
        { along: Math.PI / 2, stretch: 1 + 0.5 * p },
      );
    }
    // its two eruptions, each with its own shake
    for (const [k, at] of [VOLCANO_DIVE_MS, VOLCANO_AGAIN_MS].entries()) {
      if (ms >= at && r.kicked === k) {
        r.kicked++;
        r.shake(k ? VOLCANO_BIG_SHAKE : VOLCANO_SHAKE);
      }
      drawDetonation(
        ctx,
        vent,
        ms - at,
        k ? VOLCANO_BIG_BLAST : VOLCANO_BLAST,
        now,
      );
    }
    const top = Math.min(...bars.map((b) => b.y));
    for (let i = 0; i < VOLCANO_BLOBS; i++) {
      const starts = volcanoStarts(i);
      const hits = starts + VOLCANO_FLY_MS;
      if (ms < starts || ms > hits + DETONATION_MS) continue;
      const to = along(r, bars, i % bars.length, holeHash(i, 31) * 2 - 1);
      // a high arc, pulled up well over the top bar
      const pull = {
        x:
          (vent.x + to.x) / 2 + (holeHash(i, 32) - 0.5) * r.viewportWidth * 0.3,
        y: top - r.viewportWidth * 0.7,
      };
      drawWispBetween(
        ctx,
        (t) => {
          const p = clamp01((t - starts) / VOLCANO_FLY_MS);
          return quadratic(vent, pull, to, p);
        },
        ms,
        now,
        WISP_SIZE * VOLCANO_BLOB_SIZE,
        0.8,
        starts,
        hits,
      );
      drawDetonation(ctx, to, ms - hits, VOLCANO_BLOB_BLAST, now);
    }
  },
  tailMs: VOLCANO_TAIL_MS,
  shake: () => VOLCANO_BLOB_SHAKE,
});
