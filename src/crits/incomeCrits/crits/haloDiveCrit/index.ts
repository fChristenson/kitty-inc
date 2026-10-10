// the halo dive income crit: the number bursts into ten wisps that whip up
// and ring the total, whirling tighter and faster round it; then they dive
// into it one after another across the readout, the last bringing the huge
// blast
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { smoothstep } from "../../../../shared/easing";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { quadratic } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, readoutSpot } from "../shared";

const SWELL_MS = 150;
const SWELL = 0.3;
const UP_MS = 240;
const WHIRL_MS = 300;
const WISPS = 10;
const DIVE_EVERY_MS = 48;
const DIVE_MS = 90;
const ORBIT_MS = SWELL_MS + UP_MS;
const DIVES_MS = ORBIT_MS + WHIRL_MS;
// the ring round the total: its half widths, how far under the total its
// middle sits, how tight it closes, and its spin (radians per ms) speeding up
const RING_X = 470;
const RING_Y = 140;
const RING_DOWN = 80;
const TIGHTEN = 0.6;
const SPIN = 0.008;
const SPIN_UP = 0.012;
const UP_LIFT = 200;
const WISP = WISP_SIZE * 1.2;
const WISP_HEAT = 0.8;
const OPEN_BLAST = 280;
const BLAST = 180;
// shakes by step: a dive, the last one in
const SHAKES = [0.7, 2.4];

interface Diver {
  to: Point;
  land: number;
  path: (ms: number) => Point;
}
const halos = new WeakMap<Running, Diver[]>();
const middle: Point = { x: 0, y: 0 };

function ringAt(to: Point, k: number, ms: number): Point {
  const t = clamp01((ms - ORBIT_MS) / WHIRL_MS);
  const a = (k / WISPS) * Math.PI * 2 + (ms - ORBIT_MS) * (SPIN + SPIN_UP * t);
  const tight = lerp(1, TIGHTEN, t);
  return {
    x: to.x + Math.cos(a) * RING_X * tight,
    y: to.y + RING_DOWN + Math.sin(a) * RING_Y * tight,
  };
}

function planHalo(to: Point): Diver[] {
  const divers: Diver[] = [];
  for (let k = 0; k < WISPS; k++) {
    const dive = DIVES_MS + k * DIVE_EVERY_MS;
    const land = dive + DIVE_MS;
    const spot = readoutSpot(to, k, 91);
    const seat = ringAt(to, k, ORBIT_MS);
    const pull = { x: seat.x / 2, y: Math.min(0, seat.y) - UP_LIFT * 2 };
    const leave = ringAt(to, k, dive);
    divers.push({
      to: spot,
      land,
      path: (ms) => {
        if (ms < ORBIT_MS)
          return quadratic(
            middle,
            pull,
            seat,
            smoothstep(clamp01((ms - SWELL_MS) / UP_MS)),
          );
        if (ms < dive) return ringAt(to, k, ms);
        const u = clamp01((ms - dive) / DIVE_MS) ** 2;
        return { x: lerp(leave.x, spot.x, u), y: lerp(leave.y, spot.y, u) };
      },
    });
  }
  return divers;
}

registerFloorCrit("haloDiveCrit", {
  plan(r, bars, hit) {
    const divers = planHalo(bars[0]);
    halos.set(r, divers);
    for (let k = 0; k < divers.length; k++)
      hit(0, divers[k].land, k === divers.length - 1 ? 1 : 0);
  },
  draw(ctx, r, ms, bars) {
    const divers = halos.get(r);
    if (!divers) return;
    const now = r.startedAt + ms;
    if (ms < SWELL_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + SWELL * (ms / SWELL_MS) ** 2),
      );
    drawDetonation(ctx, middle, ms - SWELL_MS, OPEN_BLAST, now);
    const last = divers.length - 1;
    for (let k = 0; k < last; k++) {
      const d = divers[k];
      drawWispBetween(ctx, d.path, ms, now, WISP, WISP_HEAT, SWELL_MS, d.land);
      drawDetonation(ctx, d.to, ms - d.land, BLAST, now);
    }
    const final = divers[last];
    drawWispBetween(
      ctx,
      final.path,
      ms,
      now,
      WISP,
      WISP_HEAT,
      SWELL_MS,
      final.land,
    );
    drawFinale(ctx, bars[0], ms - final.land, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
