// the "Light Cage" event (beam; worker perma tiers): it covers its crit,
// whose click freezes the screen while a huge square cage of blazing beams
// snaps into being round a worker in view and slams shut on it, its walls
// and bars closing in to a tight box with a clang, a flash and a jolt that
// lights the worker up a perma tier; the cage bursts open and snaps round
// the next worker, quicker each time; the last slams shut in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "lightCage";
const MAX_WORKERS = 5;
// the cage closes from WIDE to SHUT px across, BARS bars inside
const WIDE = 260;
const SHUT = 50;
const BARS = 3;
const WALL = 9;
const BAR = 5;
const FLASH_MS = 180;
const SHUT_SHAKE: [number, number] = [0.7, 1.4];

export const forceLightCageEvent = registerWispEvent(
  KEY,
  "Light Cage",
  () => CONFIG.lightCageEvent.chance,
  (floor, context) => {
    const { closesMs, holdMs, mergeMs } = CONFIG.lightCageEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let clock = 0;
    const cages = workers.map((worker, k) => {
      const opens = clock;
      const span = lerp(closesMs, k / Math.max(1, workers.length - 1));
      const shuts = opens + span;
      clock = shuts + FLASH_MS;
      return { worker, opens, shuts, span };
    });
    const last = cages[cages.length - 1];
    const endAt = last.shuts;
    const corners: Point[] = Array.from({ length: 4 }, () => ({ x: 0, y: 0 }));
    const barTop: Point = { x: 0, y: 0 };
    const barBottom: Point = { x: 0, y: 0 };

    const opening = createBeats(
      cages,
      (c) => c.opens,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const shutting = createBeats(
      cages,
      (c) => c.shuts,
      (c, k) => {
        cover!.promote(c.worker);
        if (c === last) {
          cover!.blast(c.worker.at);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SHUT_SHAKE, k / Math.max(1, cages.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          opening.tick(ms, now);
          shutting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const c of cages) {
            if (ms < c.opens || ms > c.shuts + FLASH_MS) continue;
            const u = easeIn(clamp01((ms - c.opens) / c.span));
            const flash = ms > c.shuts ? 1 - (ms - c.shuts) / FLASH_MS : 0;
            const alpha =
              Math.min(1, clamp01((ms - c.opens) / 80)) *
              (ms > c.shuts ? flash : 0.9);
            const half = lerp([WIDE, SHUT], u) / 2;
            const { x, y } = c.worker.at;
            corners[0].x = x - half;
            corners[0].y = y - half;
            corners[1].x = x + half;
            corners[1].y = y - half;
            corners[2].x = x + half;
            corners[2].y = y + half;
            corners[3].x = x - half;
            corners[3].y = y + half;
            for (let i = 0; i < 4; i++)
              drawBeam(
                ctx,
                corners[i],
                corners[(i + 1) % 4],
                WALL * (1 + flash),
                alpha,
              );
            for (let b = 1; b <= BARS; b++) {
              barTop.x = barBottom.x = x - half + (2 * half * b) / (BARS + 1);
              barTop.y = y - half;
              barBottom.y = y + half;
              drawBeam(ctx, barTop, barBottom, BAR, alpha * 0.8);
            }
            if (flash > 0)
              drawBeamFlare(ctx, c.worker.at, 40 * flash, flash, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
