// the "Cat's Cradle" event (beam; worker perma tiers): it covers its crit,
// whose click freezes the screen while a string of light shoots out of the
// clicked floor's button to a worker in view and on from worker to worker,
// stringing them together like a game of cat's cradle; each worker the
// string reaches lights up in a flash, a twang and a jolt and climbs a perma
// tier, the strings humming tauter and quicker; when the cradle is strung
// every string flares and the last worker blazes in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "catsCradle";
const MAX_WORKERS = 6;
const STRING = 8;
const FLARE = 26;
const PLUCK_SHAKE: [number, number] = [0.5, 1.3];

export const forceCatsCradleEvent = registerWispEvent(
  KEY,
  "Cat's Cradle",
  () => CONFIG.catsCradleEvent.chance,
  (floor, context) => {
    const { stringsMs, holdMs, mergeMs } = CONFIG.catsCradleEvent;
    const found = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (found.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // zigzag between far-apart workers so the strings cross
    const workers: RewardWorker[] = [];
    const left = [...found];
    let from: Point = button;
    while (left.length > 0) {
      left.sort(
        (a, b) =>
          Math.hypot(b.at.x - from.x, b.at.y - from.y) -
          Math.hypot(a.at.x - from.x, a.at.y - from.y),
      );
      const next = left.splice(Math.min(1, left.length - 1), 1)[0];
      workers.push(next);
      from = next.at;
    }
    let clock = 0;
    let prev: Point = button;
    const strings = workers.map((worker, k) => {
      const s = {
        worker,
        from: prev,
        starts: clock,
        reaches: clock + lerp(stringsMs, k / Math.max(1, workers.length - 1)),
      };
      clock = s.reaches;
      prev = worker.at;
      return s;
    });
    const last = strings[strings.length - 1];
    const endAt = last.reaches;
    const tip: Point = { x: 0, y: 0 };

    const plucking = createBeats(
      strings,
      (s) => s.reaches,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PLUCK_SHAKE, k / Math.max(1, strings.length - 1)));
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
        tick: (ms, now) => plucking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 400) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 400 : 1;
          const flare = ms > endAt ? 1 + 2 * (1 - fade) : 1;
          for (const s of strings) {
            if (ms < s.starts) break;
            const u = clamp01((ms - s.starts) / (s.reaches - s.starts));
            tip.x = lerp([s.from.x, s.worker.at.x], u);
            tip.y = lerp([s.from.y, s.worker.at.y], u);
            const hum = 1 + 0.3 * Math.sin(ms / 30 + s.starts);
            drawBeam(ctx, s.from, tip, STRING * hum * flare, 0.65 * fade);
            drawBeamFlare(
              ctx,
              tip,
              FLARE * (u < 1 ? 0.6 : 1) * fade,
              fade,
              now,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
