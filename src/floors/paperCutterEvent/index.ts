// the "Paper Cutter" event (beam; free upgrade levels): it covers its crit,
// whose click freezes the screen while a hinge wisp lights up at the end of
// an income bar and a blazing blade of light swings up off it like the arm
// of a paper cutter, an aim line flickering along the bar; it chops down
// flat onto the bar in a blur with a crack, a spray of sparks along its
// whole length and a jolt, landing free levels; the cutter hops to the next
// bar's end and chops again, quicker each time, the last chop a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../shared/beam";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "paperCutter";
const MAX_BARS = 4;
const HINGE = 30;
const OVER = 60;
// the arm lifts to RAISED rad over the bar, a RAISE share of each cut
const RAISED = -1.35;
const RAISE = 0.6;
const BLADE = 16;
const GHOSTS = 3;
const GHOST_MS = 18;
const SPARKS = 4;
const SPARK_MS = 260;
const HINGE_WISP = 0.45;
const CHOP_SHAKE: [number, number] = [0.7, 1.5];

interface Cut {
  bar: RewardBar;
  hinge: Point;
  length: number;
  starts: number;
  drops: number;
  chops: number;
}

export const forcePaperCutterEvent = registerWispEvent(
  KEY,
  "Paper Cutter",
  () => CONFIG.paperCutterEvent.chance,
  (floor, context) => {
    const { cutsMs, levelShare, holdMs, mergeMs } = CONFIG.paperCutterEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const cuts: Cut[] = bars.map((bar, k) => {
      const span = lerp(cutsMs, k / Math.max(1, bars.length - 1));
      const starts = clock;
      clock += span;
      return {
        bar,
        hinge: { x: bar.box.x - HINGE, y: bar.center.y },
        length: bar.box.width + HINGE + OVER,
        starts,
        drops: starts + span * RAISE,
        chops: clock,
      };
    });
    const last = cuts[cuts.length - 1];
    const endAt = last.chops;
    const cutAt = (ms: number) => {
      let current = cuts[0];
      for (const c of cuts) if (ms >= c.starts) current = c;
      return current;
    };
    const angle = (c: Cut, ms: number) => {
      if (ms < c.drops)
        return (
          RAISED * easeOut(clamp01((ms - c.starts) / (c.drops - c.starts)))
        );
      return (
        RAISED * (1 - easeIn(clamp01((ms - c.drops) / (c.chops - c.drops))))
      );
    };
    const tip: Point = { x: 0, y: 0 };
    const tipAt = (c: Cut, a: number) => {
      tip.x = c.hinge.x + Math.cos(a) * c.length;
      tip.y = c.hinge.y + Math.sin(a) * c.length;
      return tip;
    };
    const lineEnd: Point = { x: 0, y: 0 };
    const spark: Point = { x: 0, y: 0 };
    const hinge = (ms: number): Point => cutAt(Math.max(0, ms)).hinge;

    const chopping = createBeats(
      cuts,
      (c) => c.chops,
      (c, k) => {
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 2), {
          x: c.bar.center.x,
          y: c.bar.center.y - 200,
        });
        if (c === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          return;
        }
        cover!.burst(c.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CHOP_SHAKE, k / Math.max(1, cuts.length - 1)));
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
        tick: (ms, now) => chopping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + SPARK_MS) return;
          // sparks flying along each bar the blade just bit into
          for (const c of cuts) {
            const t = (ms - c.chops) / SPARK_MS;
            if (t < 0 || t >= 1) continue;
            for (let i = 0; i < SPARKS; i++) {
              spark.x = c.bar.box.x + ((i + 0.5) / SPARKS) * c.bar.box.width;
              spark.y = c.bar.center.y;
              drawBeamFlare(ctx, spark, 26 * (1 - t), 1 - t, now);
            }
          }
          if (ms >= endAt) return;
          const c = cutAt(ms);
          if (ms < c.drops) {
            lineEnd.x = c.hinge.x + c.length;
            lineEnd.y = c.hinge.y;
            drawAimLaser(ctx, c.hinge, lineEnd);
          } else {
            // a blur of the blade a few ms behind as it chops
            for (let g = GHOSTS; g >= 1; g--)
              drawBeam(
                ctx,
                c.hinge,
                tipAt(c, angle(c, Math.max(c.drops, ms - g * GHOST_MS))),
                BLADE,
                0.25 * (1 - g / (GHOSTS + 1)),
              );
          }
          drawBeam(ctx, c.hinge, tipAt(c, angle(c, ms)), BLADE, 0.95);
          drawBeamFlare(ctx, c.hinge, 18, 1, now);
          drawWispBetween(
            ctx,
            hinge,
            ms,
            now,
            WISP_SIZE * HINGE_WISP,
            0.5,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
