// the "Multistage" event (explosion; a free floor): it covers its crit,
// whose click freezes the screen while a three-stage rocket of lit bomb
// wisps lifts off the clicked floor's button toward the building's locked
// floor; one after another its stages blow off in huge blasts that burst
// into clusters, each a bang and a big shake that kicks the rest of the
// rocket faster; the warhead slams into the lock in a colossal blast and
// shake and the floor bursts open, unlocked for free, as the screen
// unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { measure, pointAlong, sampleLine } from "../../cashFlow";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "multistage";
const STAGES = 3;
// where along the flight each stage blows off
const BURNOUTS = [0.3, 0.58, 0.82];
const STAGE_GAP = 46;
const BLAST = 240;
const CLUSTER = 4;
const CLUSTER_MS = 70;
const CLUSTER_REACH = 80;
const CLUSTER_SIZE = 110;
const WARHEAD = 0.7;
const STAGE = 0.55;
const FUSE = 32;
const STAGE_SHAKE: [number, number] = [1, 1.8];

export const forceMultistageEvent = registerWispEvent(
  KEY,
  "Multistage",
  () => CONFIG.multistageEvent.chance,
  (floor, context, area) => {
    const { flightMs, holdMs, mergeMs } = CONFIG.multistageEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const bend = {
      x: lerp([area.left, area.right], button.x < lock.x ? 0.2 : 0.8),
      y: (button.y + lock.y) / 2,
    };
    const line = sampleLine(
      (u) => bezier(button, bend, lock, u, { x: 0, y: 0 }),
      80,
    );
    const along = measure(line);
    const length = along[along.length - 1];
    // each burnout kicks it faster: share of the flight time per leg shrinks
    const legShares = [0.4, 0.27, 0.19, 0.14];
    const marks = [0, ...BURNOUTS, 1];
    const times = [0];
    for (const share of legShares)
      times.push(times[times.length - 1] + share * flightMs);
    const progress = (ms: number) => {
      const t = clamp01(ms / flightMs) * flightMs;
      let k = 0;
      while (k < legShares.length - 1 && t > times[k + 1]) k++;
      const u = clamp01((t - times[k]) / (times[k + 1] - times[k]));
      return lerp([marks[k], marks[k + 1]], k === 0 ? easeIn(u) : u);
    };
    const burnouts = BURNOUTS.map((share, s) => ({
      ms: times[s + 1],
      at: pointAlong(
        line,
        along,
        Math.max(0, share - ((s + 1) * STAGE_GAP) / length),
        { x: 0, y: 0 },
      ),
    }));
    const endAt = flightMs;
    const blasts = burnouts.flatMap((b, s) => [
      { at: b.at, ms: b.ms, size: BLAST },
      ...Array.from({ length: CLUSTER }, (_, c) => {
        const a = (c / CLUSTER) * Math.PI * 2 + s;
        return {
          at: {
            x: b.at.x + Math.cos(a) * CLUSTER_REACH,
            y: b.at.y + Math.sin(a) * CLUSTER_REACH,
          },
          ms: b.ms + CLUSTER_MS + c * 25,
          size: CLUSTER_SIZE,
        };
      }),
    ]);
    const headAt: Point = { x: 0, y: 0 };
    const warhead = (ms: number) =>
      pointAlong(line, along, progress(Math.max(0, ms)), headAt);
    // stage s rides (s + 1) gaps behind the warhead until it blows
    const stages = Array.from({ length: STAGES }, (_, s) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms >= burnouts[s].ms) return null;
        const d = progress(Math.max(0, ms)) - ((s + 1) * STAGE_GAP) / length;
        return pointAlong(line, along, Math.max(0, d), spot);
      };
    });

    const staging = createBeats(
      burnouts,
      (b) => b.ms,
      (_, s) => {
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STAGE_SHAKE, s / (STAGES - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          staging.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          for (let s = 0; s < STAGES; s++) {
            const at = stages[s](ms);
            if (!at) continue;
            drawLitFuse(ctx, at, clamp01(ms / burnouts[s].ms), FUSE, now);
            drawWispHead(ctx, stages[s], ms, now, WISP_SIZE * STAGE);
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          drawWispBetween(
            ctx,
            warhead,
            ms,
            now,
            WISP_SIZE * WARHEAD,
            1,
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
