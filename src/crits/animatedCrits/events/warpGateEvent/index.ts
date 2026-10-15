// the "Warp Gate" event (portal; a free floor): it covers its crit, whose
// click freezes the screen while twin gold rings open, one just over the
// locked floor and one at the bottom of the screen; a wisp falls from the top
// ring down the building into the bottom one and bursts out of the top again
// at once, keeping its speed, faster each loop, a second and a third
// joining; their last falls slam one after another into the locked floor,
// which bursts open, unlocked for free as the screen unfreezes. Then the
// crit's tier pays out
import meta from "./meta";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import {
  drawPortal,
  drawPortalPass,
  planWarp,
  type Warp,
  type WarpLeg,
} from "../../../../shared/animationStyles/portal";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { findRewardLocked } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "warpGate";
// the rings: RING of the screen's width across, the top one ABOVE of a
// floor over the locked floor's middle, the bottom one LIFT of the screen's
// height up from its bottom, opening over OPEN_MS
const RING = 0.1;
const ABOVE = 0.75;
const LIFT = 0.08;
const OPEN_MS = 140;
const CLOSE_MS = 200;
// the wisps: each LAG ms behind the last, the k-th joining on loop k
const WISPS = 3;
const LAG = 90;
const RUNNER = [1.4, 1.1, 1.1];
const PASS_SHAKE: [number, number] = [0.5, 1.2];
const SLAM_BLAST = 110;
const OPEN_BLAST = 240;
const SLAM_SHAKE = 1.4;
const OPEN_SHAKE = 2.8;

export const forceWarpGateEvent = registerWispEvent(
  KEY,
  "Warp Gate",
  () => meta.chance,
  (floor, context, area) => {
    const { firstMs, loopsMs, slamMs, holdMs, mergeMs } = meta.values;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const top: Point = { x: lock.x, y: lock.y - FLOOR_H * ABOVE };
    const bottom: Point = {
      x: lock.x,
      y: area.bottom - (area.bottom - area.top) * LIFT,
    };
    const ring = (area.right - area.left) * RING;
    const runners: Warp[] = [];
    for (let w = 0; w < WISPS; w++) {
      const legs: WarpLeg[] = [];
      let t = firstMs + w * LAG;
      loopsMs.forEach((ms, j) => {
        if (j >= w)
          legs.push({
            from: top,
            to: bottom,
            startMs: t,
            endMs: t + ms,
            fall: true,
          });
        t += ms;
      });
      legs.push({
        from: top,
        to: lock,
        startMs: t,
        endMs: t + slamMs,
        fall: true,
      });
      runners.push(planWarp(legs));
    }
    const slams = runners.map((r) => r.endMs);
    const openAt = slams[slams.length - 1];
    const passes = runners.flatMap((r) => r.passes).sort((a, b) => a - b);

    const passing = createBeats(
      passes,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const slamming = createBeats(
      slams,
      (ms) => ms,
      (at) => {
        if (at === openAt) {
          cover!.blast(lock);
          if (cover!.isLive()) shakeScreen(OPEN_SHAKE);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(SLAM_SHAKE);
      },
    );

    const into: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: openAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          passing.tick(ms, now);
          slamming.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > openAt + CLOSE_MS + 600) return;
          const open =
            clamp01(ms / OPEN_MS) * (1 - clamp01((ms - openAt) / CLOSE_MS));
          if (open > 0) {
            drawPortal(ctx, top, ring, open, now);
            drawPortal(ctx, bottom, ring, open, now);
          }
          for (const p of passes) {
            drawPortalPass(ctx, top, ms - p, ring);
            drawPortalPass(ctx, bottom, ms - p, ring);
          }
          for (let w = 0; w < WISPS; w++)
            drawWispHead(
              ctx,
              (m) => runners[w].at(m, into),
              ms,
              now,
              WISP_SIZE * RUNNER[w],
              0.7,
            );
          for (const at of slams)
            drawDetonation(
              ctx,
              lock,
              ms - at,
              at === openAt ? OPEN_BLAST : SLAM_BLAST,
              now,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
