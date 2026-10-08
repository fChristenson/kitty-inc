// the "Pelican" event (mix; free hires and cash): it covers its crit, whose
// click freezes the screen while cash gushes out of the clicked floor's
// button into a big pool along the bottom of the screen; a pelican wisp
// swoops low over it, skimming up a pouchful that drags along behind it in
// a ball of coins, flies to an empty spot and dumps it in a gush of cash: a
// splash, a jolt and a new worker forms there; then back for the next scoop,
// each trip quicker, the last dump landing in a big blast. Pays floor income
// × floor number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutCubic,
  lerp,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "pelican";
const REWARD = 2;
const MAX_HIRES = 4;
const FORM_MS = 300;
const POOL_COINS = 720;
const POOL_BOTTOM = 90;
const POOL_HALF_H = 34;
const POOL_EDGE = 80;
// the pouch: a ball of coins this wide, its coins trailing up to LAG ms
const POUCH = 30;
const LAG = 90;
const JOIN_MS = 110;
const ABOVE = 70;
const COIN = 0.75;
// of each trip: swooping down, skimming the pool, climbing to the spot
const SWOOP = 0.3;
const SKIM = 0.3;
const SPLASH_SHAKE: [number, number] = [0.6, 1.1];
const BIRD = 0.55;

interface Leg {
  a: Point;
  c: Point;
  b: Point;
  from: number;
  to: number;
  ease: (t: number) => number;
}

const flat = (t: number) => t;

export const forcePelicanEvent = registerWispEvent(
  KEY,
  "Pelican",
  () => CONFIG.pelicanEvent.chance,
  (floor, context, area) => {
    const { fillMs, tripsMs, gushMs, holdMs, mergeMs } = CONFIG.pelicanEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const poolY = area.bottom - POOL_BOTTOM;
    const poolLeft = area.left + POOL_EDGE;
    const poolRight = area.right - POOL_EDGE;
    const legs: Leg[] = [];
    let clock = fillMs * 0.5;
    let from: Point = button;
    const trips = hires.map((hire, k) => {
      const t = k / Math.max(1, hires.length - 1);
      const trip = lerp(tripsMs, t);
      const ltr = k % 2 === 0;
      const enter: Point = { x: ltr ? poolLeft : poolRight, y: poolY - 10 };
      const leave: Point = { x: ltr ? poolRight : poolLeft, y: poolY - 10 };
      const spot: Point = { x: hire.x, y: hire.y - ABOVE };
      const skims = clock + trip * SWOOP;
      const climbs = skims + trip * SKIM;
      const dumps = clock + trip;
      legs.push({
        a: from,
        c: { x: from.x, y: poolY },
        b: enter,
        from: clock,
        to: skims,
        ease: easeIn,
      });
      legs.push({
        a: enter,
        c: { x: (enter.x + leave.x) / 2, y: poolY + 30 },
        b: leave,
        from: skims,
        to: climbs,
        ease: flat,
      });
      legs.push({
        a: leave,
        c: { x: leave.x, y: spot.y },
        b: spot,
        from: climbs,
        to: dumps,
        ease: easeOut,
      });
      clock = dumps;
      from = spot;
      return {
        hire,
        ltr,
        spot,
        skims,
        climbs,
        dumps,
        lands: dumps + gushMs,
        t,
      };
    });
    const last = trips[trips.length - 1];
    const endAt = last.lands;
    const head: Point = { x: 0, y: 0 };
    const bird = (ms: number, into: Point = head): Point => {
      const t = Math.max(0, ms);
      let leg = legs[0];
      for (const l of legs) if (t >= l.from) leg = l;
      return bezier(
        leg.a,
        leg.c,
        leg.b,
        leg.ease(clamp01((t - leg.from) / (leg.to - leg.from))),
        into,
      );
    };

    // each pool coin is scooped on one trip, as the pelican skims over it
    const paths: CoinPath[] = Array.from({ length: POOL_COINS }, (_, i) => {
      const trip = trips[i % trips.length];
      const u = Math.random();
      const spot: Point = {
        x: lerp([poolLeft, poolRight], u),
        y:
          poolY + (Math.random() * 2 - 1) * POOL_HALF_H * Math.sin(Math.PI * u),
      };
      const pours = fillMs * Math.random() * 0.8;
      const joins =
        trip.skims + (trip.climbs - trip.skims) * (trip.ltr ? u : 1 - u);
      const angle = Math.random() * Math.PI * 2;
      const r = POUCH * Math.sqrt(Math.random());
      const dx = Math.cos(angle) * r;
      const dy = Math.sin(angle) * r;
      const lag = LAG * Math.random();
      const target: Point = {
        x: trip.hire.x + dx * 2.2,
        y: trip.hire.y + dy * 0.8,
      };
      const pouch: Point = { x: 0, y: 0 };
      const dumped = bird(trip.dumps - lag, { x: 0, y: 0 });
      const out: Point = { x: dumped.x + dx, y: dumped.y + dy };
      return (f) => {
        const ms = f * endAt;
        if (ms < pours) return { x: button.x, y: button.y, scale: 0 };
        if (ms < fillMs) {
          const p = easeOutCubic(clamp01((ms - pours) / (fillMs * 0.2)));
          return {
            x: lerp([button.x, spot.x], p),
            y: lerp([button.y, spot.y], p) - Math.sin(Math.PI * p) * 120,
            scale: COIN,
          };
        }
        if (ms < joins)
          return {
            x: spot.x,
            y: spot.y + Math.sin(ms * 0.012 + spot.x * 0.05) * 4,
            scale: COIN,
          };
        if (ms < trip.dumps) {
          bird(ms - lag, pouch);
          const b = clamp01((ms - joins) / JOIN_MS);
          return {
            x: lerp([spot.x, pouch.x + dx], b),
            y: lerp([spot.y, pouch.y + dy], b),
            scale: COIN,
          };
        }
        const g = clamp01((ms - trip.dumps) / gushMs);
        const e = easeIn(g);
        return {
          x: lerp([out.x, target.x], e),
          y: lerp([out.y, target.y], e),
          scale: COIN * (1 - g * g),
        };
      };
    });

    const swooping = createBeats(
      trips,
      (tr) => tr.skims,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const dumping = createBeats(
      trips,
      (tr) => tr.lands,
      (tr) => {
        giveHire(tr.hire);
        const at: Point = { x: tr.hire.x, y: tr.hire.y };
        if (tr === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SPLASH_SHAKE, tr.t));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          swooping.tick(ms, now);
          dumping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          drawWispBetween(
            ctx,
            bird,
            ms,
            now,
            WISP_SIZE * BIRD,
            0.7,
            fillMs * 0.5,
            last.dumps,
          );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
