// the homing missiles income crit: the number bursts and looses two dozen
// little missile wisps that fan out in every direction, then all hook round
// and home in on the total, slamming into it one after another in a long
// rattle; the last one in is the huge blast
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { cubic, drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const MISSILES = 24;
const FIRST_MS = 380;
const EVERY_MS = 35;
// how far out they fan (flattened a little), how far round each fan angle
// wanders, and how far under the total they hook round onto it
const FAN = 360;
const FAN_SQUASH = 0.8;
const WANDER = 0.3;
const HOOK = 0.6;
const UNDER = 320;
// they speed up as they home in
const THRUST = 1.3;
const MISSILE = WISP_SIZE * 0.6;
const LAST_MISSILE = WISP_SIZE * 1.2;
const OPEN_BLAST = 280;
const LAND_BLAST = 160;
// shakes by step: a missile in, the last
const SHAKES = [0.6, 2.4];

interface Missile {
  land: number;
  to: Point;
  path: (ms: number) => Point;
}
const swarms = new WeakMap<Running, Missile[]>();
const origin: Point = { x: 0, y: 0 };

function planSwarm(to: Point): Missile[] {
  const missiles: Missile[] = [];
  for (let k = 0; k < MISSILES; k++) {
    const a = (k / MISSILES) * Math.PI * 2 + holeHash(k, 231) * WANDER;
    const land = FIRST_MS + k * EVERY_MS;
    const spot = readoutSpot(to, k, 232);
    const out = { x: Math.cos(a) * FAN, y: Math.sin(a) * FAN * FAN_SQUASH };
    const turn = { x: spot.x + out.x * HOOK, y: spot.y + UNDER };
    const point: Point = { x: 0, y: 0 };
    missiles.push({
      land,
      to: spot,
      path: (ms) =>
        cubic(origin, out, turn, spot, clamp01(ms / land) ** THRUST, point),
    });
  }
  return missiles;
}

registerFloorCrit("homingMissilesCrit", {
  plan(r, bars, hit) {
    const missiles = planSwarm(bars[0]);
    swarms.set(r, missiles);
    for (let k = 0; k < missiles.length; k++)
      hit(0, missiles[k].land, k === missiles.length - 1 ? 1 : 0);
  },
  draw(ctx, r, ms, bars) {
    const missiles = swarms.get(r);
    if (!missiles) return;
    const now = r.startedAt + ms;
    drawNumberShrink(ctx, r, ms);
    drawDetonation(ctx, origin, ms, OPEN_BLAST, now);
    const last = missiles.length - 1;
    for (let k = 0; k <= last; k++) {
      const m = missiles[k];
      drawWispBetween(
        ctx,
        m.path,
        ms,
        now,
        k === last ? LAST_MISSILE : MISSILE,
        1,
        0,
        m.land,
      );
      if (k < last) drawDetonation(ctx, m.to, ms - m.land, LAND_BLAST, now);
    }
    drawFinale(ctx, bars[0], ms - missiles[last].land, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
