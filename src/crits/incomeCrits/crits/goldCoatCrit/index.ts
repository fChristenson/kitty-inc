// the gold coat income crit: the number splits into two nozzle wisps that
// dart out either side of the total and hiss gold mist across it, sweeping,
// the readout coating gold as pops of mist burst on it quicker and quicker;
// once it's covered it flashes white and blows in the huge blast
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  sprayLandsAt,
  type Spray,
} from "../../../../shared/spray";
import { smoothstep } from "../../../../shared/easing";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { quadratic } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

const SPLIT_MS = 180;
const SPRAY_MS = 1100;
const STOP_MS = SPLIT_MS + SPRAY_MS;
const END_MS = STOP_MS + 80;
// the nozzles: in from the screen's sides, under the total; each aims at
// its half of the readout, sweeping
const NOZZLE_IN = 70;
const NOZZLE_DOWN = 170;
const AIM_X = 150;
const SWEEP = 0.16;
const SWEEP_RATE = 0.018;
const SPREAD = 0.14;
const FLIGHT_MS = 260;
const SPLIT_LIFT = 320;
// pops of mist on the readout, quickening
const FIRST_POP_MS = 120;
const POP_GAP_MS: [number, number] = [100, 45];
const POP_BLAST = 130;
// the coat over the readout, and its white flash at the end
const COAT_W = 780;
const COAT_H = 220;
const COAT_FADE_MS = 300;
const FLASH = 0.9;
const FLASH_MS = 220;
const DROPLET = 90;
const MIST = 110;
const NOZZLE = WISP_SIZE * 1.2;
const NOZZLE_HEAT = 0.8;
// shakes by step: a pop, the blow
const SHAKES = [0.5, 2.4];

interface Coat {
  sprays: Spray[];
  wisps: ((ms: number) => Point)[];
  pops: Point[];
  popAt: number[];
}
const coats = new WeakMap<Running, Coat>();
const land: Point = { x: 0, y: 0 };

function planCoat(to: Point, viewportWidth: number): Coat {
  const sprays: Spray[] = [];
  const wisps: ((ms: number) => Point)[] = [];
  const origin = { x: 0, y: 0 };
  for (let k = 0; k < 2; k++) {
    const side = k === 0 ? -1 : 1;
    const nozzle = {
      x: side * (viewportWidth / 2 - NOZZLE_IN),
      y: to.y + NOZZLE_DOWN,
    };
    const aim = { x: to.x + side * AIM_X, y: to.y };
    const base = Math.atan2(aim.y - nozzle.y, aim.x - nozzle.x);
    const phase = k * Math.PI;
    sprays.push(
      planSpray(
        nozzle,
        (ms) => base + SWEEP * Math.sin((ms - SPLIT_MS) * SWEEP_RATE + phase),
        {
          startMs: SPLIT_MS,
          endMs: STOP_MS,
          spread: SPREAD,
          reach: Math.hypot(aim.x - nozzle.x, aim.y - nozzle.y),
          flightMs: FLIGHT_MS,
        },
      ),
    );
    const pull = { x: nozzle.x / 2, y: nozzle.y / 2 - SPLIT_LIFT };
    wisps.push((ms) =>
      quadratic(origin, pull, nozzle, smoothstep(clamp01(ms / SPLIT_MS))),
    );
  }
  const pops: Point[] = [];
  const popAt: number[] = [];
  for (let t = SPLIT_MS + FIRST_POP_MS, k = 0; t < STOP_MS; k++) {
    const p = sprayLandsAt(sprays[k % 2], t, { x: 0, y: 0 });
    pops.push(p);
    popAt.push(t);
    t += lerp(POP_GAP_MS[0], POP_GAP_MS[1], (t - SPLIT_MS) / SPRAY_MS);
  }
  return { sprays, wisps, pops, popAt };
}

registerFloorCrit("goldCoatCrit", {
  plan(r, bars, hit) {
    const coat = planCoat(bars[0], r.viewportWidth);
    coats.set(r, coat);
    for (const at of coat.popAt) hit(0, at);
    hit(0, END_MS, 1);
  },
  draw(ctx, r, ms, bars) {
    const coat = coats.get(r);
    if (!coat) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    const cover =
      ms < STOP_MS
        ? clamp01((ms - SPLIT_MS) / SPRAY_MS)
        : 1 - clamp01((ms - END_MS) / COAT_FADE_MS);
    const flashFor = ms - END_MS;
    const flash =
      flashFor >= 0 && flashFor < FLASH_MS
        ? FLASH * (1 - flashFor / FLASH_MS)
        : 0;
    drawSprayCoat(ctx, to, COAT_W, COAT_H, cover, flash);
    const { sprays, wisps } = coat;
    for (let k = 0; k < sprays.length; k++) {
      drawSpray(ctx, sprays[k], ms, now, DROPLET);
      if (ms >= SPLIT_MS && ms < STOP_MS)
        drawSprayMist(
          ctx,
          sprayLandsAt(sprays[k], ms, land),
          ms - SPLIT_MS,
          1,
          MIST,
          now,
        );
      drawWispBetween(ctx, wisps[k], ms, now, NOZZLE, NOZZLE_HEAT, 0, STOP_MS);
    }
    const { pops, popAt } = coat;
    for (let k = 0; k < pops.length; k++)
      drawDetonation(ctx, pops[k], ms - popAt[k], POP_BLAST, now);
    drawFinale(ctx, to, ms - END_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
