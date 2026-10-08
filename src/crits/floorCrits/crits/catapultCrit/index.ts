// the catapult floor crit: its number catapulted off the top, crashing down through every bar
import { drawGlow } from "../../../../shared/glowSprite";
import {
  registerFloorCrit,
  type Running,
  lerp,
  clamp01,
  drawText,
  glowStops,
} from "../../critPlayer";

const CATAPULT_UP_MS = 250;
const CATAPULT_AWAY_MS = 150;
const CATAPULT_FALL_MS = 350;
const CATAPULT_LAND_MS = 250;
const CATAPULT_FONT = 260;
const CATAPULT_SHAKE = 1.4;

const catapultY = (r: Running, ms: number) => {
  const p = clamp01(
    (ms - CATAPULT_UP_MS - CATAPULT_AWAY_MS) / CATAPULT_FALL_MS,
  );
  return lerp(r.span.from, r.span.to, p * p);
};

const catapultHitAt = (r: Running, y: number) =>
  CATAPULT_UP_MS +
  CATAPULT_AWAY_MS +
  Math.sqrt(clamp01((y - r.span.from) / (r.span.to - r.span.from))) *
    CATAPULT_FALL_MS;

registerFloorCrit("catapultCrit", {
  plan(r, bars, hit) {
    // flung off the top of the screen, crashing down past the lowest bar
    const lowest = Math.max(...bars.map((b) => b.y));
    r.span = {
      from: -r.viewportWidth * 1.2,
      to: lowest + r.viewportWidth * 0.3,
    };
    bars.forEach((b, bar) => hit(bar, catapultHitAt(r, b.y)));
  },
  draw(ctx, r, ms, bars) {
    const x = bars[0].x;
    if (ms < CATAPULT_UP_MS) {
      // flung up off the top of the screen, spinning
      const p = (ms / CATAPULT_UP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        x * p,
        lerp(0, r.span.from, p),
        lerp(r.flashFont, r.flashFont * 1.2, p),
        {
          rot: p * 8,
          along: Math.PI / 2,
          stretch: 1 + 0.5 * p,
        },
      );
      return;
    }
    if (ms < CATAPULT_UP_MS + CATAPULT_AWAY_MS) return;
    const land = CATAPULT_UP_MS + CATAPULT_AWAY_MS + CATAPULT_FALL_MS;
    if (ms < land) {
      // crashing straight down through every bar
      drawText(ctx, r.glyphs, r.label, x, catapultY(r, ms), CATAPULT_FONT, {
        along: Math.PI / 2,
        stretch: 1.5,
      });
      return;
    }
    const q = (ms - land) / CATAPULT_LAND_MS;
    ctx.save();
    ctx.globalAlpha = 1 - q;
    drawGlow(
      ctx,
      glowStops(r.glyphs.color),
      x,
      r.span.to,
      r.viewportWidth * 0.4 * (0.5 + q),
    );
    ctx.restore();
    drawText(ctx, r.glyphs, r.label, x, r.span.to, CATAPULT_FONT, {
      sx: 1.4,
      sy: 0.6,
      alpha: 1 - q,
    });
  },
  tailMs: CATAPULT_LAND_MS,
  shake: () => CATAPULT_SHAKE,
});
