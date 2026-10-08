// the "Stepped Leader" event (lightning; a free floor): it covers its crit,
// whose click freezes the screen while lightning creeps up out of the
// clicked floor's button like a real bolt's stepped leader: a jagged step,
// a crackle, a pause, another step, forking as it goes, ever faster, feeling
// its way up the building to the locked floor; the instant it touches, the
// return stroke blazes back down the whole channel in a blinding flash and
// the lock blows in a huge blast and shake; the floor bursts open, unlocked
// for free, as the screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "steppedLeader";
const STEPS = 10;
const WANDER = 70;
const LEADER = 0.55;
const STROKE = 2.2;
const TIP_MS = 120;
const STEP_SHAKE: [number, number] = [0.15, 0.7];

export const forceSteppedLeaderEvent = registerWispEvent(
  KEY,
  "Stepped Leader",
  () => CONFIG.steppedLeaderEvent.chance,
  (floor, context) => {
    const { stepsMs, strokeMs, holdMs, mergeMs } = CONFIG.steppedLeaderEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const points: Point[] = [button];
    for (let k = 1; k < STEPS; k++) {
      const u = k / STEPS;
      points.push({
        x:
          lerp([button.x, lock.x], u) +
          (Math.random() - 0.5) * 2 * WANDER * (1 - u),
        y: lerp([button.y, lock.y], u),
      });
    }
    points.push(lock);
    let clock = 0;
    const steps = points.slice(1).map((to, k) => {
      clock += lerp(stepsMs, k / (STEPS - 1));
      return { to, at: clock, bolt: createBolt(points[k], to, 1) };
    });
    const touchAt = clock;
    const endAt = touchAt + strokeMs;

    const stepping = createBeats(
      steps.slice(0, -1),
      (s) => s.at,
      (s, k) => {
        cover!.burst(s.to, 0.15);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(STEP_SHAKE, k / (STEPS - 2)));
      },
    );
    const touching = createBeats(
      [touchAt],
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
        tick: (ms, now) => {
          stepping.tick(ms, now);
          touching.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const stroke = ms >= touchAt ? 1 - (ms - touchAt) / strokeMs : 0;
          for (const s of steps) {
            if (ms < s.at) break;
            const fresh = 1 - Math.min(1, (ms - s.at) / TIP_MS);
            const alpha = stroke > 0 ? stroke : LEADER + (1 - LEADER) * fresh;
            drawBolt(ctx, s.bolt, alpha, stroke > 0 ? STROKE : 0.7 + fresh);
            if (fresh > 0) drawStrike(ctx, s.to, fresh, 0.5, now);
          }
          if (stroke > 0) drawStrike(ctx, lock, stroke, 1.6, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
