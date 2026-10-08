// the "Comet Plow" event (mix; levels and cash): it covers its crit, whose
// click freezes the screen while a blazing comet wisp drops in from the top
// of the screen and plows straight down through the stack of income bars,
// throwing two great wakes of cash out to the sides of every bar it ploughs
// through, which flashes with a bang, a jolt and free levels; it slams into
// the ground in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
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
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "cometPlow";
const REWARD = 2;
const MAX_BARS = 5;
const WAKE = 260;
const WAKE_RISE = 120;
const COMET = 0.8;
const PLOW_SHAKE: [number, number] = [0.6, 1.4];

export const forceCometPlowEvent = registerWispEvent(
  KEY,
  "Comet Plow",
  () => CONFIG.cometPlowEvent.chance,
  (floor, context, area) => {
    const { plowMs, levelShare, holdMs, mergeMs } = CONFIG.cometPlowEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const x = (area.left + area.right) / 2;
    const y0 = area.top - 60;
    const ground: Point = { x, y: area.bottom - 60 };
    // the comet's fall speeds up, so it reaches y at plowMs * sqrt(share)
    const reach = (y: number) =>
      plowMs * Math.sqrt(clamp01((y - y0) / (ground.y - y0)));
    const wake: Pour = {
      coinsAlong: 160,
      width: 30,
      streamMs: 160,
      travelMs: 380,
    };
    const passes = bars.map((bar) => {
      const at: Point = { x, y: bar.center.y };
      const lines = [-1, 1].map((side) =>
        sampleLine(
          (u) =>
            bezier(
              at,
              { x: x + side * WAKE * 0.6, y: at.y - WAKE_RISE },
              { x: x + side * WAKE, y: at.y + 30 },
              u,
              { x: 0, y: 0 },
            ),
          20,
        ),
      );
      return { bar, at, ms: reach(bar.center.y), lines };
    });
    const endAt = plowMs;
    const durationMs = Math.max(
      ...passes.map((p) => pourDurationMs(p.ms, wake)),
      endAt + holdMs + mergeMs,
    );
    const cometAt: Point = { x, y: 0 };
    const comet = (ms: number): Point => {
      cometAt.y = lerp([y0, ground.y], easeIn(clamp01(ms / plowMs)));
      return cometAt;
    };

    const plowing = createBeats(
      passes,
      (p) => p.ms,
      (p, k) => {
        for (const line of p.lines) pourLine(cover!, line, wake);
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2));
        cover!.burst(p.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PLOW_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(ground);
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
          plowing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, comet, ms, now, WISP_SIZE * COMET, 1, 0, endAt),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
