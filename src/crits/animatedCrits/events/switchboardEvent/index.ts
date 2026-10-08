// the "Switchboard" event (lightning; worker perma tiers): it covers its
// whose click freezes the screen while a spark wisp darts out of the
// clicked floor's button trailing a live cord of crackling lightning
// behind it; it plugs the cord into a worker with a crack and a jolt that
// lights the worker up a perma tier, and the next spark shoots out with the
// next cord, quicker each time, until a fan of live cords links the button
// to every worker; then the whole board surges at once in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "switchboard";
const MAX_WORKERS = 6;
const SWING = 140;
const STRIKE_MS = 160;
const SURGE_MS = 260;
const SPARK = 0.45;
const HIT_SHAKE: [number, number] = [0.5, 1.1];

interface Cord {
  worker: RewardWorker;
  leaves: number;
  plugs: number;
  bend: Point;
  // its live end: the spark while it's carried, then the worker
  end: Point;
  bolt: Bolt;
}

export const forceSwitchboardEvent = registerWispEvent(
  KEY,
  "Switchboard",
  () => CONFIG.switchboardEvent.chance,
  (floor, context) => {
    const { runsMs, surgeAfterMs, holdMs, mergeMs } = CONFIG.switchboardEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const hub = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const cords: Cord[] = workers.map((worker, k) => {
      const leaves = clock;
      const plugs = leaves + lerp(runsMs, k / Math.max(1, workers.length - 1));
      clock = plugs;
      const end: Point = { x: hub.x, y: hub.y };
      return {
        worker,
        leaves,
        plugs,
        bend: {
          x: lerp([hub.x, worker.at.x], 0.5) + (k % 2 ? SWING : -SWING),
          y: Math.min(hub.y, worker.at.y) - SWING,
        },
        end,
        bolt: createBolt(hub, end, 0),
      };
    });
    const last = cords[cords.length - 1];
    const surges = last.plugs + surgeAfterMs;
    const endAt = surges + SURGE_MS;
    const runAt = (c: Cord, ms: number, into: Point): Point => {
      const u = easeIn(clamp01((ms - c.leaves) / (c.plugs - c.leaves)));
      return bezier(hub, c.bend, c.worker.at, u, into);
    };
    const sparks = cords.map((c) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number) => runAt(c, ms, spot);
    });

    const plugging = createBeats(
      cords,
      (c) => c.plugs,
      (c, k) => {
        cover!.promote(c.worker);
        cover!.burst(c.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, cords.length - 1)));
      },
    );
    const surging = createBeats(
      [surges],
      (ms) => ms,
      () => cover!.blast(hub),
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
          plugging.tick(ms, now);
          surging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const surge = clamp01((ms - surges) / SURGE_MS);
          const scale = 0.4 + 0.8 * Math.sin(Math.PI * surge);
          for (const c of cords) {
            if (ms < c.leaves) break;
            if (ms < c.plugs) runAt(c, ms, c.end);
            else {
              c.end.x = c.worker.at.x;
              c.end.y = c.worker.at.y;
            }
            drawBolt(ctx, c.bolt, 0.6 + 0.4 * Math.random(), scale);
            const t = (ms - c.plugs) / STRIKE_MS;
            if (t >= 0 && t < 1) drawStrike(ctx, c.worker.at, 1 - t, 0.6, now);
            if (surge > 0 && surge < 1)
              drawStrike(ctx, c.worker.at, 1 - surge, 0.8, now);
          }
          for (let k = 0; k < cords.length; k++)
            drawWispBetween(
              ctx,
              sparks[k],
              ms,
              now,
              WISP_SIZE * SPARK,
              1,
              cords[k].leaves,
              cords[k].plugs,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
