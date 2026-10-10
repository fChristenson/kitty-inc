// the sticky darts income crit: the number drops to a launcher at the bottom
// of the screen that fires a dozen darts up into the total, each sticking in
// the readout with a lit fuse; once all are in they go off in a chain from
// one end to the other, and the huge blast in the middle
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/explosion";
import { drawBeam } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { smoothstep } from "../../../../shared/easing";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
} from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const DROP_MS = 240;
const FIRE_MS = DROP_MS + 60;
const DARTS = 12;
const GAP_MS: [number, number] = [80, 45];
const FLY_MS = 220;
const LIT_DELAY_MS = 160;
const CHAIN_EVERY_MS = 45;
const LAST_DELAY_MS = 60;
// the launcher: up from the screen's bottom (as far under the middle as
// this share of the total's height over it), firing from just over itself
const BOTTOM = 0.75;
const GUN_UP = 140;
const MUZZLE_UP = 40;
// a dart's streak as a share of its flight
const STREAK = 0.15;
const DART_WIDTH = 12;
const FLASH_MS = 70;
const FLASH = 100;
const LAUNCHER = WISP_SIZE * 1.3;
const LAUNCHER_HEAT = 0.8;
const STUCK = WISP_SIZE * 0.6;
const STUCK_HEAT = 0.7;
const FUSE = 40;
const THUNK_BLAST = 70;
const CHAIN_BLAST = 180;
const THUNK_KICK = 0.3;
// shakes by step: a dart going off, the last
const SHAKES = [0.8, 2.4];

interface Dart {
  at: number;
  stick: number;
  to: Point;
  blow: number;
  stuck: () => Point;
}
interface Volley {
  gun: Point;
  muzzle: Point;
  darts: Dart[];
  litAt: number;
  endAt: number;
  launcher: (ms: number) => Point;
}
const volleys = new WeakMap<Running, Volley>();
const head: Point = { x: 0, y: 0 };
const tail: Point = { x: 0, y: 0 };

function planVolley(to: Point): Volley {
  const gun = { x: 0, y: -to.y * BOTTOM - GUN_UP };
  const muzzle = { x: gun.x, y: gun.y - MUZZLE_UP };
  const darts: Dart[] = [];
  let at = FIRE_MS;
  for (let k = 0; k < DARTS; k++) {
    const spot = readoutSpot(to, k, 261);
    darts.push({
      at,
      stick: at + FLY_MS,
      to: spot,
      blow: 0,
      stuck: () => spot,
    });
    at += lerp(GAP_MS[0], GAP_MS[1], k / (DARTS - 1));
  }
  const litAt = darts[DARTS - 1].stick + LIT_DELAY_MS;
  // they go off left to right along the readout
  const order = darts.slice().sort((a, b) => a.to.x - b.to.x);
  order.forEach((d, n) => (d.blow = litAt + n * CHAIN_EVERY_MS));
  const spot: Point = { x: 0, y: 0 };
  return {
    gun,
    muzzle,
    darts,
    litAt,
    endAt: litAt + DARTS * CHAIN_EVERY_MS + LAST_DELAY_MS,
    launcher: (ms) => {
      spot.x = gun.x;
      spot.y = gun.y * smoothstep(clamp01(ms / DROP_MS));
      return spot;
    },
  };
}

registerFloorCrit("stickyDartsCrit", {
  plan(r, bars, hit) {
    const volley = planVolley(bars[0]);
    volleys.set(r, volley);
    for (const d of volley.darts) hit(0, d.blow);
    hit(0, volley.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const volley = volleys.get(r);
    if (!volley) return;
    const now = r.startedAt + ms;
    const { darts, muzzle } = volley;
    drawNumberShrink(ctx, r, ms);
    // a thunk as each dart sticks
    while (r.kicked < darts.length && ms >= darts[r.kicked].stick) {
      r.kicked++;
      r.shake(THUNK_KICK);
    }
    drawWispBetween(
      ctx,
      volley.launcher,
      ms,
      now,
      LAUNCHER,
      LAUNCHER_HEAT,
      0,
      volley.litAt,
    );
    for (let k = 0; k < darts.length; k++) {
      const d = darts[k];
      drawMuzzleFlash(ctx, muzzle, -Math.PI / 2, (ms - d.at) / FLASH_MS, FLASH);
      if (ms >= d.at && ms < d.stick) {
        const u = (ms - d.at) / FLY_MS;
        const back = Math.max(0, u - STREAK);
        head.x = lerp(muzzle.x, d.to.x, u);
        head.y = lerp(muzzle.y, d.to.y, u);
        tail.x = lerp(muzzle.x, d.to.x, back);
        tail.y = lerp(muzzle.y, d.to.y, back);
        drawBeam(ctx, tail, head, DART_WIDTH, 1);
      }
      if (ms >= d.stick && ms < d.blow) {
        drawLitFuse(ctx, d.to, (ms - d.stick) / (d.blow - d.stick), FUSE, now);
        drawWispHead(ctx, d.stuck, ms, now, STUCK, STUCK_HEAT);
      }
      drawDetonation(ctx, d.to, ms - d.stick, THUNK_BLAST, now);
      drawDetonation(ctx, d.to, ms - d.blow, CHAIN_BLAST, now);
    }
    drawFinale(ctx, bars[0], ms - volley.endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
