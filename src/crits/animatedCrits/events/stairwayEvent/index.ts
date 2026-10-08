// the "Stairway" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while a wisp hops off the clicked floor's
// button and a stairway of light builds itself up the screen in front of
// it, step by step, each blazing into being just as the wisp lands on it
// with a ding and a jolt, the climb ever faster; at the top it bounds up
// into the building's locked floor, which bursts open in a huge blast and
// shake, unlocked for free as the screen unfreezes. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "stairway";
const STEPS = 9;
// steps are TREAD px wide, the stair zigzagging SWING px side to side;
// the climber hops HOP px over each
const TREAD = 56;
const SWING = 70;
const HOP = 30;
const BUILD_MS = 90;
const STEP = 8;
const CLIMBER = 0.5;
const STEP_SHAKE: [number, number] = [0.3, 0.9];

export const forceStairwayEvent = registerWispEvent(
  KEY,
  "Stairway",
  () => CONFIG.stairwayEvent.chance,
  (floor, context) => {
    const { hopsMs, holdMs, mergeMs } = CONFIG.stairwayEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const target: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    let clock = 0;
    const steps = Array.from({ length: STEPS }, (_, i) => {
      const u = (i + 1) / (STEPS + 1);
      const x =
        lerp([button.x, target.x], u) + Math.sin(u * Math.PI * 2) * SWING;
      const y = lerp([button.y, target.y], u);
      const lands = clock + lerp(hopsMs, i / (STEPS - 1));
      clock = lands;
      return {
        lands,
        spot: { x, y: y - 10 },
        left: { x: x - TREAD / 2, y },
        right: { x: x + TREAD / 2, y },
      };
    });
    const endAt = clock + lerp(hopsMs, 1);
    const stops: { at: number; spot: Point }[] = [
      { at: 0, spot: button },
      ...steps.map((s) => ({ at: s.lands, spot: s.spot })),
      { at: endAt, spot: target },
    ];
    const climberAt: Point = { x: 0, y: 0 };
    const climber = (ms: number): Point | null => {
      if (ms > endAt) return null;
      let k = 0;
      while (k < stops.length - 2 && ms >= stops[k + 1].at) k++;
      const a = stops[k];
      const b = stops[k + 1];
      const u = smoothstep(clamp01((ms - a.at) / (b.at - a.at)));
      climberAt.x = lerp([a.spot.x, b.spot.x], u);
      climberAt.y = lerp([a.spot.y, b.spot.y], u) - Math.sin(Math.PI * u) * HOP;
      return climberAt;
    };

    const stepping = createBeats(
      steps,
      (s) => s.lands,
      (s, k) => {
        cover!.burst(s.spot, 0.25);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STEP_SHAKE, k / (STEPS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(target),
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
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 400) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 400 : 1;
          for (const s of steps) {
            // each step blazes in just before the climber lands on it
            const shown = clamp01((ms - (s.lands - BUILD_MS)) / BUILD_MS);
            if (shown <= 0) continue;
            drawBeam(ctx, s.left, s.right, STEP, 0.9 * shown * fade);
            if (shown < 1) drawBeamFlare(ctx, s.spot, 18, 1 - shown, now);
          }
          drawWispBetween(
            ctx,
            climber,
            ms,
            now,
            WISP_SIZE * CLIMBER,
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
