// the quake floor crit: the number slams into the ground and a quake ripples
// up the building, every bar in view leaping off its floor and crashing back
// down in turn
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  byHeight,
  drawText,
} from "../../critPlayer";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const QUAKE_DROP_MS = 260;
const QUAKE_DELAY_MS = 120;
const QUAKE_EVERY_MS = 170;
const QUAKE_LEAP_MS = 260;
// the ground: below the lowest bar, kept in view (of the viewport's width)
const QUAKE_DEPTH = 300;
const QUAKE_LOWEST = 0.9;
const QUAKE_SLAM_BLAST = 440;
const QUAKE_SLAM_SHAKE = 2.8;
// the shockwave rolling out along the ground: glints on a flat ring
const QUAKE_RING_SPEED = 1.6;
const QUAKE_RING_MS = 600;
const QUAKE_RING_FLAT = 0.25;
const QUAKE_RING_GLINTS = 28;
const QUAKE_RING_GLINT = 34;
const QUAKE_BLAST = 150;
const QUAKE_SHAKE = 1.1;
const QUAKE_TAIL_MS = 800;

const ground = (r: Running, bars: Point[]): Point => ({
  x: bars[0].x,
  y: Math.min(
    Math.max(...bars.map((b) => b.y)) + QUAKE_DEPTH,
    r.viewportWidth * QUAKE_LOWEST,
  ),
});
// the k-th bar from the bottom leaps, then crashes down QUAKE_LEAP_MS later
const leapsAt = (k: number) =>
  QUAKE_DROP_MS + QUAKE_DELAY_MS + k * QUAKE_EVERY_MS;

registerFloorCrit("quakeCrit", {
  plan(_r, bars, hit, lift) {
    byHeight(bars)
      .reverse()
      .forEach((bar, k) => {
        lift(bar, leapsAt(k), QUAKE_LEAP_MS);
        hit(bar, leapsAt(k) + QUAKE_LEAP_MS);
      });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const g = ground(r, bars);
    if (ms < QUAKE_DROP_MS) {
      // falling, stretching as it goes
      const p = (ms / QUAKE_DROP_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, g.x * p, g.y * p, r.flashFont, {
        sx: 1 - 0.15 * p,
        sy: 1 + 0.4 * p,
      });
    }
    const since = ms - QUAKE_DROP_MS;
    if (since >= 0 && r.kicked === 0) {
      r.kicked = 1;
      r.shake(QUAKE_SLAM_SHAKE);
      playExplosion();
    }
    drawDetonation(ctx, g, since, QUAKE_SLAM_BLAST, now);
    if (since >= 0 && since < QUAKE_RING_MS) {
      const radius = since * QUAKE_RING_SPEED;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      ctx.globalAlpha = 1 - since / QUAKE_RING_MS;
      for (let i = 0; i < QUAKE_RING_GLINTS; i++) {
        const a = (i / QUAKE_RING_GLINTS) * Math.PI * 2;
        stampGlimmer(
          ctx,
          g.x + Math.cos(a) * radius,
          g.y + Math.sin(a) * radius * QUAKE_RING_FLAT,
          QUAKE_RING_GLINT,
          a + since * 0.01,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.globalAlpha = 1;
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    byHeight(bars)
      .reverse()
      .forEach((bar, k) =>
        drawDetonation(
          ctx,
          bars[bar],
          ms - leapsAt(k) - QUAKE_LEAP_MS,
          lerp(
            QUAKE_BLAST,
            QUAKE_BLAST * 1.4,
            k / Math.max(1, bars.length - 1),
          ),
          now,
        ),
      );
  },
  tailMs: QUAKE_TAIL_MS,
  shake: () => QUAKE_SHAKE,
});
