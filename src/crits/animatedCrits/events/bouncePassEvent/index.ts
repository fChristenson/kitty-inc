// the "Bounce Pass" event (bounce; worker perma tiers): it covers its crit,
// whose click freezes the screen while a ball wisp is fired out of the
// clicked floor's button and bounce-passed from worker to worker like a
// basketball, every pass slammed down off the floor between them with a
// splash and a boing and caught with a flash and a jolt that lights the
// worker up a perma tier, the passes snapping quicker and harder; the last
// catch goes off in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBounceSplash, hops, type Bounce } from "../../../../shared/bounce";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "bouncePass";
const MAX_WORKERS = 6;
const HEAD = 30;
const DROP = 90;
const LIFT: [number, number] = [30, 10];
const BALL = 0.4;
const SPLASH = 90;
const CATCH_SPLASH = 70;
const HIT_SHAKE: [number, number] = [0.5, 1.2];

interface Catch {
  worker: RewardWorker;
  bounce: Bounce;
}

export const forceBouncePassEvent = registerWispEvent(
  KEY,
  "Bounce Pass",
  () => CONFIG.bouncePassEvent.chance,
  (floor, context) => {
    const { legMs, holdMs, mergeMs } = CONFIG.bouncePassEvent;
    const found = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (found.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // nearest worker next, starting from the button
    const workers: RewardWorker[] = [];
    let from: Point = button;
    const left = found.slice();
    while (left.length) {
      let best = 0;
      for (let i = 1; i < left.length; i++)
        if (
          Math.hypot(left[i].at.x - from.x, left[i].at.y - from.y) <
          Math.hypot(left[best].at.x - from.x, left[best].at.y - from.y)
        )
          best = i;
      const w = left.splice(best, 1)[0];
      workers.push(w);
      from = w.at;
    }
    // every pass goes down off the floor midway, then up into the hands
    const points: Point[] = [button];
    for (const w of workers) {
      const a = points[points.length - 1];
      const b = { x: w.at.x, y: w.at.y - HEAD };
      points.push({ x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + DROP }, b);
    }
    const path = hops(points, legMs, LIFT, 0);
    const floors = path.bounces.filter((_, i) => i % 2 === 0);
    const catches: Catch[] = workers.map((worker, k) => ({
      worker,
      bounce: path.bounces[k * 2 + 1],
    }));
    const last = catches[catches.length - 1];
    const endAt = path.endMs;

    const bouncing = createBeats(
      floors,
      (b) => b.ms,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const catching = createBeats(
      catches,
      (c) => c.bounce.ms,
      (c, k) => {
        cover!.promote(c.worker);
        if (c === last) {
          cover!.blast(c.worker.at);
          return;
        }
        cover!.burst(c.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, catches.length - 1)));
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
          bouncing.tick(ms, now);
          catching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const b of floors)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          for (const c of catches)
            drawBounceSplash(
              ctx,
              c.bounce,
              ms - c.bounce.ms,
              CATCH_SPLASH,
              now,
            );
          drawWispBetween(ctx, path.at, ms, now, WISP_SIZE * BALL, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
