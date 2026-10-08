// the supernova floor crit: a star going supernova, its shards slamming into the bars
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { registerFloorCrit, clamp01, drawText, along } from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

// a star swelling where the number is, pulsing ever faster, then going
// supernova, two shards slamming into each bar
const NOVA_SWELL_MS = 900;
const NOVA_SHARDS_PER_BAR = 2;
const NOVA_FLY_MS = 260;
const NOVA_SIZE = 5;
const NOVA_BLAST = 380;
const NOVA_SHAKE = 2.4;
const NOVA_SHARD_SIZE = 1.3;
const NOVA_SHARD_BLAST = 160;
const NOVA_SHARD_SHAKE = 0.4;
const NOVA_TAIL_MS = 600;
const novaHits = (i: number) => NOVA_SWELL_MS + NOVA_FLY_MS + (i % 3) * 30;

registerFloorCrit("supernovaCrit", {
  plan(_r, bars, hit) {
    for (let i = 0; i < bars.length * NOVA_SHARDS_PER_BAR; i++)
      hit(i % bars.length, novaHits(i));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const center = { x: 0, y: 0 };
    if (ms < NOVA_SWELL_MS) {
      // the number collapsing into a star that swells, pulsing ever faster
      const u = ms / NOVA_SWELL_MS;
      const gulp = clamp01(u * 4);
      if (gulp < 1)
        drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - gulp));
      drawWispBetween(
        ctx,
        () => center,
        ms,
        now,
        WISP_SIZE * (1 + NOVA_SIZE * u * u) * (1 + 0.25 * Math.sin(u * u * 60)),
        u,
        0,
        NOVA_SWELL_MS,
      );
    }
    const since = ms - NOVA_SWELL_MS;
    if (since >= 0 && r.kicked === 0) {
      r.kicked = 1;
      r.shake(NOVA_SHAKE);
    }
    drawDetonation(ctx, center, since, NOVA_BLAST, now);
    for (let i = 0; i < bars.length * NOVA_SHARDS_PER_BAR; i++) {
      const hits = novaHits(i);
      if (ms < NOVA_SWELL_MS || ms > hits + DETONATION_MS) continue;
      const to = along(r, bars, i % bars.length, holeHash(i, 41) * 2 - 1);
      drawWispBetween(
        ctx,
        (t) => {
          const p =
            clamp01((t - NOVA_SWELL_MS) / (hits - NOVA_SWELL_MS)) ** 0.8;
          return { x: to.x * p, y: to.y * p };
        },
        ms,
        now,
        WISP_SIZE * NOVA_SHARD_SIZE,
        0.8,
        NOVA_SWELL_MS,
        hits,
      );
      drawDetonation(ctx, to, ms - hits, NOVA_SHARD_BLAST, now);
    }
  },
  tailMs: NOVA_TAIL_MS,
  shake: () => NOVA_SHARD_SHAKE,
});
