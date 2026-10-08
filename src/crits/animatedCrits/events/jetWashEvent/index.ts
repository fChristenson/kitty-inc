// the "Jet Wash" event (mix; crit tiers and cash): it covers its crit, whose
// click freezes the screen while a jet wisp screams out of the clicked
// floor's button and buzzes low along an income bar, end to end, its jet
// wash a river of cash sheeting down onto the bar behind it; it pulls up at
// the far end with a bang and a jolt as the bar jumps a crit tier, loops
// over and buzzes the next bar the other way, quicker each time, the last
// pass ending in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
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
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "jetWash";
const REWARD = 2;
const MAX_BARS = 4;
const OVER = 40;
const SKIM = 16;
const LOOP = 130;
const JET = 0.5;
const PASS_SHAKE: [number, number] = [0.7, 1.4];

interface Pass {
  bar: RewardBar;
  hopFrom: Point;
  bend: Point;
  a: Point;
  b: Point;
  hops: number;
  skims: number;
  ends: number;
  line: Point[];
  pour: Pour;
  final: boolean;
}

export const forceJetWashEvent = registerWispEvent(
  KEY,
  "Jet Wash",
  () => CONFIG.jetWashEvent.chance,
  (floor, context) => {
    const { passesMs, hopMs, holdMs, mergeMs } = CONFIG.jetWashEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const passes: Pass[] = bars.map((bar, k) => {
      const y = bar.box.y - SKIM;
      const left: Point = { x: bar.box.x - OVER, y };
      const right: Point = { x: bar.box.x + bar.box.width + OVER, y };
      const [a, b] = k % 2 === 0 ? [left, right] : [right, left];
      const span = lerp(passesMs, k / Math.max(1, bars.length - 1));
      const hops = clock;
      const skims = hops + hopMs;
      const ends = skims + span;
      clock = ends;
      const pass: Pass = {
        bar,
        hopFrom: from,
        bend: { x: (from.x + a.x) / 2, y: Math.min(from.y, a.y) - LOOP },
        a,
        b,
        hops,
        skims,
        ends,
        line: sampleLine((u) => ({ x: lerp([a.x, b.x], u), y: a.y }), 24),
        pour: {
          coinsAlong: 200,
          width: 30,
          streamMs: span * 0.8,
          travelMs: span,
        },
        final: k === bars.length - 1,
      };
      from = b;
      return pass;
    });
    const last = passes[passes.length - 1];
    const endAt = last.ends;
    const jetAt: Point = { x: 0, y: 0 };
    const jet = (ms: number): Point => {
      const t = Math.max(0, ms);
      let p = passes[0];
      for (const pass of passes) if (t >= pass.hops) p = pass;
      if (t < p.skims)
        return bezier(
          p.hopFrom,
          p.bend,
          p.a,
          easeOut(clamp01((t - p.hops) / (p.skims - p.hops))),
          jetAt,
        );
      const u = clamp01((t - p.skims) / (p.ends - p.skims));
      jetAt.x = lerp([p.a.x, p.b.x], u);
      jetAt.y = p.a.y;
      return jetAt;
    };
    const durationMs = Math.max(
      ...passes.map((p) => pourDurationMs(p.skims, p.pour)),
      endAt + holdMs + mergeMs,
    );

    const washing = createBeats(
      passes,
      (p) => p.skims,
      (p) => pourLine(cover!, p.line, p.pour),
    );
    const pulling = createBeats(
      passes,
      (p) => p.ends,
      (p, k) => {
        cover!.tierUp(p.bar, p.a);
        if (p.final) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(p.bar.center);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(p.b, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
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
          washing.tick(ms, now);
          pulling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, jet, ms, now, WISP_SIZE * JET, 0.7, 0, endAt),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
