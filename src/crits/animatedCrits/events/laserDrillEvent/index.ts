// the "Laser Drill" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while a drill beam fires up from the clicked
// floor and bores up through the building floor by floor, its
// thread of glitter spiralling up it, every floor it punches through a
// flare, a crack and a jolt, quicker each time; when it hits the locked
// floor the beam blazes out wide and the floor bursts open in a huge blast
// and shake, unlocked for free, as the screen unfreezes. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawGlitterLight, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "laserDrill";
const WIDTH = 18;
const BLAZE_W = 70;
const THREAD = 14;
const THREAD_R = 22;
const THREAD_DOT = 6;
const PUNCH_MS = 200;
const BLAZE_MS = 220;
const PUNCH_SHAKE: [number, number] = [0.4, 1.0];
const BURST_SHAKE = 2.2;

export const forceLaserDrillEvent = registerWispEvent(
  KEY,
  "Laser Drill",
  () => CONFIG.laserDrillEvent.chance,
  (floor, context) => {
    const { punchesMs, holdMs, mergeMs } = CONFIG.laserDrillEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const x = lock.x;
    const from: Point = { x, y: button.y };
    // one punch per floor between the button and the lock, at least three
    const count = Math.max(
      3,
      Math.round(Math.abs(button.y - lock.y) / FLOOR_H),
    );
    let clock = 0;
    const punches = Array.from({ length: count }, (_, k) => {
      const starts = clock;
      clock += lerp(punchesMs, k / Math.max(1, count - 1));
      return {
        starts,
        lands: clock,
        y0: lerp([button.y, lock.y], k / count),
        y1: lerp([button.y, lock.y], (k + 1) / count),
      };
    });
    const burstsAt = clock;
    const endAt = burstsAt + BLAZE_MS;
    const tipAt = (ms: number) => {
      let y = button.y;
      for (const p of punches)
        if (ms >= p.starts)
          y = lerp(
            [p.y0, p.y1],
            easeOut(clamp01((ms - p.starts) / (p.lands - p.starts))),
          );
      return y;
    };
    const tip: Point = { x, y: 0 };
    const flare: Point = { x, y: 0 };

    const punching = createBeats(
      punches,
      (p) => p.lands,
      (_, k) => {
        if (k === count - 1 || !cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PUNCH_SHAKE, k / Math.max(1, count - 2)));
      },
    );
    const bursting = createBeats(
      [burstsAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BURST_SHAKE);
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
          punching.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          tip.y = tipAt(ms);
          const blaze = clamp01((ms - burstsAt) / BLAZE_MS);
          drawBeam(
            ctx,
            from,
            tip,
            lerp([WIDTH, BLAZE_W], blaze),
            1 - blaze * 0.6,
          );
          drawBeamFlare(ctx, tip, 22 + 30 * blaze, 1, now);
          // the drill's thread, spiralling up the beam
          const span = from.y - tip.y;
          for (let i = 0; i < THREAD; i++) {
            const u = (((i / THREAD + ms * 0.002) % 1) + 1) % 1;
            const a = u * Math.PI * 8 + ms * 0.02;
            drawGlitterLight(
              ctx,
              x + Math.cos(a) * THREAD_R,
              from.y - span * u,
              THREAD_DOT,
              i,
              0.5 + 0.5 * Math.sin(a),
              now,
            );
          }
          for (const p of punches) {
            const t = (ms - p.lands) / PUNCH_MS;
            if (t < 0 || t >= 1) continue;
            flare.y = p.y1;
            drawBeamFlare(ctx, flare, 34, 1 - t, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
