// the "Sniper Nest" event (gunfire; a free floor): it covers its crit,
// whose click freezes the screen while a sniper wisp darts out of the
// clicked floor's button up into a top corner of the screen; its
// flickering aim laser hunts across the building and snaps onto its locked
// floor; it fires three crack shots, each a muzzle flash, a streaking wisp
// round and a white blast on the floor with a bang and a big jolt, the
// laser twitching to a new spot between them; the third blows in a huge
// blast and shake, and as the screen unfreezes the floor bursts open:
// unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser } from "../../../../shared/beam";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
} from "../../../../shared/bullets";
import { drawDetonation, DETONATION_MS } from "../../../../shared/explosion";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "sniperNest";
const NEST: Point = { x: 46, y: 70 };
// the shots hit at these shares across and down the locked floor
const HITS: Point[] = [
  { x: 0.25, y: 0.4 },
  { x: 0.75, y: 0.6 },
  { x: 0.5, y: 0.5 },
];
const SPEED = 4;
const ROUND = WISP_SIZE * 0.4;
const SNIPER = 0.7;
const MUZZLE = 60;
const FLASH_MS = 90;
const BLAST = 180;
const SHOT_SHAKE: [number, number] = [1.2, 1.6];

export const forceSniperNestEvent = registerWispEvent(
  KEY,
  "Sniper Nest",
  () => CONFIG.sniperNestEvent.chance,
  (floor, context, area) => {
    const { climbMs, huntMs, shotsMs, holdMs, mergeMs } =
      CONFIG.sniperNestEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const nest: Point = { x: area.left + NEST.x, y: area.top + NEST.y };
    const hits = HITS.map((h) => ({
      x: FLOOR_W * h.x,
      y: locked.offsetY + FLOOR_H * h.y,
    }));
    const huntFrom: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    let clock: number = climbMs + huntMs;
    const shots = hits.map((hit, k) => {
      const firedAt = clock;
      clock += shotsMs[k] ?? 0;
      return { hit, round: aimBullet(nest, hit, firedAt, SPEED) };
    });
    const last = shots[shots.length - 1];
    const endAt = last.round.hitAt;
    const rounds = shots.map((s) => s.round);
    const sniperAt: Point = { x: 0, y: 0 };
    const sniper = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / climbMs));
      sniperAt.x = lerp([button.x, nest.x], u);
      sniperAt.y = lerp([button.y, nest.y], u);
      return sniperAt;
    };
    // where the laser points: hunting onto the first spot, then twitching
    // from each spot to the next
    const aim: Point = { x: 0, y: 0 };
    const aimAt = (ms: number): Point => {
      if (ms < climbMs + huntMs) {
        const u = smoothstep((ms - climbMs) / huntMs);
        const wobble = Math.sin(u * Math.PI * 3) * (1 - u) * 80;
        aim.x = lerp([huntFrom.x, hits[0].x], u) + wobble;
        aim.y = lerp([huntFrom.y, hits[0].y], u);
        return aim;
      }
      let k = 0;
      while (k < shots.length - 1 && ms >= shots[k].round.hitAt) k++;
      const prev = k === 0 ? hits[0] : hits[k - 1];
      const from = k === 0 ? climbMs + huntMs : shots[k - 1].round.hitAt;
      const u = smoothstep(
        (ms - from) / Math.max(1, shots[k].round.firedAt - from),
      );
      aim.x = lerp([prev.x, hits[k].x], u);
      aim.y = lerp([prev.y, hits[k].y], u);
      return aim;
    };

    const firing = createBeats(
      shots,
      (s) => s.round.firedAt,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      shots,
      (s) => s.round.hitAt,
      (s, k) => {
        if (k === shots.length - 1) {
          cover!.blast(s.hit);
          return;
        }
        cover!.burst(s.hit, 0.5);
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
        tick: (ms, now) => {
          firing.tick(ms, now);
          hitting.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          if (ms > climbMs && ms < last.round.firedAt)
            drawAimLaser(ctx, nest, aimAt(ms));
          drawBullets(ctx, rounds, ms, now, ROUND, true);
          for (const s of shots) {
            const r = s.round;
            drawMuzzleFlash(
              ctx,
              nest,
              Math.atan2(r.dy, r.dx),
              (ms - r.firedAt) / FLASH_MS,
              MUZZLE,
            );
            drawDetonation(ctx, s.hit, ms - r.hitAt, BLAST, now);
          }
          drawWispBetween(
            ctx,
            sniper,
            ms,
            now,
            WISP_SIZE * SNIPER,
            0.8,
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
