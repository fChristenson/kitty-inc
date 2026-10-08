// the "Breakers" event (money; worker perma tiers and cash): it covers its
// crit, whose click freezes the screen while great breaking waves of cash
// surge up off the bottom of the screen one after another, each rearing up
// beside a worker, curling over at its crest and crashing down onto it with
// a bang and a jolt as the worker climbs a perma tier; the waves come
// quicker, from alternate sides, the last crashing down in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute } from "../../../../shared/curves";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "breakers";
const REWARD = 2;
const MAX_WORKERS = 5;
const SWELL = 240;
const RISE = 150;
const CREST = 210;
const CURL = 120;
const CRASH_SHAKE: [number, number] = [0.7, 1.4];

export const forceBreakersEvent = registerWispEvent(
  KEY,
  "Breakers",
  () => CONFIG.breakersEvent.chance,
  (floor, context, area) => {
    const { gapsMs, waveMs, holdMs, mergeMs } = CONFIG.breakersEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const pour: Pour = {
      coinsAlong: 260,
      width: 52,
      streamMs: waveMs * 0.55,
      travelMs: waveMs,
    };
    let clock = 0;
    const waves = workers.map((worker, k) => {
      const side = k % 2 === 0 ? -1 : 1;
      const { x, y } = worker.at;
      const route: Point[] = [
        { x: x + side * SWELL, y: area.bottom + 20 },
        { x: x + side * SWELL * 0.6, y: y - RISE },
        { x: x + side * 30, y: y - CREST },
        { x: x - side * 30, y: y - CURL },
        { x, y },
      ];
      const point: Point = { x: 0, y: 0 };
      const line = sampleLine((u) => {
        alongRoute(route, u, point);
        return { x: point.x, y: point.y };
      }, 40);
      const starts = clock;
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      return { worker, line, starts, crashes: starts + waveMs };
    });
    const last = waves[waves.length - 1];
    const endAt = last.crashes;
    const durationMs = Math.max(
      pourDurationMs(last.starts, pour),
      endAt + holdMs + mergeMs,
    );

    const surging = createBeats(
      waves,
      (w) => w.starts,
      (w) => pourLine(cover!, w.line, pour),
    );
    const crashing = createBeats(
      waves,
      (w) => w.crashes,
      (w, k) => {
        cover!.promote(w.worker);
        if (w === last) {
          cover!.blast(w.worker.at);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(w.worker.at, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CRASH_SHAKE, k / Math.max(1, waves.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        workers,
        tick: (ms, now) => {
          surging.tick(ms, now);
          crashing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
