// the "Torch Relay" event (summon; a free floor): it covers its crit, whose
// click freezes the screen while a pen of light draws a magic circle flat
// on the ground of a floor low on the screen; it turns faster and faster,
// a jolt every turn, then erupts a pillar of light up into the floor above,
// where the pillar draws the next circle, which spins up quicker and erupts
// in turn, the relay racing up the building faster and faster, until the
// last circle, on the dark locked floor's ground, erupts and bursts it
// open, unlocked for free as the screen unfreezes
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  playBarExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import { findRewardBars, findRewardLocked } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "torchRelay";
// the circles: on the ground of up to FLOORS floors under the locked one,
// GROUND px above each floor's bottom, RADIUS across, each spinning from
// SPIN_MS[0] down to [1] and TURNS[0] down to [1] turns before it erupts
const FLOORS = 4;
const GROUND = 40;
const RADIUS = 230;
const SPIN_MS: [number, number] = [1100, 560];
const TURNS: [number, number] = [6, 3];
const TURN_SHAKE: [number, number] = [0.3, 0.9];
const ERUPT_SHAKE: [number, number] = [1.2, 2];
const ERUPT_BLAST = 180;
const OPEN_SHAKE = 3;
const OPEN_FADE_MS = 500;

export const forceTorchRelayEvent = registerWispEvent(
  KEY,
  "Torch Relay",
  () => CONFIG.torchRelayEvent.chance,
  (floor, context) => {
    const { firstMs, holdMs, mergeMs } = CONFIG.torchRelayEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    // each floor's ground, bottom floor first, the locked floor last
    const grounds: Point[] = findRewardBars(floor, context)
      .slice(0, FLOORS)
      .reverse()
      .map((bar) => ({
        x: FLOOR_W / 2,
        y: bar.box.y - getIncomeBarBox(bar.isGroundFloor).y + FLOOR_H - GROUND,
      }));
    grounds.push({ x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H - GROUND });
    const last = grounds.length - 1;
    // each circle drawn as the pillar below it arrives
    const circles: { at: Point; summon: Summon; height: number }[] = [];
    let start: number = firstMs;
    grounds.forEach((at, k) => {
      const q = k / Math.max(1, last);
      const erupt = start + lerp(SPIN_MS, q);
      circles.push({
        at,
        summon: planSummon(
          start,
          erupt,
          Math.round(lerp(TURNS, q)),
          summonLook(k + 4),
        ),
        height: k < last ? at.y - grounds[k + 1].y : FLOOR_H * 0.9,
      });
      start = erupt;
    });
    const openAt = circles[last].summon.eruptMs;
    const revs = circles.flatMap((c, k) =>
      c.summon.revs.map((ms) => ({ ms, k })),
    );

    const turning = createBeats(
      revs,
      (r) => r.ms,
      (r) => {
        if (!cover?.isLive()) return;
        const q = r.k / Math.max(1, last);
        playBarExplosion(lerp([0.7, 1.2], q));
        shakeScreen(lerp(TURN_SHAKE, q));
      },
    );
    const erupting = createBeats(
      circles,
      (c) => c.summon.eruptMs,
      (_, k) => {
        if (k === last) {
          cover!.blast(lock);
          if (cover!.isLive()) shakeScreen(OPEN_SHAKE);
          return;
        }
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ERUPT_SHAKE, k / Math.max(1, last)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: openAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          turning.tick(ms, now);
          erupting.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > openAt + OPEN_FADE_MS) return;
          for (const c of circles) {
            drawSummon(ctx, c.summon, ms, c.at, RADIUS);
            drawSummonPillar(ctx, c.summon, ms, c.at, RADIUS, c.height);
            drawDetonation(ctx, c.at, ms - c.summon.eruptMs, ERUPT_BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
