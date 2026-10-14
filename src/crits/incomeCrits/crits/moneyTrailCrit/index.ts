// Money Trail, an income crit: the green amount bursts into a wisp that
// loops under the total, faster and faster, a river of cash pouring out
// behind it and following its every turn; it dives into the readout and the
// whole river pours in after it, coin after coin, a share every few, the
// last of it slamming in with the finale
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

// the wisp: easing from the flash into LOOPS loops BELOW the total, LOOP_W
// by LOOP_H, over LOOP_MS, quicker and quicker, then diving in over DIVE_MS
const EASE_MS = 300;
const BELOW = 300;
const LOOP_W = 330;
const LOOP_H = 150;
const LOOPS = 3;
const LOOP_MS = 1500;
const RUSH = 1.6;
const DIVE_MS = 160;
const WISP = WISP_SIZE * 1.6;
// the river: COINS coins, each SPACING ms behind the one before on the
// wisp's path, COIN px, a share every SHARE_EVERY coins in
const COINS = 110;
const SPACING = 9;
const COIN = 30;
const BILL_EVERY = 4;
const COIN_SPIN = 0.02;
const SHARE_EVERY = 10;
const POP = 90;
// shakes by step: a share, unused, the finale
const SHAKES = [0.4, 1, 2.4];

const sprites: CoinBurstSprite[] = Array.from({ length: COINS }, (_, i) => ({
  kind: i % BILL_EVERY === 0 ? "bill" : "coin",
  spinFrame: 0,
  axisAngle: (holeHash(i, 2400) - 0.5) * Math.PI,
}));
const DIVE_AT = EASE_MS + LOOP_MS;
const IN_AT = DIVE_AT + DIVE_MS;
const LAST_IN = IN_AT + (COINS - 1) * SPACING;

interface Plan {
  pops: Point[];
  popAt: number[];
}
const plans = new WeakMap<Running, Plan>();
const spot: Point = { x: 0, y: 0 };
const ORIGIN: Point = { x: 0, y: 0 };
let liveTo: Point = ORIGIN;

// the wisp's path at t ms, under the readout at `to`, into `into`; null
// once it's in
function pathAt(to: Point, t: number, into: Point): Point | null {
  if (t < 0 || t > IN_AT) return null;
  const cx = to.x;
  const cy = to.y + BELOW;
  const s = clamp01((t - EASE_MS) / LOOP_MS);
  const turn = (Math.PI * 2 * LOOPS * (s + RUSH * s * s)) / (1 + RUSH);
  // a figure of eight
  const lx = cx + Math.sin(turn) * LOOP_W;
  const ly = cy + Math.sin(turn * 2) * LOOP_H * 0.5;
  if (t < EASE_MS) {
    const u = t / EASE_MS;
    const e = u * u * (3 - 2 * u);
    into.x = lerp(ORIGIN.x, lx, e);
    into.y = lerp(ORIGIN.y, ly, e);
    return into;
  }
  if (t < DIVE_AT) {
    into.x = lx;
    into.y = ly;
    return into;
  }
  const u = ((t - DIVE_AT) / DIVE_MS) ** 2;
  into.x = lerp(lx, to.x, u);
  into.y = lerp(ly, to.y, u);
  return into;
}
const wispAt = (ms: number) => pathAt(liveTo, ms, spot);

registerFloorCrit("moneyTrailCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const pops: Point[] = [];
    const popAt: number[] = [];
    for (let i = SHARE_EVERY - 1; i < COINS - 1; i += SHARE_EVERY) {
      pops.push(readoutSpot(to, i, 2410));
      popAt.push(IN_AT + i * SPACING);
      hit(0, IN_AT + i * SPACING);
    }
    hit(0, LAST_IN, 2);
    plans.set(r, { pops, popAt });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    liveTo = to;
    drawNumberShrink(ctx, r, ms);
    // the river, drawn tail first so the coins nearest the wisp are on top
    if (ms < LAST_IN) {
      const base = ctx.getTransform();
      beginCoinBatch(ctx);
      for (let i = COINS - 1; i >= 0; i--) {
        const t = ms - (i + 1) * SPACING;
        if (!pathAt(to, t, spot)) continue;
        const coin = sprites[i];
        coin.spinFrame = ms * COIN_SPIN + i;
        drawCoinBurstFrame(ctx, coin, spot.x, spot.y, COIN, base);
      }
      endCoinBatch(ctx);
    }
    if (ms <= IN_AT) drawWisp(ctx, wispAt, ms, now, WISP, clamp01(ms / IN_AT));
    for (let k = 0; k < plan.pops.length; k++)
      drawDetonation(ctx, plan.pops[k], ms - plan.popAt[k], POP, now);
    drawDetonation(ctx, to, ms - IN_AT, POP * 1.6, now);
    drawFinale(ctx, to, ms - LAST_IN, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
