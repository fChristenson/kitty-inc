// the binaryStar floor crit: two suns circling into a collision, flinging blobs onto the bars
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { registerFloorCrit, clamp01, drawText, along } from "../../critPlayer";
import { quadratic, holeHash } from "../../critPlayer/shared";

// the number splitting into two suns that circle each other, closer and
// faster, trailing spirals, until they collide, flinging glowing blobs in
// arcs onto the bars, two onto each
const BINARY_MS = 1200;
const BINARY_SPLIT_MS = 150;
// how far apart they start, of the viewport's width, and squashed how flat
const BINARY_GAP = 0.42;
const BINARY_SQUASH = 0.6;
const BINARY_SUN_SIZE = 2.2;
const BINARY_BLAST = 170;
const BINARY_SHAKE = 2.4;
const BINARY_BLOBS_PER_BAR = 2;
const BINARY_FLY_MS = 520;
const BINARY_BLOB_SIZE = 1.6;
const BINARY_BLOB_BLAST = 160;
const BINARY_BLOB_SHAKE = 0.5;
const BINARY_TAIL_MS = 600;
const binaryAngle = (ms: number) => {
  const s = ms / 1000;
  return Math.PI * 2 * (0.5 * s + 2.4 * s * s);
};
const binaryHits = (i: number) => BINARY_MS + BINARY_FLY_MS + (i % 3) * 40;

registerFloorCrit("binaryStarCrit", {
  plan(_r, bars, hit) {
    for (let i = 0; i < bars.length * BINARY_BLOBS_PER_BAR; i++)
      hit(i % bars.length, binaryHits(i));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    // the number shrinking away as it splits into the two suns
    const split = clamp01(ms / BINARY_SPLIT_MS);
    if (split < 1)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - split));
    const sun = (side: number) => (t: number) => {
      const u = clamp01(t / BINARY_MS);
      const radius =
        ((w * BINARY_GAP) / 2) * (1 - u * u) * clamp01(t / BINARY_SPLIT_MS);
      const a = binaryAngle(Math.min(t, BINARY_MS)) + side * Math.PI;
      return {
        x: Math.cos(a) * radius,
        y: Math.sin(a) * radius * BINARY_SQUASH,
      };
    };
    for (const side of [0, 1])
      drawWispBetween(
        ctx,
        sun(side),
        ms,
        now,
        WISP_SIZE * BINARY_SUN_SIZE,
        0.6 + 0.4 * clamp01(ms / BINARY_MS),
        0,
        BINARY_MS,
      );
    // their collision
    const since = ms - BINARY_MS;
    if (since >= 0 && r.kicked === 0) {
      r.kicked = 1;
      r.shake(BINARY_SHAKE);
    }
    drawDetonation(ctx, { x: 0, y: 0 }, since, BINARY_BLAST, now);
    // glowing blobs flung out in high arcs onto the bars
    for (let i = 0; i < bars.length * BINARY_BLOBS_PER_BAR; i++) {
      const hits = binaryHits(i);
      if (since < 0 || ms > hits + DETONATION_MS) continue;
      const to = along(r, bars, i % bars.length, holeHash(i, 61) * 2 - 1);
      const pull = {
        x: (holeHash(i, 62) - 0.5) * w * 0.7,
        y: Math.min(0, to.y) - w * (0.4 + 0.25 * holeHash(i, 63)),
      };
      drawWispBetween(
        ctx,
        (t) =>
          quadratic(
            { x: 0, y: 0 },
            pull,
            to,
            clamp01((t - BINARY_MS) / (hits - BINARY_MS)),
          ),
        ms,
        now,
        WISP_SIZE * BINARY_BLOB_SIZE,
        0.8,
        BINARY_MS,
        hits,
      );
      drawDetonation(ctx, to, ms - hits, BINARY_BLOB_BLAST, now);
    }
  },
  tailMs: BINARY_TAIL_MS,
  shake: () => BINARY_BLOB_SHAKE,
});
