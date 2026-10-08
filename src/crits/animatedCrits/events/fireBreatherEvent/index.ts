// the "Fire Breather" event (mix; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while a wisp above the clicked
// floor's button drinks a river of cash up out of it, swelling, then
// breathes it out as a roaring cone of cash rivers onto an income bar, which
// gains free levels with a flash and a jolt; it gulps again between breaths,
// sweeping bar by bar, each blast wider, and its last breath engulfs every
// bar at once in a huge blast and shake as they all slam. Pays floor income
// × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "fireBreather";
const REWARD = 2;
const MAX_BARS = 4;
const RISE = 220;
const STEPS = 24;
// rivers in each breath's cone, widening breath by breath
const CONE: [number, number] = [4, 8];
const FINAL_PER_BAR = 3;
const SPREAD: [number, number] = [0.4, 1];
const SWELL: [number, number] = [0.5, 1.2];
const BREATH_SHAKE: [number, number] = [0.6, 1.2];

export const forceFireBreatherEvent = registerWispEvent(
  KEY,
  "Fire Breather",
  () => CONFIG.fireBreatherEvent.chance,
  (floor, context) => {
    const { gulpsMs, breathMs, holdMs, mergeMs } = CONFIG.fireBreatherEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const meanY = bars.reduce((sum, b) => sum + b.center.y, 0) / bars.length;
    const mouth: Point = { x: button.x, y: Math.min(meanY, button.y - RISE) };
    const into: Point = { x: 0, y: 0 };
    const gulpLine = sampleLine(
      (u) => ({
        ...bezier(
          button,
          { x: button.x + 120, y: (button.y + mouth.y) / 2 },
          mouth,
          u,
          into,
        ),
      }),
      STEPS,
    );
    const cone = (targets: Point[]) =>
      targets.map((to) =>
        sampleLine(
          (u) => ({
            ...bezier(
              mouth,
              { x: (mouth.x + to.x) / 2, y: (mouth.y + to.y) / 2 - 60 },
              to,
              u,
              into,
            ),
          }),
          STEPS,
        ),
      );
    const fan = (bar: RewardBar, rivers: number, spread: number): Point[] =>
      Array.from({ length: rivers }, (_, i) => ({
        x: bar.center.x + bar.box.width * spread * ((i + 0.5) / rivers - 0.5),
        y: bar.center.y + (Math.random() - 0.5) * bar.box.height * 0.6,
      }));
    let clock = 0;
    const breaths = [...bars.map((bar) => [bar]), bars].map((targets, k) => {
      const t = k / bars.length;
      const final = k === bars.length;
      const gulpMs = lerp(gulpsMs, t);
      const lines = cone(
        final
          ? targets.flatMap((bar) => fan(bar, FINAL_PER_BAR, 0.8))
          : fan(targets[0], Math.round(lerp(CONE, t)), lerp(SPREAD, t)),
      );
      const gulps = clock;
      const breathes = gulps + gulpMs;
      const lands = breathes + breathMs;
      clock = lands;
      return {
        targets,
        final,
        t,
        lines,
        gulps,
        breathes,
        lands,
        gulp: {
          coinsAlong: 380,
          width: 26,
          streamMs: gulpMs * 0.6,
          travelMs: gulpMs * 0.9,
        } as Pour,
        breath: {
          coinsAlong: final ? 140 : 180,
          width: 16 + 10 * t,
          streamMs: breathMs * 0.6,
          travelMs: breathMs,
        } as Pour,
      };
    });
    const last = breaths[breaths.length - 1];
    const endAt = last.lands;
    const durationMs = Math.max(
      pourDurationMs(last.breathes, last.breath),
      endAt + holdMs + mergeMs,
    );
    const at: Point = { x: 0, y: 0 };
    const breather = (ms: number): Point => {
      at.x = mouth.x;
      at.y = mouth.y + Math.sin(Math.max(0, ms) * 0.02) * 6;
      return at;
    };
    // swells as it gulps, shrinks as it breathes out
    const swell = (ms: number): number => {
      let b = breaths[0];
      for (const br of breaths) if (ms >= br.gulps) b = br;
      const full = lerp(SWELL, b.t);
      if (ms < b.breathes)
        return lerp(
          [SWELL[0] * 0.8, full],
          clamp01((ms - b.gulps) / (b.breathes - b.gulps)),
        );
      return lerp(
        [full, SWELL[0] * 0.8],
        clamp01((ms - b.breathes) / (b.lands - b.breathes)),
      );
    };

    const gulping = createBeats(
      breaths,
      (b) => b.gulps,
      (b) => pourLine(cover!, gulpLine, b.gulp),
    );
    const breathing = createBeats(
      breaths,
      (b) => b.breathes,
      (b) => {
        for (const line of b.lines) pourLine(cover!, line, b.breath);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const engulfing = createBeats(
      breaths,
      (b) => b.lands,
      (b) => {
        for (const bar of b.targets)
          cover!.levels(bar, levelsFor(bar.floor), mouth);
        if (b.final) {
          for (const bar of b.targets) cover!.slam(bar);
          cover!.blast(b.targets[0].center);
          return;
        }
        cover!.burst(b.targets[0].center, 0.7 + 0.3 * b.t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BREATH_SHAKE, b.t));
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
          gulping.tick(ms, now);
          breathing.tick(ms, now);
          engulfing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawWisp(
            ctx,
            breather,
            ms,
            now,
            WISP_SIZE * swell(ms),
            clamp01(ms / endAt),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
