// the "Bullet Cage" event (gunfire; worker perma tiers): it covers its crit,
// whose click freezes the screen while a gun wisp swoops out of the clicked
// floor's button and circles a worker, firing round after round inward as it
// goes, every bullet timed to land at once: they slam in together as a ring
// of bars round the worker with a flash, a bang and a jolt, and the worker
// climbs a perma tier; the gun circles the next worker, quicker each time,
// and the last cage closes in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";

const KEY = "bulletCage";
const MAX_WORKERS = 5;
const ORBIT = 230;
const CAGE = 50;
const SHOTS = 10;
const ARRIVE = 0.15;
const FIRING = 0.6;
const CLOSE = 0.85;
const FLASH_MS = 90;
const MUZZLE = 40;
const RING_MS = 260;
const GLITTER = 9;
const GUN = 0.45;
const BULLET = 0.22;
const CAGE_SHAKE: [number, number] = [0.6, 1.4];

interface Cage {
  worker: RewardWorker;
  from: Point;
  starts: number;
  span: number;
  closes: number;
  bullets: Bullet[];
  final: boolean;
}

export const forceBulletCageEvent = registerWispEvent(
  KEY,
  "Bullet Cage",
  () => CONFIG.bulletCageEvent.chance,
  (floor, context) => {
    const { cagesMs, holdMs, mergeMs } = CONFIG.bulletCageEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const orbitAt = (center: Point, a: number): Point => ({
      x: center.x + Math.cos(a) * ORBIT,
      y: center.y + Math.sin(a) * ORBIT * 0.6,
    });
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const cages: Cage[] = workers.map((worker, k) => {
      const span = lerp(cagesMs, k / Math.max(1, workers.length - 1));
      const starts = clock;
      const closes = starts + span * CLOSE;
      clock += span;
      const bullets = Array.from({ length: SHOTS }, (_, i) => {
        const f = i / SHOTS;
        const a = -Math.PI / 2 + f * Math.PI * 2;
        const firedAt = starts + span * lerp([ARRIVE, FIRING], f);
        const muzzle = orbitAt(worker.at, a);
        const bar: Point = {
          x: worker.at.x + Math.cos(a) * CAGE,
          y: worker.at.y + Math.sin(a) * CAGE,
        };
        const reach = Math.hypot(bar.x - muzzle.x, bar.y - muzzle.y);
        return aimBullet(muzzle, bar, firedAt, reach / (closes - firedAt));
      });
      const cage = {
        worker,
        from,
        starts,
        span,
        closes,
        bullets,
        final: k === workers.length - 1,
      };
      from = orbitAt(worker.at, Math.PI * 1.5);
      return cage;
    });
    const all = cages.flatMap((c) => c.bullets);
    const endAt = cages[cages.length - 1].closes;
    const gunAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => {
      const t = Math.max(0, ms);
      let c = cages[0];
      for (const cage of cages) if (t >= cage.starts) c = cage;
      const u = clamp01((t - c.starts) / c.span);
      const a =
        -Math.PI / 2 + clamp01((u - ARRIVE) / (FIRING - ARRIVE)) * Math.PI * 2;
      const on = orbitAt(c.worker.at, a);
      const e = easeOut(clamp01(u / ARRIVE));
      gunAt.x = lerp([c.from.x, on.x], e);
      gunAt.y = lerp([c.from.y, on.y], e);
      return gunAt;
    };

    const closing = createBeats(
      cages,
      (c) => c.closes,
      (c, k) => {
        cover!.promote(c.worker);
        if (c.final) {
          cover!.blast(c.worker.at);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(c.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CAGE_SHAKE, k / Math.max(1, cages.length - 1)));
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
        tick: (ms, now) => closing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + RING_MS) return;
          drawBullets(ctx, all, ms, now, WISP_SIZE * BULLET, true);
          for (const b of all)
            drawMuzzleFlash(
              ctx,
              b.from,
              Math.atan2(b.dy, b.dx),
              (ms - b.firedAt) / FLASH_MS,
              MUZZLE,
            );
          for (const c of cages) {
            const t = (ms - c.closes) / RING_MS;
            if (t < 0 || t >= 1) continue;
            for (let i = 0; i < SHOTS; i++) {
              const a = -Math.PI / 2 + (i / SHOTS) * Math.PI * 2;
              drawGlitterLight(
                ctx,
                c.worker.at.x + Math.cos(a) * CAGE,
                c.worker.at.y + Math.sin(a) * CAGE,
                GLITTER,
                i,
                1 - t,
                now,
              );
            }
          }
          drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
