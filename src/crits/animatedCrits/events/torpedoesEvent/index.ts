// the "Torpedoes" event (explosion; worker perma tiers): it covers its
// crit, whose click freezes the screen while torpedo wisps launch in off
// the screen's sides one after another, fuses fizzing, each streaking dead
// level at a worker in view and trailing a wake of glitter; each slams
// into its worker in a white blast, a bang and a jolt that lights it up a
// perma tier, ever faster; the last hits in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "torpedoes";
const MAX_WORKERS = 6;
const OFF = 40;
const TORPEDO = 0.45;
const FUSE = 22;
const BLAST = 160;
const HIT_SHAKE: [number, number] = [0.7, 1.4];

export const forceTorpedoesEvent = registerWispEvent(
  KEY,
  "Torpedoes",
  () => CONFIG.torpedoesEvent.chance,
  (floor, context, area) => {
    const { gapsMs, runMs, holdMs, mergeMs } = CONFIG.torpedoesEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let clock = 0;
    const torpedoes = workers.map((worker, k) => {
      const launches = clock;
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      // from whichever side is further, for a longer run
      const fromLeft = worker.at.x > (area.left + area.right) / 2;
      const start: Point = {
        x: fromLeft ? area.left - OFF : area.right + OFF,
        y: worker.at.y,
      };
      const at: Point = { x: 0, y: worker.at.y };
      const hits = launches + runMs;
      return {
        worker,
        launches,
        hits,
        at: (ms: number): Point | null => {
          if (ms < launches || ms >= hits) return null;
          at.x = lerp(
            [start.x, worker.at.x],
            easeIn((ms - launches) / runMs) * 0.5 +
              ((ms - launches) / runMs) * 0.5,
          );
          return at;
        },
      };
    });
    const last = torpedoes[torpedoes.length - 1];
    const endAt = last.hits;

    const launching = createBeats(
      torpedoes,
      (t) => t.launches,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      torpedoes,
      (t) => t.hits,
      (t, k) => {
        cover!.promote(t.worker);
        if (t === last) {
          cover!.blast(t.worker.at);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, torpedoes.length - 1)));
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
          launching.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          for (const t of torpedoes) {
            const p = t.at(ms);
            if (p) drawLitFuse(ctx, p, (ms - t.launches) / runMs, FUSE, now);
            drawWispBetween(
              ctx,
              t.at,
              ms,
              now,
              WISP_SIZE * TORPEDO,
              0.8,
              t.launches,
              t.hits,
            );
            drawDetonation(ctx, t.worker.at, ms - t.hits, BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
