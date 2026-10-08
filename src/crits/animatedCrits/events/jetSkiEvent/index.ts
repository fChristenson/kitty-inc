// the "Jet Ski" event (mix; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a jet-ski wisp launches off the
// clicked floor's button and tears along the top income bar, a wake of
// cash churning out behind it; at the end of the bar it lands the bar free
// levels with a splash and a jolt and jumps, airborne, down onto the next
// bar to tear back the other way, ever faster, the last run ending in a
// huge blast and shake as the cash sweeps into the total. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pointAlong,
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "jetSki";
const REWARD = 2;
const MAX_BARS = 4;
const RIDE = 14;
const JUMP = 120;
const STEPS = 30;
const SKI = 0.5;
const RUN_SHAKE: [number, number] = [0.6, 1.2];

export const forceJetSkiEvent = registerWispEvent(
  KEY,
  "Jet Ski",
  () => CONFIG.jetSkiEvent.chance,
  (floor, context) => {
    const { runsMs, jumpMs, holdMs, mergeMs } = CONFIG.jetSkiEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock: number = jumpMs;
    let from: Point = button;
    const runs = bars.map((bar, k) => {
      const ltr = k % 2 === 0;
      const y = bar.box.y - RIDE;
      const a: Point = { x: ltr ? bar.box.x : bar.box.x + bar.box.width, y };
      const b: Point = { x: ltr ? bar.box.x + bar.box.width : bar.box.x, y };
      const line = sampleLine((u) => ({ x: lerp([a.x, b.x], u), y }), STEPS);
      const travelMs = lerp(runsMs, k / Math.max(1, bars.length - 1));
      const pour: Pour = {
        coinsAlong: 520,
        width: 26,
        streamMs: travelMs * 0.6,
        travelMs,
      };
      const jumpFrom = from;
      const ctrl: Point = {
        x: (jumpFrom.x + a.x) / 2,
        y: Math.min(jumpFrom.y, a.y) - JUMP,
      };
      const lands = clock;
      const ends = lands + travelMs;
      clock = ends + jumpMs;
      from = b;
      return {
        bar,
        a,
        b,
        line,
        along: measure(line),
        pour,
        jumpFrom,
        ctrl,
        lands,
        ends,
      };
    });
    const last = runs[runs.length - 1];
    const endAt = last.ends;
    const durationMs = Math.max(
      pourDurationMs(last.lands, last.pour),
      endAt + holdMs + mergeMs,
    );
    const skiAt: Point = { x: 0, y: 0 };
    const ski = (ms: number): Point => {
      let r = runs[0];
      for (const run of runs) if (ms >= run.lands - jumpMs) r = run;
      if (ms < r.lands)
        return bezier(
          r.jumpFrom,
          r.ctrl,
          r.a,
          clamp01((ms - (r.lands - jumpMs)) / jumpMs),
          skiAt,
        );
      return pointAlong(
        r.line,
        r.along,
        (ms - r.lands) / (r.ends - r.lands),
        skiAt,
      );
    };

    const riding = createBeats(
      runs,
      (r) => r.lands,
      (r) => {
        pourLine(cover!, r.line, r.pour);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const ending = createBeats(
      runs,
      (r) => r.ends,
      (r, k) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor), r.a);
        if (r === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(r.b);
          return;
        }
        cover!.burst(r.b, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(RUN_SHAKE, k / Math.max(1, runs.length - 1)));
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
          riding.tick(ms, now);
          ending.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(ctx, ski, ms, now, WISP_SIZE * SKI, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
