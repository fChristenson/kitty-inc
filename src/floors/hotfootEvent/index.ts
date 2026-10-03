// the "Hotfoot" event (gunfire; worker perma tiers): it covers its crit,
// whose click freezes the screen while a gunslinger wisp drops out of the
// clicked floor's button and starts shooting at a worker's feet: a stitch
// of wisp bullets pings off the floor, racing up to them, every round a
// spark, a ping and a jolt, and as the last lands at their feet they jump a
// perma tier with a bang; it turns on worker after worker, ever faster, the
// last stitch ending in a huge blast and shake. Then the crit's tier pays
// out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";

const KEY = "hotfoot";
const MAX_WORKERS = 6;
const DROP_MS = 220;
// each stitch is ROUNDS rounds ROUND_MS apart, walking STITCH px up to the
// worker's feet, FEET px under their middle
const ROUNDS = 5;
const ROUND_MS = 45;
const STITCH = 150;
const FEET = 30;
const SPEED = 2.6;
const GUNNER = 0.55;
const BULLET = WISP_SIZE * 0.28;
const MUZZLE = 42;
const FLASH_MS = 50;
const PING_SHAKE = 0.2;
const HOP_SHAKE: [number, number] = [0.6, 1.3];

export const forceHotfootEvent = registerWispEvent(
  KEY,
  "Hotfoot",
  () => CONFIG.hotfootEvent.chance,
  (floor, context, area) => {
    const { stitchesMs, holdMs, mergeMs } = CONFIG.hotfootEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const gunner: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + 200,
    };
    const rounds: { b: Bullet; worker: RewardWorker | null }[] = [];
    let clock: number = DROP_MS;
    const stitches = workers.map((worker, k) => {
      const feet: Point = { x: worker.at.x, y: worker.at.y + FEET };
      const side = worker.at.x < gunner.x ? -1 : 1;
      let lastHit = 0;
      for (let r = 0; r < ROUNDS; r++) {
        const u = r / (ROUNDS - 1);
        const spot: Point = { x: feet.x + side * STITCH * (1 - u), y: feet.y };
        const b = aimBullet(gunner, spot, clock + r * ROUND_MS, SPEED);
        rounds.push({ b, worker: r === ROUNDS - 1 ? worker : null });
        lastHit = b.hitAt;
      }
      clock += lerp(stitchesMs, k / Math.max(1, workers.length - 1));
      return { worker, hops: lastHit };
    });
    const last = stitches.reduce((a, b) => (b.hops > a.hops ? b : a));
    const endAt = last.hops;
    const bullets = rounds.map((r) => r.b);
    const gunnerAt: Point = { x: 0, y: 0 };
    const gunnerWisp = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / DROP_MS));
      gunnerAt.x = lerp([button.x, gunner.x], u);
      gunnerAt.y = lerp([button.y, gunner.y], u);
      return gunnerAt;
    };

    const pinging = createBeats(
      rounds.filter((r) => !r.worker),
      (r) => r.b.hitAt,
      (r) => {
        cover!.burst(r.b.to, 0.1);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(PING_SHAKE);
      },
    );
    const hopping = createBeats(
      stitches,
      (s) => s.hops,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HOP_SHAKE, k / Math.max(1, stitches.length - 1)));
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
          pinging.tick(ms, now);
          hopping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const b of bullets)
            drawMuzzleFlash(
              ctx,
              gunner,
              Math.atan2(b.dy, b.dx),
              (ms - b.firedAt) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            gunnerWisp,
            ms,
            now,
            WISP_SIZE * GUNNER,
            0.7,
            0,
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
