// the "Rail Shooter" event (gunfire; worker perma tiers): it covers its
// crit, whose click freezes the screen while a gunner wisp drops out of the
// clicked floor's button onto a rail along the bottom of the screen and
// tears along it, ever faster, like an on-rails arcade shooter; every time
// it passes under a worker in view it rattles a burst of wisp bullets up
// into it, muzzle flashing, in a flurry of pops and a jolt that lights the
// worker up a perma tier; the last burst ends in a huge blast and shake.
// Then the crit's tier pays out
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
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "railShooter";
const MAX_WORKERS = 7;
const SHOTS = 3;
const FIRE_MS = 40;
const SPEED = 2.6;
const LOW = 50;
const EDGE = 20;
const GUNNER = 0.55;
const BULLET = WISP_SIZE * 0.28;
const MUZZLE = 40;
const FLASH_MS = 50;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceRailShooterEvent = registerWispEvent(
  KEY,
  "Rail Shooter",
  () => CONFIG.railShooterEvent.chance,
  (floor, context, area) => {
    const { dropMs, runMs, holdMs, mergeMs } = CONFIG.railShooterEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const railY = area.bottom - LOW;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const x = (ms: number) =>
      lerp([left, right], easeIn(clamp01((ms - dropMs) / runMs)));
    const passesAt = (wx: number) =>
      dropMs + runMs * Math.sqrt(clamp01((wx - left) / (right - left)));
    const bullets: Bullet[] = [];
    const flashes: { at: number; from: Point; angle: number }[] = [];
    const bursts = workers.map((worker) => {
      const fires = passesAt(worker.at.x);
      let hits = 0;
      for (let i = 0; i < SHOTS; i++) {
        const at = fires + i * FIRE_MS;
        const from: Point = { x: x(at), y: railY };
        const b = aimBullet(from, worker.at, at, SPEED);
        bullets.push(b);
        flashes.push({
          at,
          from,
          angle: Math.atan2(worker.at.y - from.y, worker.at.x - from.x),
        });
        hits = b.hitAt;
      }
      return { worker, hits };
    });
    bursts.sort((a, b) => a.hits - b.hits);
    const last = bursts[bursts.length - 1];
    const endAt = Math.max(last.hits, dropMs + runMs);
    const gunnerAt: Point = { x: 0, y: railY };
    const gunner = (ms: number): Point | null => {
      if (ms > dropMs + runMs) return null;
      if (ms < dropMs) {
        const u = easeOut(ms / dropMs);
        gunnerAt.x = lerp([button.x, left], u);
        gunnerAt.y = lerp([button.y, railY], u);
        return gunnerAt;
      }
      gunnerAt.x = x(ms);
      gunnerAt.y = railY;
      return gunnerAt;
    };

    const pinging = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => cover!.burst(b.to, 0.1),
    );
    const hitting = createBeats(
      bursts,
      (b) => b.hits,
      (b, k) => {
        cover!.promote(b.worker);
        if (b === last) {
          cover!.blast(b.worker.at);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, bursts.length - 1)));
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
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          drawBullets(ctx, bullets, ms, now, BULLET);
          for (const f of flashes)
            drawMuzzleFlash(
              ctx,
              f.from,
              f.angle,
              (ms - f.at) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            gunner,
            ms,
            now,
            WISP_SIZE * GUNNER,
            0.8,
            0,
            dropMs + runMs,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
