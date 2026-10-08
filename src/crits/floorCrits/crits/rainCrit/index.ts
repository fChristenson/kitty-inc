// the rain floor crit: copies of its number raining onto the bars
import { registerFloorCrit, drawText, along } from "../../critPlayer";
import { BURST_MS } from "../../critPlayer/shared";

const DROPS = 30;
const DROP_FONT = 110;
const DROP_SHAKE = 0.12;

function drop(i: number, barCount: number, viewportWidth: number) {
  return {
    bar: i % barCount,
    delay: i * 12,
    duration: 450 + ((i * 37) % 200),
    // where along its bar, -1..1
    along: ((i * 53) % 100) / 50 - 1,
    arc: viewportWidth * (0.25 + ((i * 29) % 80) / 400),
  };
}

registerFloorCrit("rainCrit", {
  plan(r, bars, hit) {
    for (let i = 0; i < DROPS; i++) {
      const d = drop(i, bars.length, r.viewportWidth);
      hit(d.bar, d.delay + d.duration);
    }
  },
  draw(ctx, r, ms, bars) {
    if (ms < BURST_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + ms / (BURST_MS * 2)),
        {
          alpha: 1 - ms / BURST_MS,
        },
      );
    for (let i = 0; i < DROPS; i++) {
      const d = drop(i, bars.length, r.viewportWidth);
      const p = (ms - d.delay) / d.duration;
      if (p < 0 || p >= 1) continue;
      const to = along(r, bars, d.bar, d.along);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        to.x * p,
        to.y * p * p - d.arc * 4 * p * (1 - p),
        DROP_FONT,
      );
    }
  },
  shake: () => DROP_SHAKE,
});
