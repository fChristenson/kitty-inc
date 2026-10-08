// the "Glass Rain" event (shatter; free upgrade levels): it covers its crit,
// whose click freezes the screen while a blazing point hammers the top of
// the screen from behind, knock after knock, cracks racing down from it; on the
// last the whole screen shatters and its shards pour straight down like a
// downpour of glass, every income bar it rains past jolting with a flash, a
// crack and free levels; as the last shards fall away every bar slams in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeamFlare } from "../../../../shared/beam";
import {
  copyPane,
  createPane,
  drawCracks,
  drawShards,
  PANE_COPY_EARLY_MS,
  releasePane,
  type Shard,
} from "../../../../shared/shatter";
import { findRewardBars, levelsFor } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "glassRain";
const MAX_BARS = 5;
const CRACKS = 10;
// the shards start falling at DROP px/ms, speeding up at FALL, drifting a bit
const DROP = 0.25;
const FALL = 0.004;
const DRIFT = 0.25;
const KNOCK_SHAKE: [number, number] = [0.8, 1.4];
const RAIN_SHAKE: [number, number] = [0.6, 1.4];

export const forceGlassRainEvent = registerWispEvent(
  KEY,
  "Glass Rain",
  () => CONFIG.glassRainEvent.chance,
  (floor, context, area) => {
    const { knocksMs, fallMs, levelShare, holdMs, mergeMs } =
      CONFIG.glassRainEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const own = bars.find((b) => b.floor === floor) ?? bars[bars.length - 1];
    const impact: Point = {
      x: (area.left + area.right) / 2 + (Math.random() - 0.5) * 120,
      y: area.top + 30,
    };
    const pane = createPane(impact, area, {
      cracks: CRACKS,
      rings: [180, 420, 700],
    });
    const knocks = knocksMs;
    const shatterAt = knocks[knocks.length - 1];
    const endAt = shatterAt + fallMs;
    const opened = (i: number) =>
      knocks[Math.floor((i * (knocks.length - 1)) / CRACKS)];
    const rain = (shard: Shard, t: number, into: Point) => {
      into.x = shard.vx * DRIFT * t;
      into.y = DROP * t + 0.5 * FALL * t * t;
    };
    // the glass from the top of the screen reaches each bar
    const passes = bars
      .map((bar) => {
        const d = bar.center.y - area.top;
        const t = (-DROP + Math.sqrt(DROP * DROP + 2 * FALL * d)) / FALL;
        return { bar, at: shatterAt + t };
      })
      .filter((p) => p.at < endAt)
      .sort((a, b) => a.at - b.at);

    const knocking = createBeats(
      knocks,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, knocks.length - 1);
        cover!.burst(impact, 0.6 + 0.6 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(KNOCK_SHAKE, t) + (k === knocks.length - 1 ? 0.6 : 0));
      },
    );
    const raining = createBeats(
      passes,
      (p) => p.at,
      (p, k) => {
        const t = k / Math.max(1, passes.length - 1);
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2), {
          x: p.bar.center.x,
          y: p.bar.center.y - 80,
        });
        cover!.burst(p.bar.center, 0.5 + 0.3 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(RAIN_SHAKE, t));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.levels(own, levelsFor(own.floor, levelShare, 3));
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
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
          knocking.tick(ms, now);
          raining.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms >= endAt) {
            releasePane(pane);
            return;
          }
          if (ms >= shatterAt - PANE_COPY_EARLY_MS) copyPane(ctx, pane);
          if (ms < shatterAt) {
            drawCracks(ctx, pane, ms, opened);
            drawBeamFlare(
              ctx,
              impact,
              20 + 20 * clamp01(ms / shatterAt),
              0.9,
              now,
            );
            return;
          }
          drawShards(ctx, pane, ms - shatterAt, 1, rain);
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
