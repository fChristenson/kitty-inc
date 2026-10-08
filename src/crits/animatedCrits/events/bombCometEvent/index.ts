// the "Bomb Comet" event (explosion; a free floor): it covers its crit,
// whose click freezes the screen while a comet wisp streaks in from the top
// corner of the sky trailing a tail of lit bombs, and slams into the
// building's locked floor in a big blast, a bang and a jolt; its tail piles
// in after it, bomb on bomb, each a blast and a jolt rolling on quicker and
// quicker, the last four flying in abreast and going off together, then the
// lock itself goes up in a colossal blast and the biggest shake, and the
// floor bursts open, unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "bombComet";
const CHAIN = 7;
const CLUSTER = 4;
const JITTER = 70;
const ABREAST = 90;
const OFF = 160;
const BEND = 0.35;
const COMET = 0.9;
const BOMB = 0.4;
const FUSE = 14;
const IMPACT = 280;
const BLAST = 160;
const CLUSTER_BLAST = 220;
const COLOSSAL = 480;
const CLUSTER_GAP_MS = 120;
const CORE_DELAY_MS = 140;
const IMPACT_SHAKE = 1.5;
const CHAIN_SHAKE: [number, number] = [0.6, 1.3];
const CLUSTER_SHAKE = 2;

export const forceBombCometEvent = registerWispEvent(
  KEY,
  "Bomb Comet",
  () => CONFIG.bombCometEvent.chance,
  (floor, context, area) => {
    const { flightMs, lagMs, holdMs, mergeMs } = CONFIG.bombCometEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    // in from whichever top corner is farther, bowing out over the sky
    const side = lock.x > (area.left + area.right) / 2 ? -1 : 1;
    const start: Point = {
      x: side < 0 ? area.left - OFF : area.right + OFF,
      y: area.top - OFF,
    };
    const bend: Point = {
      x: lerp([start.x, lock.x], 0.85),
      y: lerp([start.y, lock.y], BEND),
    };
    // the comet, then its tail: each hit time and where it lands
    let clock: number = flightMs;
    const flyers = [{ hits: clock, spot: lock, abreast: 0 }];
    for (let i = 0; i < CHAIN; i++) {
      clock += lerp(lagMs, i / (CHAIN - 1));
      flyers.push({
        hits: clock,
        spot: {
          x: lock.x + (Math.random() * 2 - 1) * JITTER,
          y: lock.y + (Math.random() * 2 - 1) * JITTER * 0.6,
        },
        abreast: 0,
      });
    }
    clock += CLUSTER_GAP_MS;
    for (let i = 0; i < CLUSTER; i++) {
      const abreast = (i - (CLUSTER - 1) / 2) * ABREAST * 2;
      flyers.push({
        hits: clock,
        spot: { x: lock.x + abreast, y: lock.y + (i % 2 ? -1 : 1) * 30 },
        abreast,
      });
    }
    const clusterAt = clock;
    const coreAt = clusterAt + CORE_DELAY_MS;
    const shots = flyers.map((f, i) => {
      const from: Point = { x: start.x + f.abreast, y: start.y };
      const via: Point = { x: bend.x + f.abreast, y: bend.y };
      const at: Point = { x: 0, y: 0 };
      const delay = f.hits - flightMs;
      return {
        ...f,
        comet: i === 0,
        bomb: i > 0,
        size: i === 0 ? IMPACT : f.hits === clusterAt ? CLUSTER_BLAST : BLAST,
        shake:
          i === 0 ? IMPACT_SHAKE : lerp(CHAIN_SHAKE, (i - 1) / (CHAIN - 1)),
        at: (ms: number): Point =>
          bezier(
            from,
            via,
            f.spot,
            easeIn(clamp01((ms - delay) / flightMs)),
            at,
          ),
      };
    });

    const hitting = createBeats(
      shots,
      (s) => s.hits,
      (s, i) => {
        if (!cover?.isLive()) return;
        // the cluster bangs and shakes once, all together
        if (s.hits === clusterAt && shots[i - 1].hits === clusterAt) return;
        playExplosion();
        shakeScreen(s.hits === clusterAt ? CLUSTER_SHAKE : s.shake);
      },
    );
    const crowning = createBeats(
      [coreAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(2.6);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: coreAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          hitting.tick(ms, now);
          crowning.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > coreAt + 900) return;
          for (const s of shots) {
            drawDetonation(ctx, s.spot, ms - s.hits, s.size, now);
            if (s.bomb && ms < s.hits && ms > s.hits - flightMs)
              drawLitFuse(
                ctx,
                s.at(ms),
                (ms - s.hits + flightMs) / flightMs,
                FUSE,
                now,
              );
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * (s.comet ? COMET : BOMB),
              s.comet ? 1 : 0.5,
              s.hits - flightMs,
              s.hits,
            );
          }
          drawDetonation(ctx, lock, ms - coreAt, COLOSSAL, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
