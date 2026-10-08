// the "Quickdraw" event (gunfire; worker perma tiers): it covers its crit,
// whose click freezes the screen while a gunslinger wisp drops into the
// middle of the screen; it whips round from worker to worker, snapping off
// a shot at each, a muzzle flash, a streak and a jolt that lights the
// worker up a perma tier, turning and firing faster and faster; then it
// fans the hammer, one last shot at every worker at once, and blows in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "quickdraw";
const MAX_WORKERS = 6;
const HIGH = 0.5;
const DROP_MS = 220;
const SPEED = 2.6;
const FAN_GAP_MS = 30;
const SLINGER = 0.6;
const BULLET = WISP_SIZE * 0.35;
const FLASH_MS = 110;
const FLASH = 50;
const HIT_SHAKE: [number, number] = [0.5, 1.2];

interface Shot {
  bullet: Bullet;
  angle: number;
  worker: RewardWorker;
  draws: boolean;
}

export const forceQuickdrawEvent = registerWispEvent(
  KEY,
  "Quickdraw",
  () => CONFIG.quickdrawEvent.chance,
  (floor, context, area) => {
    const { firstMs, drawsMs, fanGapMs, holdMs, mergeMs } =
      CONFIG.quickdrawEvent;
    const found = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (found.length === 0) return;
    const slinger: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * HIGH,
    };
    // round the dial, so each turn is a whip from the last
    const workers = found
      .slice()
      .sort(
        (a, b) =>
          Math.atan2(a.at.y - slinger.y, a.at.x - slinger.x) -
          Math.atan2(b.at.y - slinger.y, b.at.x - slinger.x),
      );
    let clock = firstMs;
    const draws: Shot[] = workers.map((worker, k) => {
      const firedAt = clock;
      clock += lerp(drawsMs, k / Math.max(1, workers.length - 1));
      const bullet = aimBullet(slinger, worker.at, firedAt, SPEED);
      return {
        bullet,
        angle: Math.atan2(bullet.dy, bullet.dx),
        worker,
        draws: true,
      };
    });
    const fanAt = clock + fanGapMs;
    const fan: Shot[] = workers.map((worker, k) => {
      const bullet = aimBullet(
        slinger,
        worker.at,
        fanAt + k * FAN_GAP_MS,
        SPEED,
      );
      return {
        bullet,
        angle: Math.atan2(bullet.dy, bullet.dx),
        worker,
        draws: false,
      };
    });
    const shots = [...draws, ...fan];
    const bullets = shots.map((s) => s.bullet);
    const endAt = Math.max(...fan.map((s) => s.bullet.hitAt));
    const fannedAt = fanAt + FAN_GAP_MS * workers.length;
    const spot: Point = { x: 0, y: 0 };
    const slingerAt = (ms: number): Point => {
      spot.x = slinger.x;
      spot.y = slinger.y - (1 - easeOutBack(clamp01(ms / DROP_MS))) * 300;
      return spot;
    };

    const firing = createBeats(
      shots,
      (s) => s.bullet.firedAt,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const hitting = createBeats(
      draws,
      (s) => s.bullet.hitAt,
      (s, k) => {
        cover!.promote(s.worker);
        cover!.burst(s.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, draws.length - 1)));
      },
    );
    const fanning = createBeats(
      fan,
      (s) => s.bullet.hitAt,
      (s) => cover!.burst(s.worker.at, 0.4),
    );
    const finale = createBeats(
      [fannedAt],
      (ms) => ms,
      () => cover!.blast(slinger),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: Math.max(endAt, fannedAt) + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          firing.tick(ms, now);
          hitting.tick(ms, now);
          fanning.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > Math.max(endAt, fannedAt) + 200) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const s of shots) {
            const t = (ms - s.bullet.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, slinger, s.angle, t, FLASH);
          }
          drawWispBetween(
            ctx,
            slingerAt,
            ms,
            now,
            WISP_SIZE * SLINGER,
            0.9,
            0,
            fannedAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
