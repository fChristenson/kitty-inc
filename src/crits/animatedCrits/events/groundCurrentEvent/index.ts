// the "Ground Current" event (lightning; worker perma tiers): it covers its
// crit, whose click freezes the screen while a colossal bolt cracks down
// out of the sky into the ground in a blinding flash and a bang; the
// current splits and crawls out from the strike along the ground in every
// direction at once as jagged crackling lines, and each time one reaches a
// worker's feet it leaps up through them in a flash and a jolt as they
// climb a perma tier, the nearest first; the last one reached goes up in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "groundCurrent";
const MAX_WORKERS = 8;
const FEET = 50;
const LEAP = 70;
const STRIKE_MS = 160;
const LEAP_MS = 180;
const FADE_MS = 250;
const LEAP_SHAKE: [number, number] = [0.5, 1.3];

interface Leg {
  worker: RewardWorker;
  feet: Point;
  reaches: number;
  crawl: Bolt;
  tip: Point;
  leap: Bolt;
}

export const forceGroundCurrentEvent = registerWispEvent(
  KEY,
  "Ground Current",
  () => CONFIG.groundCurrentEvent.chance,
  (floor, context, area) => {
    const { crawlMs, holdMs, mergeMs } = CONFIG.groundCurrentEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const ground: Point = {
      x: (area.left + area.right) / 2,
      y: Math.max(...workers.map((w) => w.at.y)) + FEET,
    };
    const sky = createBolt({ x: ground.x + 40, y: area.top - 40 }, ground, 3);
    const far = Math.max(
      ...workers.map((w) =>
        Math.hypot(w.at.x - ground.x, w.at.y + FEET - ground.y),
      ),
    );
    const legs: Leg[] = workers.map((worker) => {
      const feet = { x: worker.at.x, y: worker.at.y + FEET };
      const tip = { x: ground.x, y: ground.y };
      const crawl = createBolt(ground, feet, 1);
      crawl.to = tip;
      const d = Math.hypot(feet.x - ground.x, feet.y - ground.y);
      return {
        worker,
        feet,
        reaches: STRIKE_MS + crawlMs * (d / (far || 1)),
        crawl,
        tip,
        leap: createBolt(feet, { x: worker.at.x, y: worker.at.y - LEAP }, 1),
      };
    });
    legs.sort((a, b) => a.reaches - b.reaches);
    const last = legs[legs.length - 1];
    const endAt = last.reaches + LEAP_MS;

    const striking = createBeats(
      [0],
      (ms) => ms,
      () => {
        cover!.burst(ground, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.2);
      },
    );
    const leaping = createBeats(
      legs,
      (l) => l.reaches,
      (l, k) => {
        cover!.promote(l.worker);
        if (l === last) {
          cover!.blast(l.worker.at);
          return;
        }
        cover!.burst(l.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LEAP_SHAKE, k / Math.max(1, legs.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + FADE_MS + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          striking.tick(ms, now);
          leaping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + FADE_MS) return;
          const fade = 1 - clamp01((ms - endAt) / FADE_MS);
          if (ms < STRIKE_MS * 2) {
            const t = ms / (STRIKE_MS * 2);
            drawBolt(ctx, sky, 1 - t, 1.4);
            drawStrike(ctx, ground, 1 - t, 1.6, now);
          }
          for (const l of legs) {
            if (ms < STRIKE_MS) break;
            const u = clamp01((ms - STRIKE_MS) / (l.reaches - STRIKE_MS));
            l.tip.x = lerp([ground.x, l.feet.x], u);
            l.tip.y = lerp([ground.y, l.feet.y], u);
            drawBolt(ctx, l.crawl, 0.75 * fade, 0.55);
            const t = (ms - l.reaches) / LEAP_MS;
            if (t >= 0 && t < 1) {
              drawBolt(ctx, l.leap, 1 - t, 0.9);
              drawStrike(ctx, l.feet, 1 - t, 0.7, now);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
