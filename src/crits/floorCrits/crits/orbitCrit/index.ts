// the orbit floor crit: copies orbiting its number, flung off onto the bars
import {
  registerFloorCrit,
  FLOOR_CRIT_FONT,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";

const ORBIT_GATHER_MS = 150;
const ORBIT_SPIN_MS = 450;
const ORBIT_GAP_MS = 90;
const ORBIT_FLING_MS = 200;
const ORBIT_FONT = 90;
// how far it's thrown along its orbit before curving onto its bar
const ORBIT_KICK = 0.8;

const orbitRelease = (i: number) =>
  ORBIT_GATHER_MS + ORBIT_SPIN_MS + i * ORBIT_GAP_MS;
// spinning ever faster
const orbitAngle = (i: number, count: number, ms: number) =>
  (i / count) * Math.PI * 2 + (ms / 1000) * (4 + ms / 150);

registerFloorCrit("orbitCrit", {
  plan(_r, bars, hit) {
    byHeight(bars).forEach((bar, i) =>
      hit(bar, orbitRelease(i) + ORBIT_FLING_MS),
    );
  },
  draw(ctx, r, ms, bars) {
    const order = byHeight(bars);
    const count = order.length;
    const gather = clamp01(ms / ORBIT_GATHER_MS);
    const rx = r.viewportWidth * 0.3 * gather;
    const ry = rx * 0.4;
    const last = orbitRelease(count - 1);
    // the moons behind it, the number, then the moons in front and the
    // flung ones
    for (const front of [false, true]) {
      if (front)
        drawText(
          ctx,
          r.glyphs,
          r.label,
          0,
          0,
          lerp(r.flashFont, r.flashFont * 0.8, gather),
          { alpha: clamp01(1 - (ms - last) / ORBIT_FLING_MS) },
        );
      for (let i = 0; i < count; i++) {
        const release = orbitRelease(i);
        if (ms >= release + ORBIT_FLING_MS) continue;
        const a = orbitAngle(i, count, Math.min(ms, release));
        const at = { x: Math.cos(a) * rx, y: Math.sin(a) * ry };
        if (ms < release) {
          const depth = Math.sin(a);
          if (depth > 0 !== front) continue;
          drawText(
            ctx,
            r.glyphs,
            r.label,
            at.x,
            at.y,
            ORBIT_FONT * (1 + 0.3 * depth) * lerp(0.4, 1, gather),
            { alpha: 0.75 + 0.25 * depth },
          );
          continue;
        }
        if (!front) continue;
        // flung off along its orbit, curving onto its bar at full speed
        const p = (ms - release) / ORBIT_FLING_MS;
        const to = along(r, bars, order[i], i % 2 ? -1 : 1);
        drawText(
          ctx,
          r.glyphs,
          r.label,
          lerp(at.x - Math.sin(a) * rx * ORBIT_KICK * p, to.x, p * p),
          lerp(at.y + Math.cos(a) * ry * ORBIT_KICK * p, to.y, p * p),
          lerp(ORBIT_FONT, FLOOR_CRIT_FONT * 0.8, p),
          { rot: p * 6 },
        );
      }
    }
  },
});
