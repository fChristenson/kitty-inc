// the stamp floor crit: its number stamping down onto each bar, leaving a glowing print
import { drawGlow } from "../../../../shared/glowSprite";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  byHeight,
  drawText,
  glowStops,
} from "../../critPlayer";

const STAMP_FIRST_MS = 120;
const STAMP_EACH_MS = 150;
const STAMP_LIFT = 140;
const STAMP_PRINT_MS = 900;
const STAMP_FONT = 160;

registerFloorCrit("stampCrit", {
  plan(_r, bars, hit) {
    byHeight(bars).forEach((bar, i) =>
      hit(bar, STAMP_FIRST_MS + i * STAMP_EACH_MS),
    );
  },
  draw(ctx, r, ms, bars) {
    const order = byHeight(bars);
    const hitAt = (i: number) => STAMP_FIRST_MS + i * STAMP_EACH_MS;
    // the glowing prints it leaves on the bars it has hit
    order.forEach((bar, i) => {
      const since = ms - hitAt(i);
      if (since < 0 || since >= STAMP_PRINT_MS) return;
      const k = 1 - since / STAMP_PRINT_MS;
      const at = bars[bar];
      ctx.save();
      ctx.globalAlpha = 0.6 * k;
      drawGlow(
        ctx,
        glowStops(r.glyphs.color),
        at.x,
        at.y,
        r.play.barHalfWidth * 0.7,
        0.4,
      );
      ctx.restore();
      drawText(ctx, r.glyphs, r.label, at.x, at.y, STAMP_FONT * 0.8, {
        alpha: 0.85 * k,
      });
    });
    // the stamp: lifting off each bar and coming down hard on the next
    const last = order.length - 1;
    if (ms > hitAt(last) + 120) return;
    const i = Math.min(
      last,
      Math.max(0, Math.floor((ms - STAMP_FIRST_MS) / STAMP_EACH_MS) + 1),
    );
    const legMs = i === 0 ? STAMP_FIRST_MS : STAMP_EACH_MS;
    const q = clamp01((ms - (hitAt(i) - legMs)) / legMs);
    const from = i === 0 ? { x: 0, y: 0 } : bars[order[i - 1]];
    const to = bars[order[i]];
    const down = q * q;
    const lift =
      i === 0 ? 0 : Math.sin(Math.PI * Math.min(1, q * 1.2)) * STAMP_LIFT;
    const font = i === 0 ? lerp(r.flashFont, STAMP_FONT, down) : STAMP_FONT;
    const squash = ms >= hitAt(i) ? Math.exp(-(ms - hitAt(i)) / 40) : 0;
    drawText(
      ctx,
      r.glyphs,
      r.label,
      lerp(from.x, to.x, down),
      lerp(from.y, to.y - font * 0.35, down) - lift,
      font,
      { sx: 1 + 0.3 * squash, sy: 1 - 0.4 * squash },
    );
  },
  tailMs: STAMP_PRINT_MS,
});
