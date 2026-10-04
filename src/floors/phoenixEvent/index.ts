// the "Phoenix" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while a firebird wisp swoops down out of the sky onto
// an income bar and bursts into a blaze of embers with a bang and a jolt;
// the embers whirl out and rush back together, and it is reborn out of the
// glow bigger and brighter, the bar jumping a crit tier, then it soars up
// and dives on the next bar, quicker each time, the last rebirth going off
// in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawGlitterLight,
  drawWisp,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { hash01 } from "../../shared/twinkle";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "phoenix";
const MAX_BARS = 4;
const ARC = 220;
const EMBERS = 16;
const REACH: [number, number] = [70, 150];
const FLING = 0.45;
const SIZE: [number, number] = [0.5, 0.9];
const EMBER = 9;
const BLAZE = fadeStops(COLOR.heavenlyGold);
const BURST_SHAKE: [number, number] = [0.5, 1.0];
const REBORN_SHAKE: [number, number] = [0.7, 1.3];

interface Dive {
  bar: RewardBar;
  from: Point;
  bend: Point;
  starts: number;
  bursts: number;
  reborn: number;
  size: number;
}

export const forcePhoenixEvent = registerWispEvent(
  KEY,
  "Phoenix",
  () => CONFIG.phoenixEvent.chance,
  (floor, context, area) => {
    const { swoopsMs, reformMs, holdMs, mergeMs } = CONFIG.phoenixEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let from: Point = { x: area.left - 60, y: area.top + 60 };
    let clock = 0;
    const dives: Dive[] = bars.map((bar, k) => {
      const t = k / Math.max(1, bars.length - 1);
      const to = bar.center;
      // soaring up over the gap, then diving on the bar
      const bend: Point = {
        x: lerp([from.x, to.x], 0.5),
        y: Math.max(area.top + 20, Math.min(from.y, to.y) - ARC),
      };
      const starts = clock;
      const bursts = starts + lerp(swoopsMs, t);
      const reborn = bursts + reformMs;
      clock = reborn;
      const dive = {
        bar,
        from,
        bend,
        starts,
        bursts,
        reborn,
        size: lerp(SIZE, t),
      };
      from = to;
      return dive;
    });
    const last = dives[dives.length - 1];
    const endAt = last.reborn;
    const spot: Point = { x: 0, y: 0 };
    // gone while it's embers, otherwise diving or rising off its last bar
    const birdAt = (ms: number): Point | null => {
      for (const d of dives) {
        if (ms < d.starts || ms > d.reborn) continue;
        if (ms >= d.bursts) return null;
        const u = easeIn(clamp01((ms - d.starts) / (d.bursts - d.starts)));
        return bezier(d.from, d.bend, d.bar.center, u, spot);
      }
      return ms > endAt ? null : dives[0].from;
    };

    const bursting = createBeats(
      dives,
      (d) => d.bursts,
      (d, k) => {
        cover!.burst(d.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BURST_SHAKE, k / Math.max(1, dives.length - 1)));
      },
    );
    const rising = createBeats(
      dives,
      (d) => d.reborn,
      (d, k) => {
        cover!.tierUp(d.bar, d.bar.center);
        if (d === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(d.bar.center);
          return;
        }
        cover!.burst(d.bar.center, 0.8);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(REBORN_SHAKE, k / Math.max(1, dives.length - 1)));
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
          bursting.tick(ms, now);
          rising.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          let size = SIZE[0];
          for (const d of dives) {
            if (ms >= d.starts) size = d.size;
            if (ms < d.bursts || ms >= d.reborn) continue;
            // embers flung out, whirling, then rushing back in to the rebirth
            const t = (ms - d.bursts) / (d.reborn - d.bursts);
            const out = t < FLING ? easeOut(t / FLING) : 1;
            const back = t < FLING ? 0 : easeIn((t - FLING) / (1 - FLING));
            const { x, y } = d.bar.center;
            const prev = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = 0.5 + 0.5 * back;
            drawGlow(ctx, BLAZE, x, y, 60 + 70 * back);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = prev;
            for (let i = 0; i < EMBERS; i++) {
              const reach = lerp(REACH, hash01(i, 5)) * out * (1 - back);
              const a = (i / EMBERS) * Math.PI * 2 + t * 4 * (i % 2 ? 1 : -1);
              drawGlitterLight(
                ctx,
                x + Math.cos(a) * reach,
                y + Math.sin(a) * reach,
                EMBER * (1 - 0.4 * back),
                i + 300,
                1,
                now,
              );
            }
          }
          drawWisp(ctx, birdAt, ms, now, WISP_SIZE * size, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
