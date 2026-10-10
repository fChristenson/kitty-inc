// the "Snowplow" event (clutter; a free floor): it covers its crit, whose
// click freezes the screen while gold glitter snows down over the whole
// screen in rays fanning out from its middle; then two big plough wisps
// clear it like snowplows, driving in from both sides along one lane after
// another, bottom to top, each pass a whoosh and a jolt, shoving the
// glitter ahead of them into a ridge down the middle; then one ploughs up
// the ridge from the bottom and the other down from the top, heaping it all
// onto the locked floor's lock, which bursts open in a huge blast: the
// floor unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawWisp, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  heapSpots,
  scatterRays,
  simulateClean,
  type Plough,
} from "../../../../shared/clutter";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "snowplow";
const BITS = 380;
const BIT = 10;
const MARGIN = 40;
const LANES = 6;
// a plough's radius, of the lanes' spacing (over half, so they overlap)
const RADIUS = 0.6;
// px the ploughs stop short of the middle, and of the lock
const GAP = 12;
// the plough wisp's size, of its radius
const SIZE = 0.45;
const SNOW_DROP = 260;
const HEAP_W = 140;
const HEAP_H = 100;
// a lift back out swoops this share of the lanes' spacing over
const LIFT_BEND = 0.3;
const SNOW_SHAKE = 0.5;
const PASS_SHAKE: [number, number] = [0.35, 0.9];
const RIDGE_SHAKE = 1.2;

interface Leg {
  from: Point;
  to: Point;
  starts: number;
  ends: number;
  // a lift back out: it doesn't plough, and swoops over
  lift: boolean;
}

// a plough's route: its legs back to back, eased within each pass
function route(legs: Leg[], lift: number) {
  const spot: Point = { x: 0, y: 0 };
  const bend: Point = { x: 0, y: 0 };
  const where = (ms: number, ploughing: boolean): Point | null => {
    const leg = legs.find((l) => ms < l.ends) ?? legs[legs.length - 1];
    if (ms < legs[0].starts || ms > legs[legs.length - 1].ends) return null;
    if (ploughing && leg.lift) return null;
    const u = clamp01((ms - leg.starts) / (leg.ends - leg.starts));
    if (leg.lift) {
      bend.x = (leg.from.x + leg.to.x) / 2;
      bend.y = Math.min(leg.from.y, leg.to.y) - lift;
      return bezier(leg.from, bend, leg.to, smoothstep(u), spot);
    }
    spot.x = lerp([leg.from.x, leg.to.x], smoothstep(u));
    spot.y = lerp([leg.from.y, leg.to.y], smoothstep(u));
    return spot;
  };
  return {
    plough: (ms: number, into: Point): Point | null => {
      const p = where(ms, true);
      if (!p) return null;
      into.x = p.x;
      into.y = p.y;
      return into;
    },
    // drawn from its first leg's start, held there before it
    at: (ms: number): Point | null =>
      where(Math.max(legs[0].starts, ms), false),
  };
}

