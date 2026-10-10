// the salvo income crit: the number splits into two launcher wisps at the
// screen's bottom corners that ripple-fire rockets, left, right, left, each
// streaking up the side and curling in onto the total, quicker and quicker;
// then both fire a fat rocket together into the middle for the huge blast
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
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
import { quadratic } from "../../../floorCrits/critPlayer/shared";
import { cubic, drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const SPLIT_MS = 380;
const ROCKETS = 16;
const GAP_MS: [number, number] = [70, 40];
const FLY_MS = 380;
// rockets speed up as they climb
const THRUST = 1.4;
const FAT_DELAY_MS = 140;
// the launchers: in from the screen's sides, up from its bottom (the bottom
// as far under the middle as this share of the total's height over it)
const CORNER_IN = 80;
const BOTTOM = 0.75;
const CORNER_UP = 110;
const SPLIT_LIFT = 140;
// a rocket climbs the side, then curls in from this far out
const CLIMB = 0.6;
const CURL = 260;
const CURL_UP = 40;
const FLASH_MS = 80;
const FLASH = 110;
const FAT_FLASH_MS = 100;
const FAT_FLASH = 180;
const LAUNCHER = WISP_SIZE * 1.3;
const LAUNCHER_HEAT = 0.8;
const ROCKET = WISP_SIZE * 0.8;
const FAT = WISP_SIZE * 1.5;
const LAND_BLAST = 170;
const FAT_KICK = 1.2;
// shakes by step: a rocket landing, the fat pair
const SHAKES = [0.7, 2.4];

interface Rocket {
  at: number;
  side: number;
  to: Point;
  path: (ms: number) => Point;
}
interface Salvo {
  corners: Point[];
  launchers: ((ms: number) => Point)[];
  rockets: Rocket[];
  fats: ((ms: number) => Point)[];
  fatAt: number;
  endAt: number;
}
const salvos = new WeakMap<Running, Salvo>();

// up the side from `from`, curling in onto `to`
function flight(from: Point, to: Point, at: number): (ms: number) => Point {
  const side = from.x < to.x ? 1 : -1;
  const climb = { x: from.x, y: lerp(from.y, to.y, CLIMB) };
  const curl = { x: to.x - side * CURL, y: to.y - CURL_UP };
  const spot: Point = { x: 0, y: 0 };
  return (ms) =>
    cubic(from, climb, curl, to, clamp01((ms - at) / FLY_MS) ** THRUST, spot);
}

function planSalvo(to: Point, viewportWidth: number): Salvo {
  const y = -to.y * BOTTOM - CORNER_UP;
  const origin = { x: 0, y: 0 };
  const corners = [-1, 1].map((s) => ({
    x: s * (viewportWidth / 2 - CORNER_IN),
    y,
  }));
  const launchers = corners.map((c) => {
    const pull = { x: c.x / 2, y: Math.min(0, c.y) - SPLIT_LIFT * 2 };
    return (ms: number) =>
      quadratic(origin, pull, c, smoothstep(clamp01(ms / SPLIT_MS)));
  });
  const rockets: Rocket[] = [];
  let at = SPLIT_MS;
  for (let k = 0; k < ROCKETS; k++) {
    const side = k % 2;
    const spot = readoutSpot(to, k, 151);
    rockets.push({ at, side, to: spot, path: flight(corners[side], spot, at) });
    at += lerp(GAP_MS[0], GAP_MS[1], k / (ROCKETS - 1));
  }
  const fatAt = rockets[ROCKETS - 1].at + FAT_DELAY_MS;
  return {
    corners,
    launchers,
    rockets,
    fats: corners.map((c) => flight(c, to, fatAt)),
    fatAt,
    endAt: fatAt + FLY_MS,
  };
}

registerFloorCrit("salvoCrit", {
  plan(r, bars, hit) {
    const salvo = planSalvo(bars[0], r.viewportWidth);
    salvos.set(r, salvo);
    for (const rocket of salvo.rockets) hit(0, rocket.at + FLY_MS);
    hit(0, salvo.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const salvo = salvos.get(r);
    if (!salvo) return;
    const now = r.startedAt + ms;
    const { corners, rockets, fatAt, endAt } = salvo;
    drawNumberShrink(ctx, r, ms);
    if (ms >= fatAt && r.kicked === 0) {
      r.kicked = 1;
      r.shake(FAT_KICK);
    }
    for (let k = 0; k < salvo.launchers.length; k++)
      drawWispBetween(
        ctx,
        salvo.launchers[k],
        ms,
        now,
        LAUNCHER,
        LAUNCHER_HEAT,
        0,
        fatAt,
      );
    for (let k = 0; k < rockets.length; k++) {
      const rocket = rockets[k];
      drawMuzzleFlash(
        ctx,
        corners[rocket.side],
        -Math.PI / 2,
        (ms - rocket.at) / FLASH_MS,
        FLASH,
      );
      drawWispBetween(
        ctx,
        rocket.path,
        ms,
        now,
        ROCKET,
        1,
        rocket.at,
        rocket.at + FLY_MS,
      );
      drawDetonation(ctx, rocket.to, ms - rocket.at - FLY_MS, LAND_BLAST, now);
    }
    for (let side = 0; side < salvo.fats.length; side++) {
      drawMuzzleFlash(
        ctx,
        corners[side],
        -Math.PI / 2,
        (ms - fatAt) / FAT_FLASH_MS,
        FAT_FLASH,
      );
      drawWispBetween(ctx, salvo.fats[side], ms, now, FAT, 1, fatAt, endAt);
    }
    drawFinale(ctx, bars[0], ms - endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
