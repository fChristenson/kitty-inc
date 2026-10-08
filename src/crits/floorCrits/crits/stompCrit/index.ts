// the stomp floor crit: its number swelling and stomping onto every bar at once
import { registerFloorCrit, lerp, drawText } from "../../critPlayer";

const STOMP_GROW_MS = 260;
const STOMP_HIT_MS = 370;
const STOMP_SETTLE_MS = 250;
const STOMP_GROW = 1.25;
const STOMP_SHAKE = 1.6;

registerFloorCrit("stompCrit", {
  plan(_r, bars, hit) {
    bars.forEach((_, bar) => hit(bar, STOMP_HIT_MS));
  },
  draw(ctx, r, ms, bars) {
    const midY = bars.reduce((sum, b) => sum + b.y, 0) / bars.length;
    const big = r.flashFont * STOMP_GROW;
    if (ms < STOMP_GROW_MS) {
      const e = 1 - (1 - ms / STOMP_GROW_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        -r.viewportWidth * 0.05 * e,
        lerp(r.flashFont, big, e),
      );
    } else if (ms < STOMP_HIT_MS) {
      const q = (ms - STOMP_GROW_MS) / (STOMP_HIT_MS - STOMP_GROW_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        lerp(-r.viewportWidth * 0.05, midY, q * q),
        lerp(big, r.flashFont * 1.2, q),
      );
    } else {
      // squashed flat by the stomp, fading
      const q = (ms - STOMP_HIT_MS) / STOMP_SETTLE_MS;
      const k = Math.exp(-q * 5);
      drawText(ctx, r.glyphs, r.label, 0, midY, r.flashFont * 1.2, {
        sx: 1 + 0.3 * k,
        sy: 1 - 0.5 * k,
        alpha: 1 - q,
      });
    }
  },
  tailMs: STOMP_SETTLE_MS,
  shake: () => STOMP_SHAKE,
});
