// the "Circuit Board" event (lightning; free upgrade levels): it covers
// its crit, whose click freezes the screen while the clicked floor's
// button surges like a chip and a spark of lightning races out of it along
// square-cornered circuit traces, the crackling bolts lighting up behind
// it, to the end of an income bar, which jolts with a crack and free
// levels; trace after trace to bar after bar, ever faster; then the whole
// board lights up at once and every bar slams in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "circuitBoard";
const MAX_BARS = 5;
const INSET = 14;
const TRACE = 0.4;
const LIT = 0.55;
const FLASH_MS = 500;
const BAR_SHAKE: [number, number] = [0.6, 1.3];

export const forceCircuitBoardEvent = registerWispEvent(
  KEY,
  "Circuit Board",
  () => CONFIG.circuitBoardEvent.chance,
  (floor, context) => {
    const { tracesMs, levelShare, holdMs, mergeMs } = CONFIG.circuitBoardEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const traces = bars.map((bar, k) => {
      const end = bar.box.x + (k % 2 === 0 ? bar.box.width - INSET : INSET);
      const midY = lerp([button.y, bar.center.y], 0.5);
      const points: Point[] = [
        button,
        { x: button.x, y: midY },
        { x: end, y: midY },
        { x: end, y: bar.center.y },
      ];
      const legs = points.slice(1).map((to, i) => ({
        from: points[i],
        to,
        length: Math.hypot(to.x - points[i].x, to.y - points[i].y),
        bolt: createBolt(points[i], to, 0),
      }));
      const length = legs.reduce((s, l) => s + l.length, 0);
      const starts = clock;
      const span = lerp(tracesMs, k / Math.max(1, bars.length - 1));
      clock += span;
      return { bar, legs, length, starts, ends: clock, tip: points[3] };
    });
    const endAt = clock;
    const spark: Point = { x: 0, y: 0 };

    const arriving = createBeats(
      traces,
      (t) => t.ends,
      (t, k) => {
        cover!.levels(t.bar, levelsFor(t.bar.floor, levelShare, 2), t.tip);
        if (k === traces.length - 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(button);
          return;
        }
        cover!.burst(t.tip, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BAR_SHAKE, k / Math.max(1, traces.length - 1)));
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
        tick: (ms, now) => arriving.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLASH_MS) return;
          const flash = ms > endAt ? 1 - (ms - endAt) / FLASH_MS : 0;
          for (const t of traces) {
            if (ms < t.starts) continue;
            let run = t.length * clamp01((ms - t.starts) / (t.ends - t.starts));
            const alpha = Math.max(ms >= t.ends ? LIT : 1, flash);
            for (const leg of t.legs) {
              if (run <= 0) break;
              if (run >= leg.length) {
                drawBolt(ctx, leg.bolt, alpha, TRACE);
              } else {
                const u = run / (leg.length || 1);
                spark.x = lerp([leg.from.x, leg.to.x], u);
                spark.y = lerp([leg.from.y, leg.to.y], u);
                const to = leg.bolt.to;
                leg.bolt.to = spark;
                drawBolt(ctx, leg.bolt, 1, TRACE);
                leg.bolt.to = to;
                drawStrike(ctx, spark, 1, 0.6, now);
              }
              run -= leg.length;
            }
          }
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
