// the bank shot income crit: the number turns into a gun wisp low in the
// middle firing shots that bank off the screen's sides once, twice or three
// times, zigzagging up onto the total, quicker and quicker, a pop on every
// wall; then one fat shot straight up the middle for the huge blast
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
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const MOVE_MS = 320;
const SHOTS = 12;
const GAP_MS: [number, number] = [90, 45];
const FLY_MS = 280;
const FAT_DELAY_MS = 150;
const FAT_MS = 160;
// the walls, in from the screen's sides; the gun under the flash's spot
const WALL_IN = 40;
const GUN_DOWN = 120;
const LAND_Y = 20;
const FLASH_MS = 70;
const FLASH = 110;
const GUN = WISP_SIZE * 1.3;
const GUN_HEAT = 0.8;
const SHOT = WISP_SIZE * 0.7;
const FAT = WISP_SIZE * 1.5;
const PING_BLAST = 90;
const LAND_BLAST = 170;
const PING_SHAKE = 0.4;
// shakes by step: a shot landing, the fat one
const SHAKES = [0.7, 2.4];

interface Shot {
  at: number;
  to: Point;
  aim: number;
  path: (ms: number) => Point;
}
interface Bank {
  gun: Point;
  shots: Shot[];
  // every pop off a wall, in time order
  pings: Point[];
  pingAt: number[];
  fatAt: number;
  endAt: number;
  gunPath: (ms: number) => Point;
  fat: (ms: number) => Point;
}
const banks = new WeakMap<Running, Bank>();

function planBank(to: Point, viewportWidth: number): Bank {
  const right = viewportWidth / 2 - WALL_IN;
  const left = -right;
  const span = right - left;
  const gun = { x: 0, y: GUN_DOWN };
  const y = to.y + LAND_Y;
  // the walls unfolded: a straight run in unfolded x, folded back on screen
  const fold = (u: number) => {
    const v = (((u - left) % (2 * span)) + 2 * span) % (2 * span);
    return v < span ? left + v : left + 2 * span - v;
  };
  // where a shot heading right first must aim, unfolded, to land at x
  const unfolded = (x: number, bounces: number) =>
    [x, 2 * right - x, 2 * right - 2 * left + x, 4 * right - 2 * left - x][
      bounces
    ];
  const wallsAt = [right, 2 * right - left, 3 * right - 2 * left];
  const shots: Shot[] = [];
  const pings: { at: Point; ms: number }[] = [];
  let at = MOVE_MS;
  for (let k = 0; k < SHOTS; k++) {
    const bounces = 1 + (k % 3);
    const heading = k % 2 === 0 ? 1 : -1;
    const spot = readoutSpot(to, k, 171);
    spot.y = y;
    // a shot heading left first is a right one mirrored about the gun
    const end = heading * unfolded(heading * spot.x, bounces);
    const fired = at;
    for (let n = 0; n < bounces; n++) {
      const wall = heading * wallsAt[n];
      const u = (wall - gun.x) / (end - gun.x);
      pings.push({
        at: { x: fold(wall), y: lerp(gun.y, y, u) },
        ms: fired + u * FLY_MS,
      });
    }
    const point: Point = { x: 0, y: 0 };
    shots.push({
      at: fired,
      to: { x: fold(end), y },
      aim: Math.atan2(y - gun.y, end - gun.x),
      path: (ms) => {
        const u = clamp01((ms - fired) / FLY_MS);
        point.x = fold(lerp(gun.x, end, u));
        point.y = lerp(gun.y, y, u);
        return point;
      },
    });
    at += lerp(GAP_MS[0], GAP_MS[1], k / (SHOTS - 1));
  }
  pings.sort((a, b) => a.ms - b.ms);
  const fatAt = shots[SHOTS - 1].at + FAT_DELAY_MS;
  const endAt = fatAt + FAT_MS;
  const gunSpot: Point = { x: 0, y: 0 };
  const fatSpot: Point = { x: 0, y: 0 };
  return {
    gun,
    shots,
    pings: pings.map((p) => p.at),
    pingAt: pings.map((p) => p.ms),
    fatAt,
    endAt,
    gunPath: (ms) => {
      gunSpot.x = gun.x;
      gunSpot.y = lerp(0, gun.y, smoothstep(clamp01(ms / MOVE_MS)));
      return gunSpot;
    },
    fat: (ms) => {
      const u = clamp01((ms - fatAt) / FAT_MS) ** 2;
      fatSpot.x = lerp(gun.x, to.x, u);
      fatSpot.y = lerp(gun.y, to.y, u);
      return fatSpot;
    },
  };
}

registerFloorCrit("bankShotCrit", {
  plan(r, bars, hit) {
    const bank = planBank(bars[0], r.viewportWidth);
    banks.set(r, bank);
    for (const shot of bank.shots) hit(0, shot.at + FLY_MS);
    hit(0, bank.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const bank = banks.get(r);
    if (!bank) return;
    const now = r.startedAt + ms;
    const { gun, shots, pings, pingAt } = bank;
    drawNumberShrink(ctx, r, ms);
    while (r.kicked < pingAt.length && ms >= pingAt[r.kicked]) {
      r.kicked++;
      r.shake(PING_SHAKE);
    }
    drawWispBetween(ctx, bank.gunPath, ms, now, GUN, GUN_HEAT, 0, bank.endAt);
    for (let k = 0; k < shots.length; k++) {
      const shot = shots[k];
      drawMuzzleFlash(ctx, gun, shot.aim, (ms - shot.at) / FLASH_MS, FLASH);
      drawWispBetween(
        ctx,
        shot.path,
        ms,
        now,
        SHOT,
        1,
        shot.at,
        shot.at + FLY_MS,
      );
      drawDetonation(ctx, shot.to, ms - shot.at - FLY_MS, LAND_BLAST, now);
    }
    for (let k = 0; k < pings.length; k++)
      drawDetonation(ctx, pings[k], ms - pingAt[k], PING_BLAST, now);
    drawWispBetween(ctx, bank.fat, ms, now, FAT, 1, bank.fatAt, bank.endAt);
    drawFinale(ctx, bars[0], ms - bank.endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
