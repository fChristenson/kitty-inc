// the "Swing Ride" event (wisp; worker perma tiers): it covers its crit,
// whose click freezes the screen while wisp riders burst out of the clicked
// floor's button onto a swing ride whirling over the screen, flying out
// wider and wider on their unseen chains as it spins up, every lap a whoosh
// and a jolt; then the chains snap one after another and each rider is
// flung off along its swing, curving down onto a worker that lights up a
// perma tier with a flash, a bang and a jolt; the last lands in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "swingRide";
const MAX_WORKERS = 6;
// the ride hangs HUB of the way down the screen; its riders swing out from
// SWING px to OUT of the screen's half-width, seen from TILT above
const HUB = 0.32;
const SWING = 50;
const OUT = 0.8;
const TILT = 0.35;
const LAPS: [number, number] = [0.4, 1.6];
// a flung rider flies FLING px along its swing before curving in
const FLING = 220;
const RIDER = 0.6;
const LAND_SHAKE: [number, number] = [0.6, 1.4];

export const forceSwingRideEvent = registerWispEvent(
  KEY,
  "Swing Ride",
  () => CONFIG.swingRideEvent.chance,
  (floor, context, area) => {
    const { spinMs, snapsMs, flyMs, holdMs, mergeMs } = CONFIG.swingRideEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * HUB,
    };
    const out = ((area.right - area.left) / 2) * OUT;
    const count = workers.length;
    const turn = (ms: number): number => {
      // flat out once spun up
      if (ms > spinMs)
        return turn(spinMs) + Math.PI * 2 * LAPS[1] * ((ms - spinMs) / 1000);
      const s = Math.max(0, ms) / 1000;
      return (
        Math.PI *
        2 *
        (LAPS[0] * s + ((LAPS[1] - LAPS[0]) * s * s) / (2 * (spinMs / 1000)))
      );
    };
    const radius = (ms: number) =>
      lerp([SWING, out], easeIn(clamp01(ms / spinMs)));
    const seat = (i: number, ms: number, into: Point): Point => {
      const a = (i / count) * Math.PI * 2 + turn(ms);
      const r = radius(ms);
      into.x = hub.x + Math.cos(a) * r;
      into.y = hub.y + Math.sin(a) * r * TILT;
      return into;
    };
    // each rider takes the worker nearest where it's flung from
    const free = [...workers];
    const riders = Array.from({ length: count }, (_, i) => {
      const snapsAt = spinMs + lerp(snapsMs, i / Math.max(1, count - 1)) * i;
      const from = seat(i, snapsAt, { x: 0, y: 0 });
      const a = (i / count) * Math.PI * 2 + turn(snapsAt);
      // the swing's heading at the snap, along the ellipse
      const tx = -Math.sin(a);
      const ty = Math.cos(a) * TILT;
      const tl = Math.hypot(tx, ty) || 1;
      const ahead: Point = {
        x: from.x + (tx / tl) * FLING,
        y: from.y + (ty / tl) * FLING,
      };
      let best = 0;
      for (let k = 1; k < free.length; k++)
        if (
          Math.hypot(free[k].at.x - ahead.x, free[k].at.y - ahead.y) <
          Math.hypot(free[best].at.x - ahead.x, free[best].at.y - ahead.y)
        )
          best = k;
      const worker = free.splice(best, 1)[0];
      const at: Point = { x: 0, y: 0 };
      const landsAt = snapsAt + flyMs;
      return {
        worker,
        snapsAt,
        landsAt,
        at: (ms: number): Point | null => {
          if (ms < 0 || ms > landsAt) return null;
          if (ms < snapsAt) {
            seat(i, ms, at);
            if (ms < 200) {
              const u = easeOut(ms / 200);
              at.x = lerp([button.x, at.x], u);
              at.y = lerp([button.y, at.y], u);
            }
            return at;
          }
          return bezier(
            from,
            ahead,
            worker.at,
            easeIn((ms - snapsAt) / flyMs),
            at,
          );
        },
      };
    });
    const endAt = Math.max(...riders.map((r) => r.landsAt));
    const landings = [...riders].sort((a, b) => a.landsAt - b.landsAt);
    // a whoosh every lap
    const laps: number[] = [];
    for (let ms = 0, lap = 1; ms < spinMs; ms += 10)
      if (turn(ms) >= lap * Math.PI * 2) {
        laps.push(ms);
        lap++;
      }

    const lapping = createBeats(
      laps,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(0.4 + 0.3 * k);
      },
    );
    const landing = createBeats(
      landings,
      (r) => r.landsAt,
      (r, k) => {
        cover!.promote(r.worker);
        if (k === landings.length - 1) {
          cover!.blast(r.worker.at);
          return;
        }
        cover!.burst(
          r.worker.at,
          0.5 + 0.3 * (k / Math.max(1, landings.length - 1)),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, landings.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          lapping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / spinMs);
          for (const r of riders)
            drawWispBetween(
              ctx,
              r.at,
              ms,
              now,
              WISP_SIZE * RIDER,
              heat,
              0,
              r.landsAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
