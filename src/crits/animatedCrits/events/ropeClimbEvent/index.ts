// the "Rope Climb" event (wisp; a free floor): it covers its crit, whose
// click freezes the screen while a wisp lassos a rope of glitter up from
// the clicked floor's button to the building's locked floor and climbs it
// hand over hand: every pull a jerk up the swaying rope, a bloop and a jolt,
// quicker as it nears the top; at the top it swings in and smashes into the
// lock in a huge blast and shake, and the floor bursts open, unlocked for
// free, as the screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "ropeClimb";
const TOSS_MS = 220;
const STEP = 110;
const SIDE = 170;
const SWAY = 22;
const ROPE_GAP = 22;
const GLITTER = 7;
const SWING_MS = 180;
const CLIMBER = 0.55;
const PULL_SHAKE: [number, number] = [0.35, 0.9];

export const forceRopeClimbEvent = registerWispEvent(
  KEY,
  "Rope Climb",
  () => CONFIG.ropeClimbEvent.chance,
  (floor, context) => {
    const { pullsMs, holdMs, mergeMs } = CONFIG.ropeClimbEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const anchor: Point = { x: lock.x + SIDE, y: lock.y };
    const foot: Point = { x: anchor.x, y: button.y };
    const pulls = Math.max(4, Math.round((foot.y - anchor.y) / STEP));
    let clock = TOSS_MS;
    const steps = Array.from({ length: pulls }, (_, j) => {
      const starts = clock;
      clock += lerp(pullsMs, j / (pulls - 1));
      return { starts, ends: clock, j };
    });
    const swingAt = clock;
    const endAt = swingAt + SWING_MS;
    const sway = (y: number, ms: number) =>
      Math.sin(ms / 140 + y / 90) * SWAY * clamp01((foot.y - y) / 200);
    const climberAt: Point = { x: 0, y: 0 };
    const climber = (ms: number): Point => {
      const t = Math.max(0, ms);
      if (t < TOSS_MS) {
        const e = easeOut(t / TOSS_MS);
        climberAt.x = lerp([button.x, foot.x], e);
        climberAt.y = lerp([button.y, foot.y], e);
        return climberAt;
      }
      if (t >= swingAt) {
        const e = easeIn(clamp01((t - swingAt) / SWING_MS));
        climberAt.x = lerp([anchor.x, lock.x], e);
        climberAt.y = anchor.y - Math.sin(e * Math.PI) * 50;
        return climberAt;
      }
      let s = steps[0];
      for (const step of steps) if (t >= step.starts) s = step;
      const e = easeOut(clamp01((t - s.starts) / (s.ends - s.starts)));
      climberAt.y = lerp([foot.y, anchor.y], (s.j + e) / pulls);
      climberAt.x = anchor.x + sway(climberAt.y, t);
      return climberAt;
    };

    const pulling = createBeats(
      steps,
      (s) => s.ends,
      (s) => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(PULL_SHAKE, s.j / (pulls - 1)));
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
          pulling.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 300) return;
          // the rope, lashed up from the foot as it's tossed
          const fade = 1 - clamp01((ms - endAt) / 300);
          const reach = lerp(
            [foot.y, anchor.y],
            easeOut(clamp01(ms / TOSS_MS)),
          );
          for (let y = foot.y, i = 0; y >= reach; y -= ROPE_GAP, i++)
            drawGlitterLight(
              ctx,
              anchor.x + sway(y, ms),
              y,
              GLITTER,
              i,
              fade,
              now,
            );
          drawWispBetween(
            ctx,
            climber,
            ms,
            now,
            WISP_SIZE * CLIMBER,
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
