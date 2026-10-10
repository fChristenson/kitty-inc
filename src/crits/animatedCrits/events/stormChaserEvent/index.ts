// the "Storm Chaser" event (lightning; worker perma tiers, free upgrade
// levels and a crit tier): it covers its crit, whose click freezes the
// screen while a wisp bolts out of the clicked floor's button and flees
// across the screen with the storm hard on its heels, bolts cracking down
// right where it just was; it weaves past workers and income bars, each
// bolt that misses it striking one instead in a blinding crack, a bang and
// a jolt: a perma tier for a worker, free levels for a bar, ever faster;
// it dives for cover in the clicked floor's bar, but a colossal bolt
// catches it there and the bar jumps a crit tier in a huge blast and shake.
// Then the crit's tier pays out
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
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import {
  findRewardBars,
  findRewardWorkers,
  type RewardBar,
  type RewardWorker,
} from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "stormChaser";
const MAX_WORKERS = 4;
const MAX_BARS = 3;
// each bolt cracks down LAG ms behind the wisp, from SKY px over the screen
const LAG = 110;
const SKY = 60;
// a stray bolt every STRAY_MS on the wisp's wake
const STRAY_MS = 120;
const BOLT_MS = 170;
const FINAL_MS = 280;
const FINAL_SCALE = 2.4;
const STRIKE_SHAKE: [number, number] = [0.7, 1.5];

type Target =
  | { at: Point; worker: RewardWorker; bar?: undefined }
  | { at: Point; bar: RewardBar; worker?: undefined };

export const forceStormChaserEvent = registerWispEvent(
  KEY,
  "Storm Chaser",
  () => CONFIG.stormChaserEvent.chance,
  (floor, context, area) => {
    const { runMs, levelShare, holdMs, mergeMs } = CONFIG.stormChaserEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    const button = getButtonCenter(context.isGroundFloor);
    const left: Target[] = [
      ...findRewardWorkers(floor, context)
        .slice(0, MAX_WORKERS)
        .map((worker) => ({ at: worker.at, worker })),
      ...(context.upgradeFloorFree
        ? found
            .filter((b) => b !== own)
            .slice(0, MAX_BARS)
            .map((bar) => ({
              at: {
                x: bar.box.x + bar.box.width * (0.2 + 0.6 * Math.random()),
                y: bar.center.y,
              },
              bar,
            }))
        : []),
    ];
    // nearest target next, from the button
    const targets: Target[] = [];
    let here: Point = button;
    while (left.length) {
      let best = 0;
      for (let i = 1; i < left.length; i++)
        if (
          Math.hypot(left[i].at.x - here.x, left[i].at.y - here.y) <
          Math.hypot(left[best].at.x - here.x, left[best].at.y - here.y)
        )
          best = i;
      const next = left.splice(best, 1)[0];
      targets.push(next);
      here = next.at;
    }
    const route: Point[] = [button, ...targets.map((t) => t.at), own.center];
    const last = route.length - 1;
    // the wisp's share of the route at ms, picking up speed
    const share = (ms: number) => {
      const t = clamp01(ms / runMs);
      return 0.4 * t + 0.6 * t * t;
    };
    const timeAt = (u: number) =>
      runMs * ((-0.4 + Math.sqrt(0.16 + 2.4 * u)) / 1.2);
    const head: Point = { x: 0, y: 0 };
    const wisp = (ms: number): Point | null =>
      ms < 0 || ms > runMs ? null : alongRoute(route, share(ms), head);
    const sky = area.top - SKY;
    const strike = (to: Point, forks: number): Bolt =>
      createBolt({ x: to.x + (Math.random() * 2 - 1) * 90, y: sky }, to, forks);
    const hits = targets.map((target, k) => ({
      target,
      at: timeAt((k + 1) / last) + LAG,
      bolt: strike(target.at, 2),
    }));
    const strays = Array.from(
      { length: Math.floor(runMs / STRAY_MS) },
      (_, i) => {
        const at = (i + 1) * STRAY_MS;
        const to = alongRoute(route, share(at - LAG), { x: 0, y: 0 });
        return { at, bolt: strike(to, 1) };
      },
    ).filter((s) => s.at < runMs);
    const finalBolt = strike(own.center, 4);

    const striking = createBeats(
      hits,
      (h) => h.at,
      (h, k) => {
        const t = k / Math.max(1, hits.length - 1);
        const { target } = h;
        if (target.worker) cover!.promote(target.worker);
        else
          cover!.levels(
            target.bar,
            levelsFor(target.bar.floor, levelShare, 2),
            h.bolt.from,
          );
        cover!.burst(target.at, 0.6 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, t));
      },
    );
    const catching = createBeats(
      [runMs],
      (ms) => ms,
      () => {
        cover!.tierUp(own, finalBolt.from);
        cover!.slam(own);
        cover!.blast(own.center);
      },
    );
    const endAt = Math.max(runMs, ...hits.map((h) => h.at));

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [own, ...targets.flatMap((t) => (t.bar ? [t.bar] : []))],
        workers: targets.flatMap((t) => (t.worker ? [t.worker] : [])),
        tick: (ms, now) => {
          striking.tick(ms, now);
          catching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawWispBetween(
            ctx,
            wisp,
            ms,
            now,
            WISP_SIZE,
            clamp01(ms / runMs),
            0,
            runMs,
          );
          if (ms > endAt + FINAL_MS) return;
          for (const s of strays) {
            const t = (ms - s.at) / BOLT_MS;
            if (t >= 0 && t < 1) drawBolt(ctx, s.bolt, (1 - t) * 0.7, 0.7);
          }
          for (const h of hits) {
            const t = (ms - h.at) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, h.bolt, 1 - t, 1.2);
            drawStrike(ctx, h.target.at, 1 - t, 1.3, now);
          }
          const t = (ms - runMs) / FINAL_MS;
          if (t >= 0 && t < 1) {
            drawBolt(ctx, finalBolt, 1 - t, FINAL_SCALE);
            drawStrike(ctx, own.center, 1 - t, FINAL_SCALE * 1.4, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
