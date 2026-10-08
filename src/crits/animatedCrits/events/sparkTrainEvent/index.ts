// the "Spark Train" event (lightning; worker perma tiers): it covers its
// crit, whose click freezes the screen while a crackling rail of lightning
// snaps out of the clicked floor's button from worker to worker, link by
// link; then a spark wisp rides the rail like a train, faster and faster,
// and every worker it reaches is jolted with a strike, a crack and a jolt
// up a perma tier; at the end of the line it blows in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "sparkTrain";
const MAX_WORKERS = 5;
const STRIKE_MS = 200;
const TRAIN = 0.5;
const STOP_SHAKE: [number, number] = [0.6, 1.3];

export const forceSparkTrainEvent = registerWispEvent(
  KEY,
  "Spark Train",
  () => CONFIG.sparkTrainEvent.chance,
  (floor, context) => {
    const { railMs, rideMs, holdMs, mergeMs } = CONFIG.sparkTrainEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const stops: Point[] = [
      getButtonCenter(context.isGroundFloor),
      ...workers.map((w) => w.at),
    ];
    const links = stops.slice(1).map((to, i) => ({
      bolt: createBolt(stops[i], to, 1),
      laid: (railMs * i) / (stops.length - 1),
    }));
    const lengths = [0];
    for (let i = 1; i < stops.length; i++)
      lengths.push(
        lengths[i - 1] +
          Math.hypot(stops[i].x - stops[i - 1].x, stops[i].y - stops[i - 1].y),
      );
    const full = lengths[lengths.length - 1] || 1;
    // the train runs at easeIn pace, so it reaches share f of the line at sqrt(f)
    const arrivals = workers.map((worker, j) => ({
      worker,
      ms: railMs + rideMs * Math.sqrt(lengths[j + 1] / full),
      final: j === workers.length - 1,
    }));
    const endAt = railMs + rideMs;
    const trainAt: Point = { x: 0, y: 0 };
    const train = (ms: number): Point => {
      const d = easeIn(clamp01((ms - railMs) / rideMs)) * full;
      let i = 1;
      while (i < lengths.length - 1 && lengths[i] < d) i++;
      const f = clamp01(
        (d - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1),
      );
      trainAt.x = lerp([stops[i - 1].x, stops[i].x], f);
      trainAt.y = lerp([stops[i - 1].y, stops[i].y], f);
      return trainAt;
    };

    const laying = createBeats(
      links,
      (l) => l.laid,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const arriving = createBeats(
      arrivals,
      (a) => a.ms,
      (a, k) => {
        cover!.promote(a.worker);
        if (a.final) {
          cover!.blast(a.worker.at);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(a.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STOP_SHAKE, k / Math.max(1, arrivals.length - 1)));
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
          laying.tick(ms, now);
          arriving.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const l of links)
            if (ms >= l.laid)
              drawBolt(ctx, l.bolt, 0.45 + 0.35 * Math.random(), 0.6);
          for (const a of arrivals) {
            const t = (ms - a.ms) / STRIKE_MS;
            if (t >= 0 && t < 1) drawStrike(ctx, a.worker.at, 1 - t, 1.5, now);
          }
          drawWispBetween(
            ctx,
            train,
            ms,
            now,
            WISP_SIZE * TRAIN,
            1,
            railMs,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
