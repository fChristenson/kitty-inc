// the "Groundbreaking" event (summon; a free floor): it covers its crit,
// whose click freezes the screen while a pen of light draws a giant magic
// circle flat at the bottom of the screen, then its inner ring and star; it
// turns slow then whipping round, a jolt every turn, glitter rising off it
// quicker and quicker; a pillar of light erupts out of it with a huge blast
// and rides up the building, a blast and a jolt at every floor it passes,
// until it bursts the locked floor open, unlocked for free as the screen
// unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
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
import { findRewardLocked } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "groundbreaking";
const TURNS = 8;
// the circle: RADIUS of the screen's width across its middle, LIFT of the
// screen's height up from its bottom
const RADIUS = 0.42;
const LIFT = 0.1;
const TURN_SHAKE: [number, number] = [0.3, 1.2];
const ERUPT_BLAST = 260;
const ERUPT_SHAKE = 2.4;
// the pillar reaching PAST of a floor over the locked floor's middle
const PAST = 0.6;
const PASS_BLAST = 110;
const PASS_SHAKE = 0.9;
const OPEN_SHAKE = 2.8;
const OPEN_FADE_MS = 400;

export const forceGroundbreakingEvent = registerWispEvent(
  KEY,
  "Groundbreaking",
  () => CONFIG.groundbreakingEvent.chance,
  (floor, context, area) => {
    const { eruptMs, riseMs, holdMs, mergeMs } = CONFIG.groundbreakingEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const top: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const ground: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - (area.bottom - area.top) * LIFT,
    };
    const radius = (area.right - area.left) * RADIUS;
    const summon = planSummon(0, eruptMs, TURNS, summonLook(3));
    const climb = Math.max(FLOOR_H, ground.y - top.y);
    const openAt = eruptMs + riseMs;
    // a blast on every floor's line the pillar passes on its way up
    const passes: { at: Point; ms: number }[] = [];
    for (let y = ground.y - FLOOR_H; y > top.y + FLOOR_H / 2; y -= FLOOR_H)
      passes.push({
        at: { x: ground.x, y },
        ms: eruptMs + (riseMs * (ground.y - y)) / climb,
      });

    const turning = createBeats(
      summon.revs,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playBarExplosion(lerp([0.7, 1.2], k / Math.max(1, TURNS - 2)));
        shakeScreen(lerp(TURN_SHAKE, k / Math.max(1, TURNS - 2)));
      },
    );
    const erupting = createBeats(
      [eruptMs],
      (ms) => ms,
      () => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(ERUPT_SHAKE);
      },
    );
    const passing = createBeats(
      passes,
      (p) => p.ms,
      () => {
        if (!cover?.isLive()) return;
        playBarExplosion(1);
        shakeScreen(PASS_SHAKE);
      },
    );
    const opening = createBeats(
      [openAt],
      (ms) => ms,
      () => {
        cover!.blast(top);
        if (cover!.isLive()) shakeScreen(OPEN_SHAKE);
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
          passing.tick(ms, now);
          opening.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > openAt + OPEN_FADE_MS) return;
          drawSummon(ctx, summon, ms, ground, radius);
          drawSummonPillar(
            ctx,
            summon,
            ms,
            ground,
            radius,
            Math.min(climb + FLOOR_H * PAST, ((ms - eruptMs) / riseMs) * climb),
          );
          drawDetonation(ctx, ground, ms - eruptMs, ERUPT_BLAST, now);
          for (const p of passes)
            drawDetonation(ctx, p.at, ms - p.ms, PASS_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
