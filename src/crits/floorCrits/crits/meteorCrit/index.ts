// the meteor floor crit: a meteor slamming into one bar
import { drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  drawText,
  along,
  drawPays,
} from "../../critPlayer";
import {
  METEOR_LIFT_MS,
  METEOR_SHAKE,
  METEOR_PAYS,
  METEOR_FONT,
} from "../../critPlayer/shared";

const METEOR_FALL_MS = 380;
const METEOR_HIT_MS = METEOR_LIFT_MS + METEOR_FALL_MS;
const METEOR_EASE = 1.6;
const METEOR_SIZE = 3;
const METEOR_BLAST = 240;
const METEOR_CLUSTER = [
  { dx: -150, dy: -40, at: 70, size: 130 },
  { dx: 130, dy: 30, at: 120, size: 130 },
  { dx: -40, dy: 60, at: 170, size: 130 },
];
const METEOR_CLUSTER_SHAKE = 0.8;
const METEOR_TAIL_MS = 900;

registerFloorCrit("meteorCrit", {
  plan(_r, bars, hit) {
    // any bar in view but its own, if there's one
    hit(
      bars.length > 1 ? 1 + Math.floor(Math.random() * (bars.length - 1)) : 0,
      METEOR_HIT_MS,
    );
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    if (ms < METEOR_LIFT_MS) {
      // thrown up off the top into the sky the meteor comes down from
      const p = (ms / METEOR_LIFT_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, w * 0.4 * p, -w * 1.2 * p, r.flashFont, {
        along: -Math.PI / 3,
        stretch: 1 + p,
        alpha: 1 - p,
      });
    }
    const target = r.hits[0].bar;
    const to = along(r, bars, target, 0.4);
    const top = Math.min(...bars.map((b) => b.y));
    const from = { x: w * 0.9, y: top - w * 1.1 };
    const meteorAt = (t: number) => {
      const p = clamp01((t - METEOR_LIFT_MS) / METEOR_FALL_MS) ** METEOR_EASE;
      return { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p) };
    };
    drawWispBetween(
      ctx,
      meteorAt,
      ms,
      now,
      WISP_SIZE * METEOR_SIZE,
      1,
      METEOR_LIFT_MS,
      METEOR_HIT_MS,
    );
    // the crater: one big blast, then more going off round it
    const since = ms - METEOR_HIT_MS;
    drawDetonation(ctx, to, since, METEOR_BLAST, now);
    METEOR_CLUSTER.forEach((c, i) => {
      if (since >= c.at && r.kicked === i) {
        r.kicked++;
        r.shake(METEOR_CLUSTER_SHAKE);
      }
      drawDetonation(
        ctx,
        { x: to.x + c.dx, y: to.y + c.dy },
        since - c.at,
        c.size,
        now,
      );
    });
    drawPays(
      ctx,
      r,
      METEOR_PAYS,
      bars[target],
      since,
      METEOR_FONT,
      METEOR_TAIL_MS,
    );
  },
  tailMs: METEOR_TAIL_MS,
  shake: () => METEOR_SHAKE,
});
