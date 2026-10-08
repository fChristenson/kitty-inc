// the ricochet laser floor crit: the number floats to the edge and fires a
// laser that bounces from bar to bar down the building, flaring at every
// bounce, then the whole zigzag burns brighter and blows up at every bounce
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { smoothstep } from "../../../../shared/easing";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";

const RICO_IN_MS = 280;
const RICO_CHARGE_MS = 250;
const RICO_FIRE_MS = RICO_IN_MS + RICO_CHARGE_MS;
const RICO_LEG_MS = 90;
const RICO_BURN_MS = 450;
const RICO_FADE_MS = 200;
const RICO_FONT = 120;
// the emitter: off to the right, above the top bar, kept below the HUD; the
// last leg flies off below the lowest bar (of the viewport's width)
const RICO_SIDE = 0.36;
const RICO_ABOVE = 260;
const RICO_HIGHEST = 0.55;
const RICO_BELOW = 400;
const RICO_LOWEST = 0.95;
// how far along each bar it bounces, either side of the middle
const RICO_SPREAD = 0.8;
const BAR_HALF_H = 46;
const RICO_WIDTH: [number, number] = [34, 70];
const RICO_FLARE: [number, number] = [40, 80];
const RICO_BLAST = 90;
const RICO_BLOW_BLAST = 220;
const RICO_SHAKE = 0.7;
const RICO_BLOW_SHAKE = 1.1;
const RICO_TAIL_MS = 900;

// the emitter, then a bounce on each bar top to bottom, side to side, then off
function zigzag(r: Running, bars: Point[]): Point[] {
  const w = r.viewportWidth;
  const order = byHeight(bars);
  const top = bars[order[0]];
  const bottom = bars[order[order.length - 1]];
  const bounces = order.map((bar, k) => ({
    x: along(r, bars, bar, k % 2 ? RICO_SPREAD : -RICO_SPREAD).x,
    y: bars[bar].y - BAR_HALF_H,
  }));
  return [
    { x: w * RICO_SIDE, y: Math.max(top.y - RICO_ABOVE, -w * RICO_HIGHEST) },
    ...bounces,
    {
      x: along(r, bars, order[0], order.length % 2 ? RICO_SPREAD : -RICO_SPREAD)
        .x,
      y: Math.min(bottom.y + RICO_BELOW, w * RICO_LOWEST),
    },
  ];
}
// when the beam reaches point i of the zigzag
const reachesAt = (i: number) => RICO_FIRE_MS + i * RICO_LEG_MS;
const blowsAt = (bars: number) => reachesAt(bars + 1) + RICO_BURN_MS;

registerFloorCrit("ricochetLaserCrit", {
  plan(_r, bars, hit) {
    const blows = blowsAt(bars.length);
    byHeight(bars).forEach((bar, k) => {
      hit(bar, reachesAt(k + 1));
      hit(bar, blows, 1);
    });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const path = zigzag(r, bars);
    const emitter = path[0];
    const blows = blowsAt(bars.length);
    if (ms < blows + 120) {
      const p = smoothstep(clamp01(ms / RICO_IN_MS));
      drawText(
        ctx,
        r.glyphs,
        r.label,
        emitter.x * p,
        emitter.y * p,
        lerp(r.flashFont, RICO_FONT, p),
        { rot: -0.3 * p },
      );
    }
    if (ms >= RICO_IN_MS && ms < RICO_FIRE_MS)
      drawAimLaser(ctx, emitter, path[1]);
    const fade = ms > blows ? 1 - (ms - blows) / RICO_FADE_MS : 1;
    if (ms >= RICO_FIRE_MS && fade > 0) {
      const burn = clamp01((ms - reachesAt(path.length - 1)) / RICO_BURN_MS);
      const width = lerp(RICO_WIDTH[0], RICO_WIDTH[1], burn);
      for (let i = 0; i < path.length - 1; i++) {
        const u = clamp01((ms - reachesAt(i)) / RICO_LEG_MS);
        if (u <= 0) break;
        const a = path[i];
        const b = path[i + 1];
        drawBeam(
          ctx,
          a,
          { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) },
          width,
          fade,
        );
      }
      for (let i = 1; i < path.length - 1; i++)
        if (ms >= reachesAt(i))
          drawBeamFlare(
            ctx,
            path[i],
            lerp(RICO_FLARE[0], RICO_FLARE[1], burn),
            fade,
            now,
          );
    }
    for (let i = 1; i < path.length - 1; i++) {
      drawDetonation(ctx, path[i], ms - reachesAt(i), RICO_BLAST, now);
      drawDetonation(ctx, path[i], ms - blows, RICO_BLOW_BLAST, now);
    }
  },
  tailMs: RICO_TAIL_MS,
  shake: (step) => (step ? RICO_BLOW_SHAKE : RICO_SHAKE),
});
