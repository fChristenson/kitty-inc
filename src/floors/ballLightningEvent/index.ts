// the "Ball Lightning" event (lightning; free upgrade levels and perma tiers
// for workers): it covers its crit, whose click freezes the screen while a
// crackling ball of lightning bursts out of the clicked floor's button and
// careens erratically round the screen, ever faster; whenever it swings near
// an income bar or a worker a bolt lashes out of it onto them in a blinding
// crack, a bang and a jolt: free levels for a bar, a perma tier for a worker;
// then it dives into the clicked floor's bar and blows in a huge blast and
// shake, every bar slamming. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import {
  findRewardBars,
  findRewardWorkers,
  levelsFor,
  type RewardBar,
  type RewardWorker,
} from "../eventRewards";
import { WORKER_HEIGHT } from "../worker";

const KEY = "ballLightning";
const MAX_BARS = 4;
const MAX_WORKERS = 4;
// the ball lashes out from REACH px short of each target, on an erratic swerve
const REACH = 190;
const SWERVE = 220;
const BALL = 1.15;
const SPARKS = 3;
const SPARK_REACH = 55;
const ZAP_MS = 150;
const ZAP_SHAKE: [number, number] = [0.8, 1.7];
const ZAP_BURST: [number, number] = [0.45, 0.85];

type Target =
  | { at: Point; bar: RewardBar; worker?: undefined }
  | { at: Point; worker: RewardWorker; bar?: undefined };

export const forceBallLightningEvent = registerWispEvent(
  KEY,
  "Ball Lightning",
  () => CONFIG.ballLightningEvent.chance,
  (floor, context) => {
    const { legsMs, diveMs, levelShare, holdMs, mergeMs } =
      CONFIG.ballLightningEvent;
    const bars =
      context.upgradeFloorFree === undefined
        ? []
        : findRewardBars(floor, context).slice(0, MAX_BARS);
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    const button = getButtonCenter(context.isGroundFloor);
    // nearest first from the button, so it careens target to target
    const left: Target[] = [
      ...bars.map((bar) => ({ at: bar.center, bar })),
      ...workers.map((worker) => ({
        at: { x: worker.at.x, y: worker.at.y - WORKER_HEIGHT * 0.2 },
        worker,
      })),
    ];
    if (left.length === 0) return;
    const targets: Target[] = [];
    let from = button;
    while (left.length) {
      let best = 0;
      left.forEach((t, i) => {
        if (
          Math.hypot(t.at.x - from.x, t.at.y - from.y) <
          Math.hypot(left[best].at.x - from.x, left[best].at.y - from.y)
        )
          best = i;
      });
      from = left[best].at;
      targets.push(...left.splice(best, 1));
    }
    const own = bars.find((b) => b.floor === floor);
    const end = own?.center ?? targets[targets.length - 1].at;
    // leg k runs from stops[k] to stops[k + 1], swerving through bends[k]
    const stops: Point[] = [button];
    const bends: Point[] = [];
    targets.forEach((t) => {
      const prev = stops[stops.length - 1];
      const dx = prev.x - t.at.x;
      const dy = prev.y - t.at.y;
      const length = Math.hypot(dx, dy) || 1;
      const reach = Math.min(REACH, length * 0.6);
      const stop = {
        x: t.at.x + (dx / length) * reach,
        y: t.at.y + (dy / length) * reach,
      };
      bends.push({
        x: (prev.x + stop.x) / 2 + (Math.random() - 0.5) * 2 * SWERVE,
        y: (prev.y + stop.y) / 2 + (Math.random() - 0.5) * 2 * SWERVE,
      });
      stops.push(stop);
    });
    const zaps: number[] = [];
    let clock = 0;
    targets.forEach((_, k) => {
      clock += lerp(legsMs, k / Math.max(1, targets.length - 1));
      zaps.push(clock);
    });
    const diveAt = clock;
    const blowAt = diveAt + diveMs;

    const into: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point | null => {
      if (ms < 0 || ms >= blowAt) return null;
      if (ms >= diveAt) {
        const last = stops[stops.length - 1];
        const u = easeIn((ms - diveAt) / diveMs);
        into.x = last.x + (end.x - last.x) * u;
        into.y = last.y + (end.y - last.y) * u;
        return into;
      }
      let k = 0;
      while (ms >= zaps[k]) k++;
      const start = k === 0 ? 0 : zaps[k - 1];
      bezier(
        stops[k],
        bends[k],
        stops[k + 1],
        smoothstep((ms - start) / (zaps[k] - start)),
        into,
      );
      return into;
    };
    const lashes = targets.map((t) => createBolt({ x: 0, y: 0 }, t.at, 1));
    const sparks = Array.from({ length: SPARKS }, () =>
      createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 0),
    );

    const zapping = createBeats(
      targets,
      (_, k) => zaps[k],
      (t, k) => {
        const s = k / Math.max(1, targets.length - 1);
        if (t.bar)
          cover!.levels(
            t.bar,
            levelsFor(t.bar.floor, levelShare, 2),
            stops[k + 1],
          );
        else cover!.promote(t.worker);
        cover!.burst(t.at, lerp(ZAP_BURST, s));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ZAP_SHAKE, s));
      },
    );
    const blowing = createBeats(
      [blowAt],
      (ms) => ms,
      () => {
        if (own) cover!.levels(own, levelsFor(own.floor, levelShare, 3));
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(end);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blowAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        workers,
        tick: (ms, now) => {
          zapping.tick(ms, now);
          blowing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / blowAt);
          const at = ball(ms);
          if (at) {
            sparks.forEach((spark, k) => {
              const angle = now * 0.02 + (k * Math.PI * 2) / SPARKS;
              spark.from.x = at.x;
              spark.from.y = at.y;
              spark.to.x = at.x + Math.cos(angle) * SPARK_REACH * (1 + heat);
              spark.to.y = at.y + Math.sin(angle) * SPARK_REACH * (1 + heat);
              drawBolt(ctx, spark, 0.7, 0.5);
            });
            zaps.forEach((z, k) => {
              const since = ms - z;
              if (since < 0 || since >= ZAP_MS) return;
              lashes[k].from.x = at.x;
              lashes[k].from.y = at.y;
              drawBolt(ctx, lashes[k], 1 - since / ZAP_MS, 1.1);
              drawStrike(ctx, targets[k].at, 1 - since / ZAP_MS, 1, now);
            });
          }
          drawWispBetween(
            ctx,
            ball,
            ms,
            now,
            WISP_SIZE * BALL,
            heat,
            0,
            blowAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardWorkers(floor, context).length > 0 ||
    (context.upgradeFloorFree !== undefined &&
      findRewardBars(floor, context).length > 0),
);
