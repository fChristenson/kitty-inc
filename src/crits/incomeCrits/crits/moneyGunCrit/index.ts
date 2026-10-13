// the money gun income crit: the number splits into two wisp guns under the
// total that fire fans of bills up into it, left, right, left, quicker and
// quicker, each volley a muzzle flash, a recoil and a pop on the total; then
// both let rip together in one blizzard of bills into the huge blast
import { BILL_SPIN_FRAME_COUNT } from "../../../../coinBurst";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import {
  billFrames,
  drawFinale,
  drawNumberShrink,
  readoutSpot,
} from "../shared";

const OPEN_BLAST = 140;
// the guns hop out of the number over SET_MS, GUN_X to its sides, GUN_AT
// of the way up to the total, arching GUN_LIFT high
const SET_FROM_MS = 60;
const SET_MS = 200;
const GUN_X = 360;
const GUN_AT = 0.45;
const GUN_LIFT = 160;
const GUN = WISP_SIZE * 1.8;
const GUN_HEAT = 0.6;
const RECOIL = 40;
const RECOIL_MS = 70;
// volleys, guns taking turns, from GAP_MS apart down to the last
const VOLLEYS = 14;
const GAP_MS: [number, number] = [240, 60];
const FAN = 7;
const FAN_SPREAD = 900;
// the blizzard: both guns, BLIZZARD bills each over BLIZZARD_MS
const BLIZZARD_LAG_MS = 60;
const BLIZZARD = 14;
const BLIZZARD_MS = 120;
const BLIZZARD_SPREAD = 1400;
// a bill's flight, FLY_MS give or take FLY_SPREAD, bowing up past the gun
const FLY_MS = 300;
const FLY_SPREAD = 0.25;
const BOW_UP: [number, number] = [200, 600];
const BILL = 150;
const TILT = 0.7;
const FLUTTER = 0.05;
const FLASH_MS = 120;
const FLASH = 150;
const POP_BLAST = 90;
const SLAM_LAG_MS = 60;
// shakes by step: a volley landing, the blizzard
const SHAKES = [0.8, 2.6];

interface Bill {
  at: number;
  fly: number;
  from: Point;
  pull: Point;
  to: Point;
  tilt: number;
  phase: number;
}
interface Gun {
  home: Point;
  aim: number;
  // every time it fires, in order
  fires: number[];
  path: (ms: number) => Point;
}
interface MoneyGun {
  guns: Gun[];
  bills: Bill[];
  // each volley's landing time and spot on the total
  pops: { at: number; to: Point }[];
  slamAt: number;
}
const moneyGuns = new WeakMap<Running, MoneyGun>();
const origin: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

