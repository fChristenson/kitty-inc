// the "Pressure Washer" event (money; worker perma tiers and cash): it
// covers its crit, whose click freezes the screen while a needle-thin jet
// of cash blasts in from a bottom corner of the screen at a worker, so hard
// it rocks the screen; the worker lights up with a bang and climbs a perma
// tier, then the jet whips to the next, from the other corner, quicker each
// time; the last blast ends in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "pressureWasher";
const REWARD = 2;
const MAX_WORKERS = 5;
const NOZZLE = 30;
const HIT_SHAKE: [number, number] = [0.8, 1.6];

export const forcePressureWasherEvent = registerWispEvent(
  KEY,
  "Pressure Washer",
  () => CONFIG.pressureWasherEvent.chance,
  (floor, context, area) => {
    const { jetsMs, jetMs, holdMs, mergeMs } = CONFIG.pressureWasherEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const pour: Pour = {
      coinsAlong: 420,
      width: 14,
      streamMs: jetMs * 0.8,
      travelMs: jetMs,
    };
    let clock = 0;
    const jets = workers.map((worker, k) => {
      const nozzle: Point = {
        x: k % 2 === 0 ? area.left + NOZZLE : area.right - NOZZLE,
        y: area.bottom - NOZZLE,
      };
      const line = sampleLine(
        (u): Point => ({
          x: lerp([nozzle.x, worker.at.x], u),
          y: lerp([nozzle.y, worker.at.y], u),
        }),
        20,
      );
      const starts = clock;
      clock += lerp(jetsMs, k / Math.max(1, workers.length - 1));
      return { worker, line, starts, hits: starts + jetMs };
    });
    const last = jets[jets.length - 1];
    const endAt = last.hits;
    const durationMs = Math.max(
      pourDurationMs(last.starts, pour),
      endAt + holdMs + mergeMs,
    );

    const spraying = createBeats(
      jets,
      (j) => j.starts,
      (j) => pourLine(cover!, j.line, pour),
    );
    const hitting = createBeats(
      jets,
      (j) => j.hits,
      (j, k) => {
        cover!.promote(j.worker);
        if (j === last) {
          cover!.blast(j.worker.at);
          return;
        }
        cover!.burst(j.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, jets.length - 1)));
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
          spraying.tick(ms, now);
          hitting.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
