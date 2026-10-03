// the "Last Stand" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while a gunner wisp leaps out of the clicked floor's
// button to the middle of the screen and wave after wave of wisps come
// swarming in at it from every edge; it whirls and guns them down one by
// one, muzzle flashing every way, each hit a flash, a pop and a burst of
// coins, the waves ever bigger and faster; when the last falls it fires a
// ring every way in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  bulletRing,
  drawBullets,
  drawMuzzleFlash,
  fireBullet,
} from "../../shared/bullets";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "lastStand";
const REWARD = 4;
const WAVES = [5, 7, 9];
const EDGE = 10;
const LEAP_MS = 220;
// raiders die KILL of the way in from the edge
const KILL = 0.55;
const SPEED = 2.4;
const RING = 24;
const GUNNER = 0.65;
const RAIDER = 0.38;
const BULLET = WISP_SIZE * 0.3;
const MUZZLE = 44;
const FLASH_MS = 60;
const COINS = 8;
const COIN_REACH: [number, number] = [25, 100];
const KILL_SHAKE: [number, number] = [0.25, 0.9];

export const forceLastStandEvent = registerWispEvent(
  KEY,
  "Last Stand",
  () => CONFIG.lastStandEvent.chance,
  (floor, context, area) => {
    const { wavesMs, approachMs, holdMs, mergeMs } = CONFIG.lastStandEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const box = {
      left: area.left - EDGE,
      right: area.right + EDGE,
      top: area.top - EDGE,
      bottom: area.bottom + EDGE,
    };
    let clock = LEAP_MS;
    const raiders = WAVES.flatMap((size, w) => {
      const spawns = clock;
      clock += lerp(wavesMs, w / (WAVES.length - 1));
      const turn = Math.random() * Math.PI * 2;
      return Array.from({ length: size }, (_, i) => {
        const angle = turn + (i / size) * Math.PI * 2;
        const from = fireBullet(center, angle, 0, 1, box).to;
        const start = spawns + (i / size) * 200;
        const dies = start + approachMs * KILL;
        const spot: Point = {
          x: lerp([from.x, center.x], KILL),
          y: lerp([from.y, center.y], KILL),
        };
        const at: Point = { x: 0, y: 0 };
        return {
          start,
          dies,
          spot,
          shot: aimBullet(
            center,
            spot,
            dies - Math.hypot(spot.x - center.x, spot.y - center.y) / SPEED,
            SPEED,
          ),
          at: (ms: number): Point => {
            const u = clamp01((ms - start) / approachMs);
            at.x = lerp([from.x, center.x], u);
            at.y = lerp([from.y, center.y], u);
            return at;
          },
        };
      });
    });
    const lastKill = Math.max(...raiders.map((r) => r.dies));
    const ringAt = lastKill + 80;
    const ring = bulletRing(center, RING, ringAt, SPEED, area);
    const shots = raiders.map((r) => r.shot);
    const bullets = [...shots, ...ring];
    const endAt = Math.max(...ring.map((b) => b.hitAt));
    const gunnerAt: Point = { x: 0, y: 0 };
    const gunner = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / LEAP_MS));
      gunnerAt.x = lerp([button.x, center.x], u);
      gunnerAt.y = lerp([button.y, center.y], u);
      return gunnerAt;
    };

    const killing = createBeats(
      raiders,
      (r) => r.dies,
      (r, k) => {
        cover!.launchFrom(r.spot, ringTargets(r.spot, COINS, COIN_REACH));
        cover!.burst(r.spot, 0.2);
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playBloop();
        shakeScreen(lerp(KILL_SHAKE, r.dies / lastKill));
      },
    );
    const finale = createBeats(
      [ringAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          killing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const r of raiders)
            drawWispBetween(
              ctx,
              r.at,
              ms,
              now,
              WISP_SIZE * RAIDER,
              0.3,
              r.start,
              r.dies,
            );
          drawBullets(ctx, bullets, ms, now, BULLET);
          for (const b of shots)
            drawMuzzleFlash(
              ctx,
              center,
              Math.atan2(b.dy, b.dx),
              (ms - b.firedAt) / FLASH_MS,
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
            ringAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