export const forceSnowplowEvent = registerWispEvent(
  KEY,
  "Snowplow",
  () => CONFIG.snowplowEvent.chance,
  (floor, context, area) => {
    const { snowMs, passMs, liftMs, ridgeMs, gatherMs, holdMs, mergeMs } =
      CONFIG.snowplowEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const box = {
      left: area.left + MARGIN,
      top: area.top + MARGIN,
      right: area.right - MARGIN,
      bottom: area.bottom - MARGIN,
    };
    const spots = scatterRays(box, BITS);
    const falls = spots.map(() => Math.random() * snowMs * 0.6);
    const fallMs = snowMs * 0.4;

    // lanes bottom to top, so what spills over a plough's top edge lands in
    // a lane still to come
    const spacing = (box.bottom - box.top) / LANES;
    const radius = spacing * RADIUS;
    const lanes = Array.from(
      { length: LANES },
      (_, k) => box.bottom - spacing * (k + 0.5),
    );
    const midX = lock.x;
    const leftOut = area.left - radius * 1.5;
    const rightOut = area.right + radius * 1.5;
    const legsA: Leg[] = [];
    const legsB: Leg[] = [];
    let clock: number = snowMs;
    lanes.forEach((y, k) => {
      const pass = lerp(passMs, k / Math.max(1, lanes.length - 1));
      legsA.push({
        from: { x: leftOut, y },
        to: { x: midX - radius - GAP, y },
        starts: clock,
        ends: clock + pass,
        lift: false,
      });
      legsB.push({
        from: { x: rightOut, y },
        to: { x: midX + radius + GAP, y },
        starts: clock,
        ends: clock + pass,
        lift: false,
      });
      clock += pass;
      const next = lanes[k + 1];
      const backA: Point =
        next === undefined
          ? { x: midX, y: area.bottom + radius }
          : { x: leftOut, y: next };
      const backB: Point =
        next === undefined
          ? { x: midX, y: area.top - radius }
          : { x: rightOut, y: next };
      legsA.push({
        from: legsA[legsA.length - 1].to,
        to: backA,
        starts: clock,
        ends: clock + liftMs,
        lift: true,
      });
      legsB.push({
        from: legsB[legsB.length - 1].to,
        to: backB,
        starts: clock,
        ends: clock + liftMs,
        lift: true,
      });
      clock += liftMs;
    });
    const passes = legsA.filter((l) => !l.lift).map((l) => l.starts);
    // up the ridge from below and down it from above, onto the lock
    const ridgeAt = clock;
    legsA.push({
      from: { x: midX, y: area.bottom + radius },
      to: { x: midX, y: lock.y + radius + GAP },
      starts: clock,
      ends: clock + ridgeMs,
      lift: false,
    });
    legsB.push({
      from: { x: midX, y: area.top - radius },
      to: { x: midX, y: lock.y - radius - GAP },
      starts: clock,
      ends: clock + ridgeMs,
      lift: false,
    });
    const heapedAt = clock + ridgeMs;
    const a = route(legsA, spacing * LIFT_BEND);
    const b = route(legsB, spacing * LIFT_BEND);
    const ploughs: Plough[] = [
      { kind: "plough", at: a.plough, radius },
      { kind: "plough", at: b.plough, radius },
    ];
    const swept = simulateClean(spots, ploughs, snowMs, heapedAt);
    const heap = heapSpots(
      { x: lock.x, y: lock.y + HEAP_H / 2 },
      spots.length,
      HEAP_W,
      HEAP_H,
    );
    const burstAt = heapedAt + gatherMs;

    const snowing = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(SNOW_SHAKE);
      },
    );
    const passing = createBeats(
      passes,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const ridging = createBeats(
      [ridgeAt, heapedAt],
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        if (ms === ridgeAt) playSwoosh();
        else playBloop();
        shakeScreen(RIDGE_SHAKE);
      },
    );
    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const bit: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: burstAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          snowing.tick(ms, now);
          passing.tick(ms, now);
          ridging.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > burstAt) return;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          const gather = easeOut(clamp01((ms - heapedAt) / gatherMs));
          for (let i = 0; i < spots.length; i++) {
            if (ms < falls[i]) continue;
            if (ms < snowMs) {
              const u = easeIn(clamp01((ms - falls[i]) / fallMs));
              bit.x = spots[i].x;
              bit.y = spots[i].y - SNOW_DROP * (1 - u);
            } else if (ms < heapedAt) {
              swept.at(i, ms, bit);
            } else {
              const end = swept.end(i);
              bit.x = lerp([end.x, heap[i].x], gather);
              bit.y = lerp([end.y, heap[i].y], gather);
            }
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              BIT,
              i * 1.3 + ms * 0.004,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          endLightBatch(ctx);
          ctx.restore();
          if (ms >= snowMs - 200 && ms <= heapedAt + 200) {
            drawWisp(ctx, a.at, ms, now, radius * SIZE, 0.4);
            drawWisp(ctx, b.at, ms, now, radius * SIZE, 0.4);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
