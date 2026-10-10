// the drones income crit: the number splits into three drone wisps that
// hover under the total, weaving, and rattle it with laser bolts in turn,
// quicker and quicker; then they ram it one after another, the last one in
// for the huge blast
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawBeam } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { smoothstep } from "../../../../shared/easing";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const UP_MS = 220;
const SHOTS = 24;
const GAP_MS: [number, number] = [70, 35];
const BOLT_MS = 120;
const RAM_DELAY_MS = 140;
const RAM_EVERY_MS = 45;
const RAM_MS = 130;
// the drones' spots under the total, and how they weave round them
const SPOTS = [-300, 0, 300];
const HOVER = 260;
const WEAVE_X = 60;
const WEAVE_Y = 30;
const WEAVE_RATE_X = 0.006;
const WEAVE_RATE_Y = 0.009;
const GUN_UP = 30;
// where each drone rams in along the readout
const RAM_GAP = 120;
// a bolt's length as a share of its flight
const BOLT_LENGTH = 0.3;
const BOLT_WIDTH = 16;
const FLASH = 90;
const DRONE = WISP_SIZE * 1.2;
const DRONE_HEAT = 0.9;
const ZAP_BLAST = 140;
const RAM_BLAST = 260;
// shakes by step: a bolt, a ram, the last ram
const SHAKES = [0.5, 1.4, 2.4];

interface Bolt {
  at: number;
  from: Point;
  to: Point;
  aim: number;
}
interface Flight {
  drones: ((ms: number) => Point)[];
  bolts: Bolt[];
  rams: Point[];
  ramAt: number[];
}
const flights = new WeakMap<Running, Flight>();
const head: Point = { x: 0, y: 0 };
const tail: Point = { x: 0, y: 0 };

function planFlight(to: Point): Flight {
  const shotAt = [UP_MS];
  for (let k = 1; k < SHOTS; k++)
    shotAt.push(shotAt[k - 1] + lerp(GAP_MS[0], GAP_MS[1], k / (SHOTS - 1)));
  const ramStart = shotAt[SHOTS - 1] + RAM_DELAY_MS;
  const ramAt = SPOTS.map((_, d) => ramStart + d * RAM_EVERY_MS + RAM_MS);
  const rams = SPOTS.map((_, d) => ({
    x: to.x + (d - 1) * RAM_GAP,
    y: to.y,
  }));
  const drones = SPOTS.map((dx, d) => {
    const home = { x: to.x + dx, y: to.y + HOVER };
    const spot: Point = { x: 0, y: 0 };
    const weave = (ms: number, into: Point) => {
      into.x = home.x + Math.sin(ms * WEAVE_RATE_X + d * 2) * WEAVE_X;
      into.y = home.y + Math.sin(ms * WEAVE_RATE_Y + d) * WEAVE_Y;
      return into;
    };
    const leave = ramAt[d] - RAM_MS;
    const from: Point = weave(leave, { x: 0, y: 0 });
    return (ms: number): Point => {
      if (ms < UP_MS) {
        const u = smoothstep(clamp01(ms / UP_MS));
        weave(ms, spot);
        spot.x *= u;
        spot.y *= u;
        return spot;
      }
      if (ms < leave) return weave(ms, spot);
      const u = clamp01((ms - leave) / RAM_MS) ** 2;
      spot.x = lerp(from.x, rams[d].x, u);
      spot.y = lerp(from.y, rams[d].y, u);
      return spot;
    };
  });
  const bolts = shotAt.map((at, k) => {
    const p = drones[k % SPOTS.length](at);
    const from = { x: p.x, y: p.y - GUN_UP };
    const spot = readoutSpot(to, k, 251);
    return {
      at,
      from,
      to: spot,
      aim: Math.atan2(spot.y - from.y, spot.x - from.x),
    };
  });
  return { drones, bolts, rams, ramAt };
}

registerFloorCrit("dronesCrit", {
  plan(r, bars, hit) {
    const flight = planFlight(bars[0]);
    flights.set(r, flight);
    for (const b of flight.bolts) hit(0, b.at + BOLT_MS);
    const { ramAt } = flight;
    for (let d = 0; d < ramAt.length; d++)
      hit(0, ramAt[d], d === ramAt.length - 1 ? 2 : 1);
  },
  draw(ctx, r, ms, bars) {
    const flight = flights.get(r);
    if (!flight) return;
    const now = r.startedAt + ms;
    const { drones, bolts, rams, ramAt } = flight;
    drawNumberShrink(ctx, r, ms);
    for (let k = 0; k < bolts.length; k++) {
      const b = bolts[k];
      const u = (ms - b.at) / BOLT_MS;
      if (u >= 0 && u < 1) {
        const back = Math.max(0, u - BOLT_LENGTH);
        head.x = lerp(b.from.x, b.to.x, u);
        head.y = lerp(b.from.y, b.to.y, u);
        tail.x = lerp(b.from.x, b.to.x, back);
        tail.y = lerp(b.from.y, b.to.y, back);
        drawBeam(ctx, tail, head, BOLT_WIDTH, 1);
        drawMuzzleFlash(ctx, b.from, b.aim, u * 2, FLASH);
      }
      drawDetonation(ctx, b.to, ms - b.at - BOLT_MS, ZAP_BLAST, now);
    }
    const last = drones.length - 1;
    for (let d = 0; d <= last; d++) {
      drawWispBetween(ctx, drones[d], ms, now, DRONE, DRONE_HEAT, 0, ramAt[d]);
      if (d < last) drawDetonation(ctx, rams[d], ms - ramAt[d], RAM_BLAST, now);
    }
    drawFinale(ctx, bars[0], ms - ramAt[last], now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
