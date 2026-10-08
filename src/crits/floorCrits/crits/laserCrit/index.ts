// the laser floor crit: the number floats aside, charges, and sweeps a beam
// down every bar in view, then locks onto its own for the final blast
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
} from "../../critPlayer";

const LASER_MOVE_MS = 300;
const LASER_CHARGE_MS = 800;
const LASER_SWEEP_MS = 700;
const LASER_LOCK_MS = 220;
const LASER_END_MS = LASER_CHARGE_MS + LASER_SWEEP_MS + LASER_LOCK_MS;
const LASER_FADE_MS = 200;
const LASER_FONT = 130;
// how far either side of the bars' middle the sweep rakes, of a bar's half width
const LASER_RAKE = 0.6;
// the emitter: off to the right, above the top bar (of the viewport's width)
const LASER_SIDE = 0.34;
const LASER_ABOVE = 220;
const LASER_HIGHEST = 0.6;
const LASER_WIDTH: [number, number] = [50, 120];
const LASER_FLARE: [number, number] = [40, 90];
const LASER_CHARGE_FLARE: [number, number] = [20, 80];
const LASER_BLAST = 120;
const LASER_LOCK_BLAST = 440;
const LASER_SHAKE = 0.6;
const LASER_LOCK_SHAKE = 2.6;
const LASER_TAIL_MS = 800;

const emitter = (r: Running, top: Point): Point => ({
  x: r.viewportWidth * LASER_SIDE,
  y: Math.max(top.y - LASER_ABOVE, -r.viewportWidth * LASER_HIGHEST),
});

// the sweep from the top bar down to the bottom one, and when it crosses each
function sweep(bars: Point[]) {
  const order = byHeight(bars);
  const top = bars[order[0]];
  const bottom = bars[order[order.length - 1]];
  const span = bottom.y - top.y;
  return {
    order,
    top,
    bottom,
    crosses: (bar: number) =>
      LASER_CHARGE_MS +
      (span > 0 ? (LASER_SWEEP_MS * (bars[bar].y - top.y)) / span : 0),
  };
}

// where the beam (or the aim laser before it) lands at ms
function aimAt(
  r: Running,
  bars: Point[],
  top: Point,
  bottom: Point,
  ms: number,
): Point {
  const rake = r.play.barHalfWidth * LASER_RAKE;
  if (ms < LASER_CHARGE_MS) return { x: top.x - rake, y: top.y };
  if (ms < LASER_CHARGE_MS + LASER_SWEEP_MS) {
    const p = (ms - LASER_CHARGE_MS) / LASER_SWEEP_MS;
    return { x: top.x - rake + 2 * rake * p, y: lerp(top.y, bottom.y, p) };
  }
  const p = smoothstep(
    clamp01((ms - LASER_CHARGE_MS - LASER_SWEEP_MS) / LASER_LOCK_MS),
  );
  return {
    x: lerp(top.x + rake, bars[0].x, p),
    y: lerp(bottom.y, bars[0].y, p),
  };
}

registerFloorCrit("laserCrit", {
  plan(_r, bars, hit) {
    const { order, crosses } = sweep(bars);
    for (const bar of order) hit(bar, crosses(bar));
    hit(0, LASER_END_MS, 1);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const { order, top, bottom, crosses } = sweep(bars);
    const from = emitter(r, top);
    if (ms < LASER_END_MS + 120) {
      const p = smoothstep(clamp01(ms / LASER_MOVE_MS));
      drawText(
        ctx,
        r.glyphs,
        r.label,
        from.x * p,
        from.y * p,
        lerp(r.flashFont, LASER_FONT, p),
        { rot: -0.3 * p },
      );
    }
    const fade =
      ms > LASER_END_MS ? 1 - (ms - LASER_END_MS) / LASER_FADE_MS : 1;
    if (ms >= LASER_MOVE_MS && fade > 0) {
      const charge = clamp01(
        (ms - LASER_MOVE_MS) / (LASER_CHARGE_MS - LASER_MOVE_MS),
      );
      drawBeamFlare(
        ctx,
        from,
        lerp(LASER_CHARGE_FLARE[0], LASER_CHARGE_FLARE[1], charge),
        fade,
        now,
      );
      const to = aimAt(r, bars, top, bottom, ms);
      if (ms < LASER_CHARGE_MS) drawAimLaser(ctx, from, to);
      else {
        const lock = clamp01(
          (ms - LASER_CHARGE_MS - LASER_SWEEP_MS) / LASER_LOCK_MS,
        );
        drawBeam(
          ctx,
          from,
          to,
          lerp(LASER_WIDTH[0], LASER_WIDTH[1], lock),
          fade,
        );
        drawBeamFlare(
          ctx,
          to,
          lerp(LASER_FLARE[0], LASER_FLARE[1], lock),
          fade,
          now,
        );
      }
    }
    for (const bar of order) {
      const at = crosses(bar);
      drawDetonation(
        ctx,
        aimAt(r, bars, top, bottom, at),
        ms - at,
        LASER_BLAST,
        now,
      );
    }
    drawDetonation(ctx, bars[0], ms - LASER_END_MS, LASER_LOCK_BLAST, now);
  },
  tailMs: LASER_TAIL_MS,
  shake: (step) => (step ? LASER_LOCK_SHAKE : LASER_SHAKE),
});
