// the "Crawl" event (lightning; free upgrade levels): it covers its crit,
// whose click freezes the screen while lightning crawls out of the clicked
// floor's button and round the edge of every income bar in view, one after
// another, ever faster, a crackling snake of bolts racing right round its
// outline; each bar it laps jolts with a crack, a bang and free levels;
// then every bar's outline blazes at once in a huge blast and shake as
// every bar slams. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";

const KEY = "crawl";
const MAX_BARS = 5;
// the crawler is LINKS bolts long, each LINK of the outline, PAD px off it
const LINKS = 4;
const LINK = 0.05;
const PAD = 8;
const SCALE = 0.55;
const FINAL_MS = 320;
const LAP_SHAKE: [number, number] = [0.5, 1.3];

// the point `p` 0..1 round a bar's outline, padded out, into `into`
function around(bar: RewardBar, p: number, into: Point): Point {
  const x0 = bar.box.x - PAD;
  const y0 = bar.box.y - PAD;
  const w = bar.box.width + PAD * 2;
  const h = bar.box.height + PAD * 2;
  let d = (((p % 1) + 1) % 1) * 2 * (w + h);
  if (d < w) {
    into.x = x0 + d;
    into.y = y0;
  } else if ((d -= w) < h) {
    into.x = x0 + w;
    into.y = y0 + d;
  } else if ((d -= h) < w) {
    into.x = x0 + w - d;
    into.y = y0 + h;
  } else {
    into.x = x0;
    into.y = y0 + h - (d - w);
  }
  return into;
}

export const forceCrawlEvent = registerWispEvent(
  KEY,
  "Crawl",
  () => CONFIG.crawlEvent.chance,
  (floor, context) => {
    const { lapsMs, levelShare, holdMs, mergeMs } = CONFIG.crawlEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    // the crawler's joints, shared by its bolts
    const joints: Point[] = Array.from({ length: LINKS + 1 }, () => ({
      x: 0,
      y: 0,
    }));
    const links: Bolt[] = Array.from({ length: LINKS }, (_, i) =>
      createBolt(joints[i], joints[i + 1], 0),
    );
    let clock = 0;
    const laps = bars.map((bar, k) => {
      const starts = clock;
      clock += lerp(lapsMs, k / Math.max(1, bars.length - 1));
      return { bar, starts, ends: clock, from: Math.random() };
    });
    const endAt = clock;
    // every bar's outline, for the finale
    const rims = bars.map((bar) => {
      const x0 = bar.box.x - PAD;
      const y0 = bar.box.y - PAD;
      const x1 = bar.box.x + bar.box.width + PAD;
      const y1 = bar.box.y + bar.box.height + PAD;
      const corners: Point[] = [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ];
      return corners.map(
        (c, i): Bolt => createBolt(c, corners[(i + 1) % 4], 1),
      );
    });

    const lapping = createBeats(
      laps,
      (l) => l.ends,
      (l, k) => {
        const t = k / Math.max(1, laps.length - 1);
        cover!.levels(l.bar, levelsFor(l.bar.floor, levelShare, 2));
        cover!.burst(l.bar.center, 0.4 + 0.3 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAP_SHAKE, t));
      },
    );
    const blazing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(bars[bars.length - 1].center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          lapping.tick(ms, now);
          blazing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FINAL_MS) return;
          if (ms < endAt) {
            let k = 0;
            while (k < laps.length - 1 && ms > laps[k].ends) k++;
            const lap = laps[k];
            const head =
              lap.from + clamp01((ms - lap.starts) / (lap.ends - lap.starts));
            for (let i = 0; i <= LINKS; i++)
              around(lap.bar, head - (LINKS - i) * LINK, joints[i]);
            for (const link of links) drawBolt(ctx, link, 1, SCALE);
            drawStrike(ctx, joints[LINKS], 0.8, 0.6, now);
            return;
          }
          const t = (ms - endAt) / FINAL_MS;
          for (const rim of rims)
            for (const bolt of rim) drawBolt(ctx, bolt, 1 - t, SCALE);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
