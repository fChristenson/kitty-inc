// the "Lamplighter" event (wisp; worker perma tiers): it covers its crit,
// whose click freezes the screen while a dim little lamp wisp glows up over
// every worker; a lamplighter wisp bounds in from the side and hops from
// lamp to lamp, quicker with every hop, each lamp it lands on blazing up in
// a flash and a jolt that lights its worker up a perma tier; at the last
// lamp every lamp flares at once in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBounceSplash, hops } from "../../../../shared/bounce";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "lamplighter";
const MAX_WORKERS = 6;
const ABOVE = 80;
const LIFT: [number, number] = [120, 60];
const LIGHTER = 0.5;
const LAMP: [number, number] = [0.25, 0.55];
const BLAZE_MS = 180;
const SPLASH = 90;
const LIT_SHAKE: [number, number] = [0.5, 1.2];

interface Lamp {
  worker: RewardWorker;
  at: Point;
  lights: number;
}

export const forceLamplighterEvent = registerWispEvent(
  KEY,
  "Lamplighter",
  () => CONFIG.lamplighterEvent.chance,
  (floor, context, area) => {
    const { appearMs, hopMs, holdMs, mergeMs } = CONFIG.lamplighterEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    // left to right, nearest first from the side it comes in
    const sorted = workers.slice().sort((a, b) => a.at.x - b.at.x);
    const lampsAt = sorted.map((w) => ({ x: w.at.x, y: w.at.y - ABOVE }));
    const entry: Point = { x: area.left - 40, y: lampsAt[0].y - 120 };
    const path = hops([entry, ...lampsAt], hopMs, LIFT, appearMs);
    const lamps: Lamp[] = sorted.map((worker, k) => ({
      worker,
      at: lampsAt[k],
      lights: path.bounces[k].ms,
    }));
    const last = lamps[lamps.length - 1];
    const endAt = last.lights;
    const lampSpots = lamps.map((l) => () => l.at);

    const lighting = createBeats(
      lamps,
      (l) => l.lights,
      (lamp, k) => {
        cover!.promote(lamp.worker);
        if (lamp === last) {
          for (const l of lamps) if (l !== last) cover!.burst(l.at, 0.5);
          cover!.blast(lamp.at);
          return;
        }
        cover!.burst(lamp.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LIT_SHAKE, k / Math.max(1, lamps.length - 1)));
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
        tick: (ms, now) => lighting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const b of path.bounces)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          const shown = easeOut(clamp01(ms / appearMs));
          for (let k = 0; k < lamps.length; k++) {
            const lit = clamp01((ms - lamps[k].lights) / BLAZE_MS);
            drawWispBetween(
              ctx,
              lampSpots[k],
              ms,
              now,
              WISP_SIZE * lerp(LAMP, lit) * shown,
              lerp([0.2, 1], lit),
              0,
              endAt,
            );
          }
          drawWispBetween(
            ctx,
            path.at,
            ms,
            now,
            WISP_SIZE * LIGHTER,
            1,
            path.startMs,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
