// the rapidFire floor crit: its number's characters firing one by one into its own bar
import {
  registerFloorCrit,
  MOMENT_FONT,
  lerp,
  drawText,
} from "../../critPlayer";

const RAPID_FLY_MS = 180;
const RAPID_STAGGER_MS = 80;
const RAPID_SPREAD = 130;

registerFloorCrit("rapidFireCrit", {
  plan(r, _bars, hit) {
    const count = r.label.length;
    for (let i = 0; i < count; i++)
      hit(0, RAPID_FLY_MS + i * RAPID_STAGGER_MS);
  },
  draw(ctx, r, ms, bars) {
    const to = bars[0];
    const count = r.charX.length;
    for (let i = 0; i < count; i++) {
      const hitAt = RAPID_FLY_MS + i * RAPID_STAGGER_MS;
      if (ms >= hitAt) continue;
      // speeding up the whole way, so it hits at full speed
      const u = ms / hitAt;
      const p = u * u;
      drawText(
        ctx,
        r.glyphs,
        r.label[i],
        r.charX[i] +
          (to.x + (i - (count - 1) / 2) * RAPID_SPREAD - r.charX[i]) * p,
        to.y * p,
        lerp(r.flashFont, MOMENT_FONT, p),
        { sx: 1 - 0.3 * u, sy: 1 + 0.5 * u },
      );
    }
  },
});
