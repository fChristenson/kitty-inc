// the "Lockbuster" event (gunfire; a free floor): it covers its crit, whose
// click freezes the screen while gun wisps pour out of the clicked floor's
// button and fan out into a ring round the building's locked floor; they
// open fire on it round the ring in turn, a muzzle flash chasing round and
// round, every wisp bullet hammering the lock with a flash, a pop and a
// jolt, ever faster; then the whole ring fires at once and the lock goes in
// a huge blast and shake, and the floor bursts open, unlocked for free, as
// the screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "lockbuster";
const GUNS = 8;
const RADIUS = 190;
const SQUASH = 0.75;
const SHOTS = 20;
const SPEED = 2.2;
const GUN = 0.5;
const BULLET = WISP_SIZE * 0.3;
const MUZZLE = 40;
const FLASH_MS = 60;
const HIT_SHAKE: [number, number] = [0.15, 0.7];

export const forceLockbusterEvent = registerWispEvent(
  KEY,
  "Lockbuster",
  () => CONFIG.lockbusterEvent.chance,
  (floor, context) => {
    const { ringMs, shotsMs, holdMs, mergeMs } = CONFIG.lockbusterEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const guns = Array.from({ length: GUNS }, (_, k) => {
      const a = (k / GUNS) * Math.PI * 2 - Math.PI / 2;
      const spot: Point = {
        x: lock.x + Math.cos(a) * RADIUS,
        y: lock.y + Math.sin(a) * RADIUS * SQUASH,
      };
      const at: Point = { x: 0, y: 0 };
      const delay = (k / GUNS) * ringMs * 0.3;
      return {
        spot,
        angle: Math.atan2(lock.y - spot.y, lock.x - spot.x),
        wisp: (ms: number): Point => {
          const u = easeOut(
            Math.min(1, Math.max(0, ms - delay) / (ringMs * 0.7)),
          );
          at.x = lerp([button.x, spot.x], u);
          at.y = lerp([button.y, spot.y], u);
          return at;
        },
      };
    });
    const shots: { gun: (typeof guns)[number]; b: Bullet }[] = [];
    let clock: number = ringMs;
    for (let i = 0; i < SHOTS; i++) {
      const gun = guns[i % GUNS];
      shots.push({ gun, b: aimBullet(gun.spot, lock, clock, SPEED) });
      clock += lerp(shotsMs, i / (SHOTS - 1));
    }
    const volleyAt = clock;
    for (const gun of guns)
      shots.push({ gun, b: aimBullet(gun.spot, lock, volleyAt, SPEED * 1.3) });
    const bullets = shots.map((s) => s.b);
    const endAt = Math.max(...bullets.map((b) => b.hitAt));
    const hammer = shots.slice(0, SHOTS);

    const hitting = createBeats(
      hammer,
      (s) => s.b.hitAt,
      (_, k) => {
        cover!.burst(lock, 0.2);
        if (!cover!.isLive()) return;
        if (k % 3 === 0) playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / (SHOTS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const s of shots)
            drawMuzzleFlash(
              ctx,
              s.gun.spot,
              s.gun.angle,
              (ms - s.b.firedAt) / FLASH_MS,
              MUZZLE,
            );
          for (const gun of guns)
            drawWispBetween(
              ctx,
              gun.wisp,
              ms,
              now,
              WISP_SIZE * GUN,
              0.6,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
