// the "Jumping Beans" event (bounce; worker perma tiers): it covers its
// crit, whose click freezes the screen while a bean wisp bounds in onto
// every worker's head and starts hopping on the spot, each hop higher and
// quicker than the last, every landing a splash and a boing; one by one
// they launch into a towering last leap and slam down onto their worker in
// a flash and a jolt, raising its perma tier, the last in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  hops,
  drawBounceSplash,
  type BouncePath,
} from "../../../../shared/bounce";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "jumpingBeans";
const MAX_WORKERS = 6;
const HEAD = 30;
// it bounds in from this far up and to the side
const ENTRY: Point = { x: 120, y: -260 };
const BASE_HOPS = 2;
const LIFT: [number, number] = [26, 170];
const BEAN = 0.5;
const SPLASH = 70;
const BOING_GAP_MS = 60;
const SLAM_SHAKE: [number, number] = [0.6, 1.3];

interface Bean {
  worker: RewardWorker;
  path: BouncePath;
}

export const forceJumpingBeansEvent = registerWispEvent(
  KEY,
  "Jumping Beans",
  () => CONFIG.jumpingBeansEvent.chance,
  (floor, context) => {
    const { staggerMs, hopMs, holdMs, mergeMs } = CONFIG.jumpingBeansEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    // later beans hop more times, so they slam down one after another
    const beans: Bean[] = workers.map((worker, k) => {
      const head: Point = { x: worker.at.x, y: worker.at.y - HEAD };
      const side = k % 2 ? 1 : -1;
      const points: Point[] = [
        { x: head.x + ENTRY.x * side, y: head.y + ENTRY.y },
        ...Array.from({ length: BASE_HOPS + k + 1 }, () => head),
      ];
      return { worker, path: hops(points, hopMs, LIFT, k * staggerMs) };
    });
    const landings = beans.flatMap((b) => b.path.bounces.slice(0, -1));
    const slams = beans.slice().sort((a, b) => a.path.endMs - b.path.endMs);
    const last = slams[slams.length - 1];
    const endAt = last.path.endMs;
    const finals = beans.map((b) => b.path.bounces[b.path.bounces.length - 1]);
    let boing = -Infinity;

    const bouncing = createBeats(
      landings,
      (b) => b.ms,
      (b) => {
        if (b.ms - boing < BOING_GAP_MS || !cover!.isLive()) return;
        boing = b.ms;
        playBloop();
      },
    );
    const slamming = createBeats(
      slams,
      (b) => b.path.endMs,
      (bean, k) => {
        cover!.promote(bean.worker);
        if (bean === last) {
          cover!.blast(bean.worker.at);
          return;
        }
        cover!.burst(bean.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SLAM_SHAKE, k / Math.max(1, slams.length - 1)));
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
          slamming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const b of landings)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          for (const b of finals)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH * 2, now);
          for (const bean of beans)
            drawWispBetween(
              ctx,
              bean.path.at,
              ms,
              now,
              WISP_SIZE * BEAN,
              0.8,
              bean.path.startMs,
              bean.path.endMs,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