function planMoneyGun(to: Point): MoneyGun {
  const fireFrom = SET_FROM_MS + SET_MS + 60;
  const volleyAt: number[] = [];
  let at = fireFrom;
  for (let k = 0; k < VOLLEYS; k++) {
    volleyAt.push(at);
    at += lerp(GAP_MS[0], GAP_MS[1], k / (VOLLEYS - 1));
  }
  const blizzardAt = at + BLIZZARD_LAG_MS;
  const guns: Gun[] = [-1, 1].map((side, g) => {
    const home = { x: to.x + side * GUN_X, y: lerp(0, to.y, GUN_AT) };
    const fires = volleyAt.filter((_, k) => k % 2 === g);
    fires.push(blizzardAt);
    const point: Point = { x: 0, y: 0 };
    return {
      home,
      aim: Math.atan2(to.y - home.y, to.x - home.x),
      fires,
      path: (ms) => {
        const u = clamp01((ms - SET_FROM_MS) / SET_MS);
        let kick = 0;
        for (const f of fires)
          if (ms >= f) kick = Math.max(kick, Math.exp(-(ms - f) / RECOIL_MS));
        point.x = lerp(0, home.x, u);
        point.y =
          lerp(0, home.y, u) - 4 * u * (1 - u) * GUN_LIFT + RECOIL * kick;
        return point;
      },
    };
  });
  const bills: Bill[] = [];
  const addBill = (g: number, fired: number, i: number, n: number) => {
    const k = bills.length;
    const from = guns[g].home;
    const spread =
      (i / (n - 1) - 0.5) * (n > FAN ? BLIZZARD_SPREAD : FAN_SPREAD);
    bills.push({
      at: fired,
      fly: FLY_MS * (1 - FLY_SPREAD + 2 * FLY_SPREAD * holeHash(k, 4731)),
      from,
      pull: {
        x: from.x + spread,
        y: from.y - lerp(BOW_UP[0], BOW_UP[1], holeHash(k, 4732)),
      },
      to: readoutSpot(to, k, 4733),
      tilt: (holeHash(k, 4734) - 0.5) * TILT,
      phase: Math.floor(holeHash(k, 4735) * BILL_SPIN_FRAME_COUNT),
    });
  };
  const pops: { at: number; to: Point }[] = [];
  volleyAt.forEach((fired, k) => {
    for (let i = 0; i < FAN; i++) addBill(k % 2, fired, i, FAN);
    pops.push({ at: fired + FLY_MS, to: readoutSpot(to, k, 4736) });
  });
  for (let g = 0; g < guns.length; g++)
    for (let i = 0; i < BLIZZARD; i++)
      addBill(g, blizzardAt + (i * BLIZZARD_MS) / BLIZZARD, i, BLIZZARD);
  let slamAt = 0;
  for (const b of bills) slamAt = Math.max(slamAt, b.at + b.fly);
  return { guns, bills, pops, slamAt: slamAt + SLAM_LAG_MS };
}

// bill b's spot u 0..1 through its flight: bowing up past its gun, then
// down onto the total
function billAt(b: Bill, u: number): Point {
  const v = 1 - u;
  spot.x = v * v * b.from.x + 2 * v * u * b.pull.x + u * u * b.to.x;
  spot.y = v * v * b.from.y + 2 * v * u * b.pull.y + u * u * b.to.y;
  return spot;
}

registerFloorCrit("moneyGunCrit", {
  plan(r, bars, hit) {
    const m = planMoneyGun(bars[0]);
    moneyGuns.set(r, m);
    for (const pop of m.pops) hit(0, pop.at);
    hit(0, m.slamAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const m = moneyGuns.get(r);
    if (!m) return;
    const now = r.startedAt + ms;
    drawNumberShrink(ctx, r, ms);
    drawDetonation(ctx, origin, ms - SET_FROM_MS, OPEN_BLAST, now);

    const frames = billFrames();
    if (frames.length > 0) {
      const h = BILL * 2;
      const w = (h * frames[0].width) / frames[0].height;
      for (const b of m.bills) {
        const u = (ms - b.at) / b.fly;
        if (u < 0 || u >= 1) continue;
        const at = billAt(b, u);
        const frame =
          (b.phase + Math.floor((ms - b.at) * FLUTTER)) % BILL_SPIN_FRAME_COUNT;
        ctx.save();
        ctx.translate(at.x, at.y);
        ctx.rotate(Math.PI / 2 + b.tilt * u);
        ctx.drawImage(frames[frame], -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    for (const gun of m.guns) {
      if (ms >= SET_FROM_MS && ms < m.slamAt) {
        const at = gun.path(ms);
        for (const f of gun.fires)
          drawMuzzleFlash(ctx, at, gun.aim, (ms - f) / FLASH_MS, FLASH);
      }
      drawWispBetween(
        ctx,
        gun.path,
        ms,
        now,
        GUN,
        GUN_HEAT,
        SET_FROM_MS,
        m.slamAt,
      );
    }
    for (const pop of m.pops)
      drawDetonation(ctx, pop.to, ms - pop.at, POP_BLAST, now);
    drawFinale(ctx, bars[0], ms - m.slamAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
