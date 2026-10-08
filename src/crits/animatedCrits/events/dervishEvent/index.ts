// the "Dervish" event (gunfire; worker perma tiers): it covers its crit,
// whose click freezes the screen while a gunner wisp whirls out of the
// clicked floor's button to the middle of the screen and spins like a
// dervish, spraying a whirling spiral of wisp bullets; every few turns it
// snaps off a heavy shot at a worker, a flash, a pop and a jolt, and the
// worker lights up a perma tier; it spins ever faster until it stops dead
// and fires a ring every way in a huge blast and shake. Then the crit's tier
// pays out
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
  bulletRing,
  bulletSpiral,
  drawBullets,
  drawMuzzleFlash,
} from "../../../../shared/bullets";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "dervish";
const MAX_WORKERS = 6;
const EDGE = 20;
const ARMS = 2;
const RATE: [number, number] = [14, 30];
const LAPS: [number, number] = [0.6, 1.8];
const SPEED = 1.7;
const HEAVY_SPEED = 2.4;
const RING = 28;
const DERVISH = 0.9;
const SPRAY = WISP_SIZE * 0.24;
const HEAVY = WISP_SIZE * 0.45;
const MUZZLE = 56;
const FLASH_MS = 70;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceDervishEvent = registerWispEvent(
  KEY,
  "Dervish",
  () => CONFIG.dervishEvent.chance,
  (floor, context, area) => {
    const { whirlMs, spinMs, holdMs, mergeMs } = CONFIG.dervishEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE,
      bottom: area.bottom - EDGE,
    };
    const stopAt = whirlMs + spinMs;
    const spray = bulletSpiral(
      center,
      {
        arms: ARMS,
        rateHz: RATE,
        lapsHz: LAPS,
        fromMs: whirlMs,
        toMs: stopAt,
        turn: Math.random() * Math.PI * 2,
        spin: Math.random() < 0.5 ? 1 : -1,
      },
      SPEED,
      box,
    );
    const shots = workers.map((worker, k) => {
      const fires = whirlMs + (spinMs * (k + 0.5)) / workers.length;
      return { worker, b: aimBullet(center, worker.at, fires, HEAVY_SPEED) };
    });
    const heavy = shots.map((s) => s.b);
    const ring = bulletRing(center, RING, stopAt, SPEED * 1.3, box);
    const endAt = Math.max(
      ...heavy.map((b) => b.hitAt),
      ...ring.map((b) => b.hitAt),
    );
    const flashes = [
      ...heavy.map((b) => ({ at: b.firedAt, angle: Math.atan2(b.dy, b.dx) })),
    ];

    const dervishAt: Point = { x: 0, y: 0 };
    const dervish = (ms: number): Point | null => {
      if (ms >= stopAt) return null;
      const u = easeOut(Math.min(1, ms / whirlMs));
      const wobble = ms > whirlMs ? 4 : 0;
      dervishAt.x = lerp([button.x, center.x], u) + Math.cos(ms / 25) * wobble;
      dervishAt.y = lerp([button.y, center.y], u) + Math.sin(ms / 25) * wobble;
      return dervishAt;
    };

    const popping = createBeats(
      spray,
      (b) => b.hitAt,
      (b) => cover!.burst(b.to, 0.06),
    );
    const hitting = createBeats(
      shots,
      (s) => s.b.hitAt,
      (s, k) => {
        cover!.promote(s.worker);
        cover!.burst(s.worker.at, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );
    const finale = createBeats(
      [stopAt],
      (ms) => ms,
      () => cover!.blast(center),
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
          popping.tick(ms, now);
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, spray, ms, now, SPRAY);
          drawBullets(ctx, ring, ms, now, SPRAY);
          drawBullets(ctx, heavy, ms, now, HEAVY, true);
          for (const f of flashes)
            drawMuzzleFlash(
              ctx,
              center,
              f.angle,
              (ms - f.at) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            dervish,
            ms,
            now,
            WISP_SIZE * DERVISH,
            0.9,
            0,
            stopAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
