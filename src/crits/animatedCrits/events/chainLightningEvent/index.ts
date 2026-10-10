// the "Chain Lightning" event (lightning; free upgrade levels and worker perma
// tiers): it covers its crit, whose click freezes the screen while a bolt of
// lightning cracks down out of the sky onto an income bar or a worker, then
// forks on to the next nearest, and the next, ever faster, each strike a
// blinding crack, a bang and a big jolt that lands free upgrade levels on a
// bar or lights a worker up a perma tier; then the whole chain blazes at
// once, crackling, and every bar slams in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import {
  findRewardBars,
  findRewardWorkers,
  type RewardBar,
  type RewardWorker,
} from "../../eventRewards";
import { WORKER_HEIGHT } from "../../../../floors/worker";
import type { Point } from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";

const KEY = "chainLightning";
const MAX_BARS = 3;
const MAX_WORKERS = 4;
// with few targets it forks back and forth among them, at least STRIKES times
const STRIKES = 7;
const STRIKE_SHAKE: [number, number] = [1.1, 2];
const STRIKE_BURST: [number, number] = [0.7, 1.1];

type Target = { at: Point; bar?: RewardBar; worker?: RewardWorker };

export const forceChainLightningEvent = registerWispEvent(
  KEY,
  "Chain Lightning",
  () => CONFIG.chainLightningEvent.chance,
  (floor, context, area) => {
    const { gapsMs, boltMs, finaleMs, levelShare, holdMs, mergeMs } =
      CONFIG.chainLightningEvent;
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context).slice(0, MAX_BARS)
      : [];
    const workers = findRewardWorkers(floor, context)
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_WORKERS);
    const left: Target[] = [
      ...bars.map((bar) => ({
        at: {
          x: bar.box.x + bar.box.width * lerp([0.25, 0.75], Math.random()),
          y: bar.center.y,
        },
        bar,
      })),
      ...workers.map((worker) => ({
        at: { x: worker.at.x, y: worker.at.y - WORKER_HEIGHT * 0.3 },
        worker,
      })),
    ];
    if (left.length === 0) return;
    // the sky, then always on to the nearest target not yet struck
    const sky = {
      x: lerp([area.left, area.right], 0.3 + 0.4 * Math.random()),
      y: area.top - 60,
    };
    const chain: Target[] = [];
    let from: Point = sky;
    while (left.length > 0) {
      let best = 0;
      left.forEach((t, i) => {
        if (
          Math.hypot(t.at.x - from.x, t.at.y - from.y) <
          Math.hypot(left[best].at.x - from.x, left[best].at.y - from.y)
        )
          best = i;
      });
      const [next] = left.splice(best, 1);
      chain.push(next);
      from = next.at;
    }
    const route = [...chain];
    for (
      let back = true;
      route.length < STRIKES && chain.length > 1;
      back = !back
    )
      route.push(...(back ? [...chain].reverse() : chain).slice(1));
    if (chain.length === 1) while (route.length < STRIKES) route.push(chain[0]);
    const hits = new Map<Target, number>();
    for (const t of route) hits.set(t, (hits.get(t) ?? 0) + 1);
    const strikes: number[] = [];
    let clock = 0;
    route.forEach((_, k) => {
      strikes.push(clock);
      clock += lerp(gapsMs, k / Math.max(1, route.length - 1));
    });
    const finaleAt = strikes[strikes.length - 1] + boltMs;
    const blastAt = finaleAt + finaleMs;
    // a target struck again gets a fresh bolt down out of the sky
    const bolts = route.map((t, k) =>
      createBolt(
        k === 0
          ? sky
          : route[k - 1] === t
            ? { x: lerp([area.left, area.right], Math.random()), y: sky.y }
            : route[k - 1].at,
        t.at,
      ),
    );

    const striking = createBeats(
      route,
      (_, k) => strikes[k],
      (t, k) => {
        if (t.bar)
          cover!.levels(
            t.bar,
            Math.ceil(levelsFor(t.bar.floor, levelShare) / hits.get(t)!),
            bolts[k].from,
          );
        if (t.worker) cover!.promote(t.worker);
        const u = k / Math.max(1, route.length - 1);
        cover!.burst(t.at, lerp(STRIKE_BURST, u));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, u));
      },
    );
    const finale = createBeats(
      [blastAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(route[route.length - 1].at);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        workers,
        tick: (ms, now) => {
          striking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= blastAt) return;
          if (ms >= finaleAt) {
            // every bolt at once, blazing brighter till it blows
            const swell = 0.6 + 0.4 * clamp01((ms - finaleAt) / finaleMs);
            for (const bolt of bolts) drawBolt(ctx, bolt, swell);
            for (const t of chain) drawStrike(ctx, t.at, 1, swell, now);
            return;
          }
          bolts.forEach((bolt, k) => {
            const since = ms - strikes[k];
            if (since < 0 || since >= boltMs) return;
            const fade = 1 - since / boltMs;
            drawBolt(ctx, bolt, fade);
            drawStrike(ctx, bolt.to, fade, fade, now);
          });
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    (context.upgradeFloorFree !== undefined &&
      findRewardBars(floor, context).length > 0) ||
    findRewardWorkers(floor, context).length > 0,
);
