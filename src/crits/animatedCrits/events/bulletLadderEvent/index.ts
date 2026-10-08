// the "Bullet Ladder" event (gunfire; a free floor): it covers its crit,
// whose click freezes the screen while two gun wisps spring up at the
// screen's sides and climb the building in steps, half a floor at a time; at
// every step they fire at each other, two bullets streaking across and
// crossing in the middle with a flash, a pop and a jolt, each rung of the
// ladder quicker than the last; at the locked floor both guns open up on the
// lock, which blows open in a huge blast and shake, unlocked for free, as
// the screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
} from "../../../../shared/bullets";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "bulletLadder";
const SIDE = 50;
const CLIMB = 0.4;
const SPEED = 3.2;
const FLASH_MS = 90;
const MUZZLE = 44;
const GUN = 0.42;
const BULLET = 0.28;
const RUNG_SHAKE: [number, number] = [0.3, 0.9];

export const forceBulletLadderEvent = registerWispEvent(
  KEY,
  "Bullet Ladder",
  () => CONFIG.bulletLadderEvent.chance,
  (floor, context, area) => {
    const { rungsMs, holdMs, mergeMs } = CONFIG.bulletLadderEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const xs = [area.left + SIDE, area.right - SIDE];
    const count = Math.max(
      3,
      Math.round((Math.abs(button.y - lock.y) / FLOOR_H) * 2),
    );
    let clock = 0;
    const rungs = Array.from({ length: count }, (_, j) => {
      const starts = clock;
      clock += lerp(rungsMs, j / (count - 1));
      const y0 = lerp([button.y, lock.y], j / count);
      const y1 = lerp([button.y, lock.y], (j + 1) / count);
      const fires = starts + (clock - starts) * CLIMB;
      const final = j === count - 1;
      const bullets = xs.map((x, side) =>
        aimBullet(
          { x, y: y1 },
          final ? lock : { x: xs[1 - side], y: y1 },
          fires,
          SPEED,
        ),
      );
      return {
        starts,
        fires,
        y0,
        y1,
        bullets,
        crosses: fires + (xs[1] - xs[0]) / 2 / SPEED,
        final,
      };
    });
    const all = rungs.flatMap((r) => r.bullets);
    const last = rungs[rungs.length - 1];
    const endAt = Math.max(...last.bullets.map((b) => b.hitAt));
    const heightAt = (ms: number): number => {
      let r = rungs[0];
      for (const rung of rungs) if (ms >= rung.starts) r = rung;
      return lerp(
        [r.y0, r.y1],
        easeOut(clamp01((ms - r.starts) / (r.fires - r.starts))),
      );
    };
    const guns = xs.map((x) => {
      const at: Point = { x, y: button.y };
      return (ms: number): Point => {
        at.y = heightAt(Math.max(0, ms));
        return at;
      };
    });

    const crossing = createBeats(
      rungs.filter((r) => !r.final),
      (r) => r.crosses,
      (r, k) => {
        cover!.burst({ x: (xs[0] + xs[1]) / 2, y: r.y1 }, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(RUNG_SHAKE, k / Math.max(1, count - 2)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (cover!.isLive()) playExplosion();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          crossing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, all, ms, now, WISP_SIZE * BULLET, true);
          for (const b of all)
            drawMuzzleFlash(
              ctx,
              b.from,
              Math.atan2(b.dy, b.dx),
              (ms - b.firedAt) / FLASH_MS,
              MUZZLE,
            );
          for (const g of guns)
            drawWispBetween(ctx, g, ms, now, WISP_SIZE * GUN, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
