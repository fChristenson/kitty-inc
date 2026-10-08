// the "Capacitor" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while two electrode wisps fly out of the clicked
// floor's button to either end of an income bar and pump crackling charges
// into its middle, pulse after pulse, each brighter, with a crackle and a
// jolt; fully charged, a fat bolt discharges straight across the bar end to
// end in a blinding strike, a crack and a jolt, and the bar jumps a crit
// tier; on to the next bar, quicker each time, the last discharge a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "capacitor";
const MAX_BARS = 4;
const OUT = 46;
const HOP = 0.25;
const PULSES = [0.42, 0.56, 0.68];
const DISCHARGE = 0.85;
const PULSE_MS = 110;
const BOLT_MS = 220;
const ELECTRODE = 0.42;
const DISCHARGE_SHAKE: [number, number] = [0.7, 1.4];

interface Charge {
  bar: RewardBar;
  ends: [Point, Point];
  from: [Point, Point];
  feeds: Bolt[];
  arc: Bolt;
  starts: number;
  span: number;
  final: boolean;
}

export const forceCapacitorEvent = registerWispEvent(
  KEY,
  "Capacitor",
  () => CONFIG.capacitorEvent.chance,
  (floor, context) => {
    const { chargesMs, holdMs, mergeMs } = CONFIG.capacitorEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let from: [Point, Point] = [button, button];
    let clock = 0;
    const charges: Charge[] = bars.map((bar, k) => {
      const ends: [Point, Point] = [
        { x: bar.box.x - OUT, y: bar.center.y },
        { x: bar.box.x + bar.box.width + OUT, y: bar.center.y },
      ];
      const span = lerp(chargesMs, k / Math.max(1, bars.length - 1));
      const charge = {
        bar,
        ends,
        from,
        feeds: ends.map((end) => createBolt(end, bar.center, 1)),
        arc: createBolt(ends[0], ends[1], 2),
        starts: clock,
        span,
        final: k === bars.length - 1,
      };
      clock += span;
      from = ends;
      return charge;
    });
    const endAt = clock;
    const pulses = charges.flatMap((c) =>
      PULSES.map((p, i) => ({ c, i, ms: c.starts + c.span * p })),
    );
    const chargeAt = (ms: number): Charge => {
      let c = charges[0];
      for (const charge of charges) if (ms >= charge.starts) c = charge;
      return c;
    };
    const electrodes = [0, 1].map((side) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const t = Math.max(0, ms);
        const c = chargeAt(t);
        const e = easeOut(clamp01((t - c.starts) / (c.span * HOP)));
        at.x = lerp([c.from[side].x, c.ends[side].x], e);
        at.y = lerp([c.from[side].y, c.ends[side].y], e);
        return at;
      };
    });

    const pulsing = createBeats(
      pulses,
      (p) => p.ms,
      (p) => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(0.3 + 0.15 * p.i);
      },
    );
    const discharging = createBeats(
      charges,
      (c) => c.starts + c.span * DISCHARGE,
      (c, k) => {
        cover!.tierUp(c.bar);
        if (c.final) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(c.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(DISCHARGE_SHAKE, k / Math.max(1, charges.length - 1)));
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
          pulsing.tick(ms, now);
          discharging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const p of pulses) {
            const t = (ms - p.ms) / PULSE_MS;
            if (t < 0 || t >= 1) continue;
            const scale = 0.5 + 0.25 * p.i;
            for (const feed of p.c.feeds) drawBolt(ctx, feed, 1 - t, scale);
            drawStrike(ctx, p.c.bar.center, 1 - t, scale, now);
          }
          const c = chargeAt(ms);
          const d = (ms - (c.starts + c.span * DISCHARGE)) / BOLT_MS;
          if (d >= 0 && d < 1) {
            drawBolt(ctx, c.arc, 1 - d, c.final ? 2.5 : 1.6);
            drawStrike(ctx, c.bar.center, 1 - d, c.final ? 3 : 2, now);
          }
          for (const electrode of electrodes)
            drawWispBetween(
              ctx,
              electrode,
              ms,
              now,
              WISP_SIZE * ELECTRODE,
              0.8,
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
