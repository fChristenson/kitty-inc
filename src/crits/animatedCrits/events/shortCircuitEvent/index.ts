// the "Short Circuit" event (lightning; free upgrade levels): it covers its
// crit, whose click freezes the screen while a spark leaps out of the
// clicked floor's button onto an income bar and the bars short out: a bolt
// arcs from bar to bar down the stack, then back up, then down again, ever
// faster, every arc a blinding flash, a crack and a jolt that lands free
// levels on the bar it hits; then every gap arcs at once in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "shortCircuit";
const MAX_BARS = 5;
// arcs jump between the bars' ends, OFFSET px in from the edge
const OFFSET = 30;
const PASSES = 3;
const ARC_MS = 180;
const FINALE_MS = 400;
const ARC_SHAKE: [number, number] = [0.3, 1.1];

export const forceShortCircuitEvent = registerWispEvent(
  KEY,
  "Short Circuit",
  () => CONFIG.shortCircuitEvent.chance,
  (floor, context) => {
    const { arcsMs, holdMs, mergeMs } = CONFIG.shortCircuitEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length < 2) return;
    const button = getButtonCenter(context.isGroundFloor);
    // alternate ends so the arcs zigzag down the stack
    const ends = bars.map(
      (bar, k): Point => ({
        x:
          k % 2 === 0 ? bar.box.x + OFFSET : bar.box.x + bar.box.width - OFFSET,
        y: bar.center.y,
      }),
    );
    const order: number[] = [];
    for (let p = 0; p < PASSES; p++)
      for (let k = 0; k < bars.length; k++)
        order.push(p % 2 === 0 ? k : bars.length - 1 - k);
    const total = order.length;
    let clock = 0;
    const arcs: {
      bar: RewardBar;
      to: Point;
      at: number;
      bolt: ReturnType<typeof createBolt>;
    }[] = [];
    order.forEach((k, i) => {
      const from = i === 0 ? button : ends[order[i - 1]];
      if (i > 0 && order[i - 1] === k) return;
      clock += lerp(arcsMs, i / (total - 1));
      arcs.push({
        bar: bars[k],
        to: ends[k],
        at: clock,
        bolt: createBolt(from, ends[k], 1),
      });
    });
    const finaleAt = clock + 120;
    const finale = ends.slice(1).map((to, k) => createBolt(ends[k], to, 2));
    const endAt = finaleAt;
    const share = (bar: RewardBar) =>
      Math.max(1, Math.round(levelsFor(bar.floor) / PASSES));

    const arcing = createBeats(
      arcs,
      (a) => a.at,
      (a, k) => {
        cover!.levels(a.bar, share(a.bar), a.to);
        cover!.burst(a.to, 0.3);
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playExplosion();
        shakeScreen(lerp(ARC_SHAKE, k / Math.max(1, arcs.length - 1)));
      },
    );
    const blowing = createBeats(
      [finaleAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(bars[Math.floor(bars.length / 2)].center);
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
          arcing.tick(ms, now);
          blowing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > finaleAt + FINALE_MS) return;
          for (const a of arcs) {
            const t = (ms - a.at) / ARC_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, a.bolt, 1 - t, 1);
            drawStrike(ctx, a.to, 1 - t, 0.8, now);
          }
          const f = (ms - finaleAt) / FINALE_MS;
          if (f >= 0 && f < 1)
            for (const bolt of finale) drawBolt(ctx, bolt, 1 - f, 1.6);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 1,
);
