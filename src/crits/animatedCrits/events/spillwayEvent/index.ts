// the "Spillway" event (money; levels and cash): it covers its crit, whose
// click freezes the screen while a river of cash pours out of the clicked
// floor's button up into a brimming pool along the top of the screen; the
// pool spills over its whole lip in a curtain of cash falling down the full
// width of the screen, and every bar its front crashes past flashes with a
// bang, a jolt and free levels; at the bottom the curtain slams down in a
// huge blast. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "spillway";
const REWARD = 2;
const MAX_BARS = 5;
const SHEETS = 8;
const TOP = 150;
const BOTTOM = 90;
const EDGE = 40;
const RIPPLE = 14;
const PASS_SHAKE: [number, number] = [0.6, 1.3];

export const forceSpillwayEvent = registerWispEvent(
  KEY,
  "Spillway",
  () => CONFIG.spillwayEvent.chance,
  (floor, context, area) => {
    const { feedMs, sheetMs, levelShare, holdMs, mergeMs } =
      CONFIG.spillwayEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const y0 = area.top + TOP;
    const y1 = area.bottom - BOTTOM;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const lip: Point = { x: (left + right) / 2, y: y0 };
    const bend: Point = { x: right, y: y0 - 80 };
    const feed = sampleLine(
      (u) => bezier(button, bend, lip, u, { x: 0, y: 0 }),
      40,
    );
    const feedPour: Pour = {
      coinsAlong: 320,
      width: 48,
      streamMs: feedMs,
      travelMs: feedMs * 0.8,
    };
    const sheetAt = feedMs * 0.8;
    const sheetPour: Pour = {
      coinsAlong: 80,
      width: 24,
      streamMs: sheetMs * 0.6,
      travelMs: sheetMs,
    };
    const sheets = Array.from({ length: SHEETS }, (_, i) => {
      const x = lerp([left, right], (i + 0.5) / SHEETS);
      return sampleLine(
        (u) => ({
          x: x + Math.sin(u * Math.PI * 3 + i) * RIPPLE,
          y: lerp([y0, y1], u),
        }),
        30,
      );
    });
    const passes = bars
      .map((bar) => ({
        bar,
        at: sheetAt + sheetMs * clamp01((bar.center.y - y0) / (y1 - y0)),
      }))
      .sort((a, b) => a.at - b.at);
    const endAt = sheetAt + sheetMs;
    const foot: Point = { x: lip.x, y: y1 };
    const durationMs = Math.max(
      pourDurationMs(sheetAt, sheetPour),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      [0, sheetAt],
      (ms) => ms,
      (ms) => {
        if (ms === 0) pourLine(cover!, feed, feedPour);
        else for (const line of sheets) pourLine(cover!, line, sheetPour);
      },
    );
    const passing = createBeats(
      passes,
      (p) => p.at,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2), lip);
        cover!.burst(p.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(foot);
        if (cover!.isLive()) playExplosion();
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
        bars,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          passing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
