// the tornado floor crit: its number whirled into a tornado flinging a copy onto each bar
import {
  registerFloorCrit,
  type Running,
  MOMENT_FONT,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";

const TORNADO_FORM_MS = 300;
const TORNADO_DOWN_MS = 700;
const TORNADO_FLING_MS = 220;
const TORNADO_COPIES = 12;
const TORNADO_FONT = 90;

const tornadoY = (r: Running, ms: number) =>
  lerp(
    r.span.from,
    r.span.to,
    clamp01((ms - TORNADO_FORM_MS) / TORNADO_DOWN_MS),
  );

const tornadoPassesAt = (r: Running, y: number) =>
  TORNADO_FORM_MS +
  clamp01((y - r.span.from) / Math.max(1, r.span.to - r.span.from)) *
    TORNADO_DOWN_MS;

registerFloorCrit("tornadoCrit", {
  plan(r, bars, hit) {
    const ys = bars.map((b) => b.y);
    r.span = { from: Math.min(0, Math.min(...ys)), to: Math.max(...ys) };
    bars.forEach((b, bar) =>
      hit(bar, tornadoPassesAt(r, b.y) + TORNADO_FLING_MS),
    );
  },
  draw(ctx, r, ms, bars) {
    const x = bars[0].x;
    const form = clamp01(ms / TORNADO_FORM_MS);
    const cy =
      ms < TORNADO_FORM_MS ? lerp(0, r.span.from, form) : tornadoY(r, ms);
    // the number breaking up into the funnel's copies
    if (form < 1)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        x * form,
        cy,
        lerp(r.flashFont, TORNADO_FONT, form),
        {
          alpha: 1 - form,
        },
      );
    const fade = clamp01((TORNADO_FORM_MS + TORNADO_DOWN_MS + 150 - ms) / 150);
    const w = r.viewportWidth;
    for (let k = 0; k < TORNADO_COPIES; k++) {
      const h = k / (TORNADO_COPIES - 1);
      const a = ms * 0.02 + k * 1.3;
      const radius = (w * 0.03 + w * 0.17 * h) * form;
      const depth = Math.sin(a);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        x * form + Math.cos(a) * radius,
        cy - w * 0.3 * h * form,
        TORNADO_FONT * (1 + 0.25 * depth),
        { alpha: (0.55 + 0.45 * depth) * fade * form, rot: Math.cos(a) * 0.4 },
      );
    }
    // a copy flung off onto each bar as the funnel passes it
    bars.forEach((b, bar) => {
      const passes = tornadoPassesAt(r, b.y);
      const t = (ms - passes) / TORNADO_FLING_MS;
      if (t < 0 || t >= 1) return;
      const to = along(r, bars, bar, bar % 2 ? -1 : 1);
      const fromY = tornadoY(r, passes) - w * 0.08;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(x, to.x, t),
        lerp(fromY, to.y, t) - w * 0.1 * 4 * t * (1 - t),
        MOMENT_FONT * 0.75,
        { rot: t * 6 },
      );
    });
  },
});
