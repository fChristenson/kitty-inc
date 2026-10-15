// the "Convergence" event (summon; a free floor): it covers its crit, whose
// click freezes the screen while small magic circles are drawn flat on the
// ground of every open floor in view at once, each its own look, turning in
// lockstep faster and faster, a jolt and a tick every turn; then the bottom
// one lifts off and slides up the building into the next, each merge a flash
// and a jolt, the circle growing and gaining rings, until one giant circle
// lands flat under the dark locked floor, whips round flat out and erupts a
// pillar of light through the lock, bursting the floor open, unlocked for
// free as the screen unfreezes
import meta from "./meta";
import { playBoostEventStream } from "../../../../sound";
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playBarExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import { findRewardBars, findRewardLocked } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "convergence";
// up to FLOORS circles, GROUND px above each floor's bottom, SMALL px across
// at first, GIANT once all have merged under the lock
const FLOORS = 5;
const GROUND = 40;
const SMALL = 150;
const GIANT = 480;
// the rings each merge adds, as shares of the radius
const RINGS = [0.88, 0.56, 0.4, 0.28, 0.18];
// TURNS turns all told, the turn growing as time^POWER: ticking early,
// whipping round by the eruption
const TURNS = 16;
const POWER = 1.4;
const TURN_SHAKE: [number, number] = [0.25, 0.8];
const MERGE_SHAKE: [number, number] = [1, 1.9];
const MERGE_BLAST: [number, number] = [120, 210];
// a merged circle popping POP bigger, settling over POP_MS
const POP = 0.18;
const POP_MS = 140;
const OPEN_SHAKE = 3.3;
const OPEN_BLAST = 320;
const PILLAR_H = FLOOR_H * 1.25;
const OPEN_FADE_MS = 500;

export const forceConvergenceEvent = registerWispEvent(
  KEY,
  "Convergence",
  () => meta.chance,
  (floor, context) => {
    const { firstMs, gatherMs, stepMs, whipMs, holdMs, mergeMs } = meta.values;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const lockGround: Point = {
      x: FLOOR_W / 2,
      y: locked.offsetY + FLOOR_H - GROUND,
    };
    // each open floor's ground, bottom floor first
    const grounds: Point[] = findRewardBars(floor, context)
      .slice(0, FLOORS)
      .map((bar) => ({
        x: FLOOR_W / 2,
        y: bar.box.y - getIncomeBarBox(bar.isGroundFloor).y + FLOOR_H - GROUND,
      }))
      .sort((a, b) => b.y - a.y);
    const n = grounds.length;
    if (n === 0) return;
    const liftMs = firstMs + gatherMs;
    const eruptMs = liftMs + n * stepMs + whipMs;

    // every circle on one timeline, so they turn in lockstep
    const circles: Summon[] = [];
    for (let i = 0; i < n; i++)
      circles.push(planSummon(firstMs, eruptMs, TURNS, summonLook(i + 2)));
    // the merged circle after k merges: the bottom circle's look, k more rings
    const base = circles[0].look;
    const stages: Summon[] = [];
    const radii: number[] = [];
    for (let k = 0; k <= n; k++) {
      stages.push({
        ...circles[0],
        look: { ...base, rings: [...base.rings, ...RINGS.slice(0, k)] },
      });
      radii.push(lerp([SMALL, GIANT], k / n));
    }
    // each slide ends on the next circle, the last on the lock's ground
    const merges: { at: Point; ms: number }[] = [];
    for (let k = 0; k < n; k++)
      merges.push({
        at: k + 1 < n ? grounds[k + 1] : lockGround,
        ms: liftMs + (k + 1) * stepMs,
      });

    // the lib's turn is cubic in time: warp time so it grows as time^POWER
    const marksMs = circles[0].marksMs;
    const span = eruptMs - marksMs;
    const warp = (ms: number): number =>
      ms <= marksMs || ms >= eruptMs
        ? ms
        : marksMs + span * Math.pow((ms - marksMs) / span, POWER / 3);
    const revs: number[] = [];
    for (let k = 1; k < TURNS; k++)
      revs.push(marksMs + span * Math.pow(k / TURNS, 1 / POWER));

    const turning = createBeats(
      revs,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        const q = k / (TURNS - 2);
        playBarExplosion(lerp([0.6, 1.1], q));
        shakeScreen(lerp(TURN_SHAKE, q));
      },
    );
    const merging = createBeats(
      merges,
      (m) => m.ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        const q = k / Math.max(1, n - 1);
        playBarExplosion(lerp([1.1, 1.5], q));
        shakeScreen(lerp(MERGE_SHAKE, q));
      },
    );
    const erupting = createBeats(
      [eruptMs],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (cover!.isLive()) shakeScreen(OPEN_SHAKE);
      },
    );

    const at: Point = { x: FLOOR_W / 2, y: grounds[0].y };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: eruptMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          turning.tick(ms, now);
          merging.tick(ms, now);
          erupting.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > eruptMs + OPEN_FADE_MS) return;
          const w = warp(ms);
          if (ms < liftMs) {
            for (let i = 0; i < n; i++)
              drawSummon(ctx, circles[i], w, grounds[i], SMALL);
            return;
          }
          const step = Math.min(n, Math.floor((ms - liftMs) / stepMs));
          for (let i = step + 1; i < n; i++)
            drawSummon(ctx, circles[i], w, grounds[i], SMALL);
          let radius = radii[step];
          if (step < n) {
            const from = step === 0 ? grounds[0] : merges[step - 1].at;
            const to = merges[step].at;
            const u = easeIn((ms - liftMs - step * stepMs) / stepMs);
            at.y = from.y + (to.y - from.y) * u;
          } else at.y = lockGround.y;
          if (step > 0) {
            const since = ms - merges[step - 1].ms;
            if (since < POP_MS) radius *= 1 + POP * (1 - since / POP_MS);
          }
          drawSummon(ctx, stages[step], w, at, radius);
          drawSummonPillar(ctx, stages[n], w, lockGround, GIANT, PILLAR_H);
          for (let k = 0; k < n; k++)
            drawDetonation(
              ctx,
              merges[k].at,
              ms - merges[k].ms,
              lerp(MERGE_BLAST, k / Math.max(1, n - 1)),
              now,
            );
          drawDetonation(ctx, lockGround, ms - eruptMs, OPEN_BLAST, now);
          drawDetonation(ctx, lock, ms - eruptMs - 60, OPEN_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardLocked(floor, context) !== null &&
    findRewardBars(floor, context).length > 0,
);
