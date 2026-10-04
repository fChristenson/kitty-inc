// the "William Tell" event (gunfire; worker perma tiers): it covers its
// crit, whose click freezes the screen while an apple wisp drops onto a
// worker's head and bounces to rest; an aim laser flickers onto it from the
// screen's edge, then one shot cracks out of a muzzle flash and bursts the
// apple clean off their head in a flash, a bang and a jolt as the worker
// climbs a perma tier; the next apple is already dropping, each shot
// quicker, the last in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawAimLaser } from "../../shared/beam";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import {
  dropBounce,
  drawBounceSplash,
  type BouncePath,
} from "../../shared/bounce";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";

const KEY = "williamTell";
const MAX_WORKERS = 5;
const HEAD = 70;
const DROP = 420;
const GRAVITY = 0.012;
const RESTITUTION = 0.35;
const HOPS = 2;
const EDGE = 40;
const SPEED = 4;
const APPLE = 0.5;
const BULLET = 0.5;
const FLASH_MS = 100;
const FLASH = 90;
const SPLASH = 60;
const SHOT_SHAKE: [number, number] = [0.7, 1.4];

interface Shot {
  worker: RewardWorker;
  apple: BouncePath;
  aims: number;
  bullet: Bullet;
  angle: number;
}

export const forceWilliamTellEvent = registerWispEvent(
  KEY,
  "William Tell",
  () => CONFIG.williamTellEvent.chance,
  (floor, context, area) => {
    const { shotsMs, aimMs, holdMs, mergeMs } = CONFIG.williamTellEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let clock = 0;
    const shots: Shot[] = workers.map((worker, k) => {
      const head: Point = { x: worker.at.x, y: worker.at.y - HEAD };
      const apple = dropBounce({ x: head.x, y: head.y - DROP }, head.y, {
        gravity: GRAVITY,
        restitution: RESTITUTION,
        bounces: HOPS,
        startMs: clock,
      });
      const aims = apple.endMs;
      // from whichever edge is farther, level with the apple
      const gun: Point = {
        x:
          head.x > (area.left + area.right) / 2
            ? area.left + EDGE
            : area.right - EDGE,
        y: head.y - 30,
      };
      const bullet = aimBullet(gun, head, aims + aimMs, SPEED);
      clock += lerp(shotsMs, k / Math.max(1, workers.length - 1));
      return {
        worker,
        apple,
        aims,
        bullet,
        angle: Math.atan2(bullet.dy, bullet.dx),
      };
    });
    const last = shots[shots.length - 1];
    const endAt = last.bullet.hitAt;
    const bullets = shots.map((s) => s.bullet);
    const bounces = shots.flatMap((s) => s.apple.bounces);

    const bouncing = createBeats(
      bounces,
      (b) => b.ms,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const hitting = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.bullet.to);
          return;
        }
        cover!.burst(s.bullet.to, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SHOT_SHAKE, k / Math.max(1, shots.length - 1)));
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
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 400) return;
          for (const b of bounces)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          for (const s of shots) {
            drawWispBetween(
              ctx,
              s.apple.at,
              ms,
              now,
              WISP_SIZE * APPLE,
              0.6,
              s.apple.startMs,
              s.bullet.hitAt,
            );
            if (ms >= s.aims && ms < s.bullet.firedAt)
              drawAimLaser(ctx, s.bullet.from, s.bullet.to);
            const t = (ms - s.bullet.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, s.bullet.from, s.angle, t, FLASH);
          }
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * BULLET, true);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
