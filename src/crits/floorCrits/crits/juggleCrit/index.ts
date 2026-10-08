// the juggle floor crit: its characters juggled, then dropped onto the bars
import {
  registerFloorCrit,
  type Point,
  MOMENT_FONT,
  lerp,
  clamp01,
  byHeight,
  drawText,
} from "../../critPlayer";

const JUGGLE_MS = 650;
const JUGGLE_SPIN_MS = 400;
const JUGGLE_GATHER_MS = 120;
const JUGGLE_DROP_MS = 230;
const JUGGLE_STAGGER_MS = 80;

// each character's juggled drop: the bars spread top to bottom
function juggleTargets(bars: Point[], count: number): number[] {
  const sorted = byHeight(bars);
  return Array.from(
    { length: count },
    (_, i) =>
      sorted[
        count === 1 ? 0 : Math.round((i * (sorted.length - 1)) / (count - 1))
      ],
  );
}

registerFloorCrit("juggleCrit", {
  plan(r, bars, hit) {
    const count = r.label.length;
    juggleTargets(bars, count).forEach((bar, i) =>
      hit(bar, JUGGLE_MS + i * JUGGLE_STAGGER_MS + JUGGLE_DROP_MS),
    );
  },
  draw(ctx, r, ms, bars) {
    const count = r.charX.length;
    const rx = r.viewportWidth * 0.22;
    const ry = r.viewportWidth * 0.12;
    const juggled = (i: number, t: number): Point => {
      const a = (2 * Math.PI * t) / JUGGLE_SPIN_MS + (2 * Math.PI * i) / count;
      const q = clamp01(t / JUGGLE_GATHER_MS);
      return {
        x: lerp(r.charX[i], rx * Math.cos(a), q),
        y: lerp(0, ry * Math.sin(a), q),
      };
    };
    for (let i = 0; i < count; i++) {
      const release = JUGGLE_MS + i * JUGGLE_STAGGER_MS;
      if (ms >= release + JUGGLE_DROP_MS) continue;
      let at = juggled(i, Math.min(ms, release));
      if (ms > release) {
        const p = ((ms - release) / JUGGLE_DROP_MS) ** 2;
        const to = bars[r.hits[i].bar];
        at = { x: lerp(at.x, to.x, p), y: lerp(at.y, to.y, p) };
      }
      drawText(
        ctx,
        r.glyphs,
        r.label[i],
        at.x,
        at.y,
        lerp(r.flashFont, MOMENT_FONT * 1.1, clamp01(ms / JUGGLE_GATHER_MS)),
        { rot: ms * 0.02 * (i % 2 ? 1 : -1) },
      );
    }
  },
});
