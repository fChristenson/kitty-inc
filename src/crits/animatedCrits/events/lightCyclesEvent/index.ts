// the "Light Cycles" event (beam; free upgrade levels): it covers its crit,
// whose click freezes the screen while two light-cycle wisps shoot out of
// the clicked floor's button in opposite directions, each leaving a solid
// wall of light behind it, racing along the rows of the income bars and
// cutting hard 90° turns down the screen's edges from row to row; every bar
// a cycle tears through lands free levels with a flash and a jolt; at the
// bottom the walls blaze up in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { measure, pointAlong } from "../../cashFlow";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "lightCycles";
const MAX_BARS = 4;
const EDGE = 30;
// the two cycles ride OFFSET px apart so their walls run side by side
const OFFSET = 9;
const WALL = 10;
const FADE_MS = 400;
const CYCLE = 0.45;
const HIT_SHAKE: [number, number] = [0.4, 1.1];

export const forceLightCyclesEvent = registerWispEvent(
  KEY,
  "Light Cycles",
  () => CONFIG.lightCyclesEvent.chance,
  (floor, context, area) => {
    const { raceMs, holdMs, mergeMs } = CONFIG.lightCyclesEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const hits: { bar: RewardBar; ms: number; at: Point }[] = [];
    const cycles = [1, -1].map((dir, c) => {
      const dy = c === 0 ? -OFFSET : OFFSET;
      const route: Point[] = [{ x: button.x, y: button.y }];
      let x = button.x;
      let heading = dir;
      for (const bar of bars) {
        const y = bar.center.y + dy;
        route.push({ x, y });
        x = heading > 0 ? right : left;
        route.push({ x, y });
        heading = -heading;
      }
      const along = measure(route);
      const length = along[along.length - 1];
      // the moment it tears through each bar on its row
      bars.forEach((bar, k) => {
        const a = route[k * 2 + 1];
        const b = route[k * 2 + 2];
        const lo = Math.min(a.x, b.x);
        const hi = Math.max(a.x, b.x);
        if (bar.center.x < lo || bar.center.x > hi) return;
        const d = along[k * 2 + 1] + Math.abs(bar.center.x - a.x);
        hits.push({
          bar,
          ms: (d / length) * raceMs,
          at: { x: bar.center.x, y: a.y },
        });
      });
      const head: Point = { x: 0, y: 0 };
      return {
        route,
        along,
        length,
        at: (ms: number): Point =>
          pointAlong(route, along, clamp01(ms / raceMs), head),
      };
    });
    hits.sort((a, b) => a.ms - b.ms);
    const endAt = raceMs;
    const tail: Point = { x: 0, y: 0 };

    const hitting = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.levels(
          h.bar,
          Math.max(1, Math.round(levelsFor(h.bar.floor) / 2)),
          h.at,
        );
        cover!.burst(h.at, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const finale = createBeats(
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
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FADE_MS) return;
          const alpha = ms > endAt ? 1 - (ms - endAt) / FADE_MS : 0.85;
          for (const c of cycles) {
            const d = clamp01(ms / raceMs) * c.length;
            for (let i = 1; i < c.route.length; i++) {
              if (c.along[i - 1] >= d) break;
              if (c.along[i] <= d) {
                drawBeam(ctx, c.route[i - 1], c.route[i], WALL, alpha);
                continue;
              }
              pointAlong(c.route, c.along, d / c.length, tail);
              drawBeam(ctx, c.route[i - 1], tail, WALL, alpha);
            }
            drawWispBetween(ctx, c.at, ms, now, WISP_SIZE * CYCLE, 1, 0, endAt);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
