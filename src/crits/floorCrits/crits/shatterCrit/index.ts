// the shatter floor crit: the number cracks and shatters into shards that
// spin off and embed in every bar in view, then every shard detonates at once
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { quadratic, holeHash } from "../../critPlayer/shared";

const SHATTER_CRACK_MS = 350;
const SHATTER_FLY_MS = 380;
const SHATTER_STAGGER_MS = 25;
const SHATTER_DETONATE_MS = 1350;
const SHATTER_PER_BAR = 3;
const SHATTER_LEAST = 9;
// trembling as it cracks: px it shakes, how much it swells and turns
const SHATTER_TREMBLE = 30;
const SHATTER_SWELL = 0.1;
const SHATTER_TWIST = 0.15;
const SHATTER_CRACK_BLAST = 320;
const SHATTER_CRACK_SHAKE = 2.2;
// the arcs the shards spin off along before they embed
const SHATTER_PULL: Point = { x: 500, y: 400 };
const SHATTER_SHARD = 70;
const SHATTER_EMBED_BLAST = 60;
const SHATTER_BLAST = 150;
const SHATTER_EMBED_SHAKE = 0.3;
const SHATTER_SHAKE = 1;
const SHATTER_TAIL_MS = 900;

const shardsOf = (bars: number) =>
  Math.max(SHATTER_LEAST, SHATTER_PER_BAR * bars);
const embedsAt = (i: number) =>
  SHATTER_CRACK_MS + SHATTER_FLY_MS + (i % 4) * SHATTER_STAGGER_MS;
const shardTo = (r: Running, bars: Point[], i: number) =>
  along(r, bars, i % bars.length, holeHash(i, 51) * 2 - 1);

registerFloorCrit("shatterCrit", {
  plan(_r, bars, hit) {
    for (let i = 0; i < shardsOf(bars.length); i++) {
      hit(i % bars.length, embedsAt(i));
      hit(i % bars.length, SHATTER_DETONATE_MS, 1);
    }
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const center = { x: 0, y: 0 };
    if (ms < SHATTER_CRACK_MS) {
      const k = ms / SHATTER_CRACK_MS;
      const j = Math.floor(ms / 30);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        (holeHash(j, 2) - 0.5) * SHATTER_TREMBLE * k,
        (holeHash(j, 3) - 0.5) * SHATTER_TREMBLE * k,
        r.flashFont * (1 + SHATTER_SWELL * k),
        { rot: (holeHash(j, 4) - 0.5) * SHATTER_TWIST * k },
      );
    }
    if (ms >= SHATTER_CRACK_MS && r.kicked === 0) {
      r.kicked = 1;
      r.shake(SHATTER_CRACK_SHAKE);
      playExplosion();
    }
    drawDetonation(
      ctx,
      center,
      ms - SHATTER_CRACK_MS,
      SHATTER_CRACK_BLAST,
      now,
    );
    const count = shardsOf(bars.length);
    if (ms >= SHATTER_CRACK_MS && ms < SHATTER_DETONATE_MS) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < count; i++) {
        const embeds = embedsAt(i);
        const p = clamp01(
          (ms - SHATTER_CRACK_MS) / (embeds - SHATTER_CRACK_MS),
        );
        const a = (i / count) * Math.PI * 2;
        const pull = {
          x: Math.cos(a) * SHATTER_PULL.x,
          y: Math.sin(a) * SHATTER_PULL.y,
        };
        const at = quadratic(
          center,
          pull,
          shardTo(r, bars, i),
          1 - (1 - p) ** 2,
        );
        // once embedded, pulsing ever faster as the blast nears
        const held = ms - embeds;
        const pulse =
          p < 1
            ? 1
            : 0.7 +
              0.3 *
                Math.sin(
                  held *
                    (0.01 + (0.02 * held) / (SHATTER_DETONATE_MS - embeds)),
                );
        stampGlimmer(
          ctx,
          at.x,
          at.y,
          SHATTER_SHARD * pulse,
          (ms - SHATTER_CRACK_MS) * (holeHash(i, 52) - 0.5) * 0.06,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.globalCompositeOperation = previous;
    }
    for (let i = 0; i < count; i++) {
      const to = shardTo(r, bars, i);
      drawDetonation(ctx, to, ms - embedsAt(i), SHATTER_EMBED_BLAST, now);
      drawDetonation(ctx, to, ms - SHATTER_DETONATE_MS, SHATTER_BLAST, now);
    }
  },
  tailMs: SHATTER_TAIL_MS,
  shake: (step) => (step ? SHATTER_SHAKE : SHATTER_EMBED_SHAKE),
});
