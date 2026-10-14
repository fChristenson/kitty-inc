// Spillway, a lock crit: the number bursts into a wisp that dives into the
// dark locked floor with a river of coins pouring after it, races laps round
// the room, quicker each, a jolt every lap, the river following its every
// turn; then it smashes into the lock and the floor bursts open, and it
// streaks onto the new bar with the whole river pouring in behind it: the
// bar runs fast for its first payouts
import meta from "./meta";
import { countDown, defineBarEffect } from "../../../rateCrits/rateBonus";
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
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// the dive from the flash into the room's left end over DIVE_MS, bowed BOW up
const DIVE_MS = 260;
const BOW = 260;
// the laps round the room: LAPS of them over LAPS_MS, quicker each (a lap's
// share of the time is to PACE), on a ring ROOM_W of the room's width
// across and ROOM_H of its height tall
const LAPS = 3;
const LAPS_MS = 1050;
const PACE = 1.6;
const ROOM_W = 0.42;
const ROOM_H = 0.22;
// the smash into the lock, the hold as it bursts, the streak onto the bar
// and along it
const SMASH_MS = 130;
const HOLD_MS = 120;
const TO_BAR_MS = 150;
const ALONG_MS = 230;
const BAR_INSET = 60;
// the river: COINS coins LAG ms apart on the wisp's path, COIN px; a jolt
// every POUR_EVERY coins into the bar
const COINS = 100;
const LAG = 6;
const COIN = 26;
const COIN_SPIN = 0.02;
const POUR_EVERY = 25;
const WISP = WISP_SIZE * 1.5;
const LAP_BLAST = 90;
const SMASH_BLAST = 300;
const POUR_BLAST = 90;
const LAST_BLAST = 240;
// shakes by step: a lap or a pour, the floor bursting open, the bar
const SHAKES = [0.5, 3, 1.2];

const DIVE_END = IN_MS + DIVE_MS;
const LAPS_END = DIVE_END + LAPS_MS;
const OPEN_MS = LAPS_END + SMASH_MS;
const BAR_MS = OPEN_MS + HOLD_MS + TO_BAR_MS;
const END_MS = BAR_MS + ALONG_MS;
const LAST_MS = END_MS + (COINS - 1) * LAG;

const sprites: CoinBurstSprite[] = Array.from({ length: COINS }, (_, i) => ({
  kind: i % 5 === 0 ? "bill" : "coin",
  spinFrame: 0,
  axisAngle: (holeHash(i, 2410) - 0.5) * Math.PI,
}));

// the opened floor's bar running fast for its first payouts
const rushes = defineBarEffect<number>({
  speed: () => meta.values.speed,
  onPayout: countDown,
});

interface Plan {
  // from the lock's middle: where it set off, the room's ring, the bar
  from: Point;
  room: Point;
  rx: number;
  ry: number;
  barStart: Point;
  barEnd: Point;
  wisp: (ms: number) => Point | null;
}
const plans = new WeakMap<Running, Plan>();
const coin: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// the wisp's path at t ms, from the lock's middle
function pathAt(plan: Plan, t: number, into: Point): Point | null {
  if (t < IN_MS || t > END_MS) return null;
  const { from, room, rx, ry, barStart, barEnd } = plan;
  const left = room.x - rx;
  if (t < DIVE_END) {
    const u = (t - IN_MS) / DIVE_MS;
    const v = 1 - u;
    const cx = (from.x + left) / 2;
    const cy = Math.min(from.y, room.y) - BOW;
    into.x = v * v * from.x + 2 * v * u * cx + u * u * left;
    into.y = v * v * from.y + 2 * v * u * cy + u * u * room.y;
  } else if (t < LAPS_END) {
    const u = ((t - DIVE_END) / LAPS_MS) ** PACE;
    const a = Math.PI + LAPS * Math.PI * 2 * u;
    into.x = room.x + Math.cos(a) * rx;
    into.y = room.y + Math.sin(a) * ry;
  } else if (t < OPEN_MS) {
    const u = ((t - LAPS_END) / SMASH_MS) ** 2;
    into.x = lerp(left, 0, u);
    into.y = lerp(room.y, 0, u);
  } else if (t < OPEN_MS + HOLD_MS) {
    into.x = 0;
    into.y = 0;
  } else if (t < BAR_MS) {
    const u = (t - OPEN_MS - HOLD_MS) / TO_BAR_MS;
    into.x = barStart.x * u;
    into.y = barStart.y * u;
  } else {
    const u = clamp01((t - BAR_MS) / ALONG_MS) ** 1.5;
    into.x = lerp(barStart.x, barEnd.x, u);
    into.y = barStart.y;
  }
  return into;
}

registerFloorCrit("spillwayCrit", {
  // its bar running fast for its first payouts
  reward(t) {
    const { speed, payouts } = meta.values;
    t.flipRate();
    rushes.set(t.floor, (rushes.get(t.floor) ?? 0) + payouts);
    t.punch(`x${speed} Speed`);
  },
  plan(r, bars, hit) {
    const lock = getLockCenter();
    const box = getIncomeBarBox(false);
    const barY = box.y + box.height / 2 - lock.y;
    const width = FLOOR_X_MAX - FLOOR_X_MIN;
    const at: Point = { x: 0, y: 0 };
    const plan: Plan = {
      from: { x: -bars[0].x, y: -bars[0].y },
      room: { x: (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x, y: 0 },
      rx: width * ROOM_W,
      ry: FLOOR_H * ROOM_H,
      barStart: { x: box.x + BAR_INSET - lock.x, y: barY },
      barEnd: { x: box.x + box.width - BAR_INSET - lock.x, y: barY },
      wisp: (ms) => pathAt(plan, ms, at),
    };
    plans.set(r, plan);
    for (let k = 1; k <= LAPS; k++)
      hit(0, DIVE_END + LAPS_MS * (k / LAPS) ** (1 / PACE), 0);
    hit(0, OPEN_MS, 1);
    hit(0, END_MS, 2);
    for (let k = POUR_EVERY; k < COINS; k += POUR_EVERY)
      hit(0, END_MS + k * LAG, 0);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    ctx.save();
    ctx.translate(lock.x, lock.y);
    // the river behind the wisp, its tail last
    if (ms > IN_MS && ms < LAST_MS) {
      const base = ctx.getTransform();
      beginCoinBatch(ctx);
      for (let k = 0; k < COINS; k++) {
        if (!pathAt(plan, ms - k * LAG, coin)) continue;
        const sprite = sprites[k];
        sprite.spinFrame = ms * COIN_SPIN + k;
        drawCoinBurstFrame(ctx, sprite, coin.x, coin.y, COIN, base);
      }
      endCoinBatch(ctx);
    }
    drawWispBetween(ctx, plan.wisp, ms, now, WISP, 0.7, IN_MS, END_MS);
    spot.x = plan.room.x - plan.rx;
    spot.y = plan.room.y;
    for (let k = 1; k <= LAPS; k++)
      drawDetonation(
        ctx,
        spot,
        ms - DIVE_END - LAPS_MS * (k / LAPS) ** (1 / PACE),
        LAP_BLAST,
        now,
      );
    spot.x = 0;
    spot.y = 0;
    drawDetonation(ctx, spot, ms - OPEN_MS, SMASH_BLAST, now);
    for (let k = POUR_EVERY; k < COINS; k += POUR_EVERY)
      drawDetonation(ctx, plan.barEnd, ms - END_MS - k * LAG, POUR_BLAST, now);
    drawDetonation(ctx, plan.barEnd, ms - LAST_MS, LAST_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
