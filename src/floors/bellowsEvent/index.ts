// the "Bellows" event (mix; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a wisp hovering over the
// clicked floor's button breathes in, swelling as a ring of coins is sucked
// in from all round the screen, then squeezes hard and puffs a jet of cash
// onto an income bar, which lands with a bang, a jolt and free levels; it
// pumps again for the next bar, faster each time, and its last great
// squeeze blasts jets onto every bar at once in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import type { CoinPath } from "../coins";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "bellows";
const REWARD = 2;
const MAX_BARS = 4;
const HOVER = 170;
const INHALE = 0.6;
const RING = 280;
const SUCKED = 18;
const SIZE: [number, number] = [0.45, 1.05];
const PUMP_SHAKE: [number, number] = [0.6, 1.3];

interface Pump {
  bars: RewardBar[];
  starts: number;
  exhales: number;
  lands: number;
  pour: Pour;
  lines: Point[][];
  final: boolean;
}

export const forceBellowsEvent = registerWispEvent(
  KEY,
  "Bellows",
  () => CONFIG.bellowsEvent.chance,
  (floor, context) => {
    const { pumpsMs, levelShare, holdMs, mergeMs } = CONFIG.bellowsEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const nozzle: Point = { x: button.x, y: button.y - HOVER };
    const lineTo = (to: Point) =>
      sampleLine(
        (u) => ({ x: lerp([nozzle.x, to.x], u), y: lerp([nozzle.y, to.y], u) }),
        24,
      );
    // a pump per bar, then one more onto them all
    const targets = [...bars.map((bar) => [bar]), bars];
    let clock = 0;
    const pumps: Pump[] = targets.map((group, k) => {
      const span = lerp(pumpsMs, k / Math.max(1, targets.length - 1));
      const starts = clock;
      const exhales = starts + span * INHALE;
      const lands = starts + span;
      clock = lands;
      return {
        bars: group,
        starts,
        exhales,
        lands,
        lines: group.map((bar) => lineTo(bar.center)),
        pour: {
          coinsAlong: 220,
          width: 34,
          streamMs: (lands - exhales) * 0.6,
          travelMs: lands - exhales,
        },
        final: k === targets.length - 1,
      };
    });
    const endAt = clock;
    const durationMs = Math.max(
      ...pumps.map((p) => pourDurationMs(p.exhales, p.pour)),
      endAt + holdMs + mergeMs,
    );
    const sizeAt = (ms: number): number => {
      let p = pumps[0];
      for (const pump of pumps) if (ms >= pump.starts) p = pump;
      if (ms < p.exhales)
        return lerp(
          SIZE,
          easeOut(clamp01((ms - p.starts) / (p.exhales - p.starts))),
        );
      return lerp(
        SIZE,
        1 - easeIn(clamp01((ms - p.exhales) / (p.lands - p.exhales))),
      );
    };
    const suck = (): CoinPath[] =>
      Array.from({ length: SUCKED }, (_, i) => {
        const a = (i / SUCKED) * Math.PI * 2 + Math.random() * 0.3;
        const from: Point = {
          x: nozzle.x + Math.cos(a) * RING,
          y: nozzle.y + Math.sin(a) * RING,
        };
        return (f: number) => {
          const e = easeIn(f);
          return {
            x: lerp([from.x, nozzle.x], e),
            y: lerp([from.y, nozzle.y], e),
            scale: 1 - f ** 4,
          };
        };
      });

    const inhaling = createBeats(
      pumps,
      (p) => p.starts,
      (p) => {
        cover!.trace(suck(), p.exhales - p.starts);
        if (cover!.isLive()) playBloop();
      },
    );
    const exhaling = createBeats(
      pumps,
      (p) => p.exhales,
      (p, k) => {
        for (const line of p.lines) pourLine(cover!, line, p.pour);
        cover!.burst(nozzle, 0.5);
        if (cover!.isLive())
          shakeScreen(
            lerp(PUMP_SHAKE, k / Math.max(1, pumps.length - 1)) * 0.6,
          );
      },
    );
    const landing = createBeats(
      pumps,
      (p) => p.lands,
      (p, k) => {
        for (const bar of p.bars) {
          cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), nozzle);
          if (p.final) cover!.slam(bar);
          else cover!.burst(bar.center, 0.6);
        }
        if (p.final) {
          cover!.blast(nozzle);
          if (cover!.isLive()) playExplosion();
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PUMP_SHAKE, k / Math.max(1, pumps.length - 1)));
      },
    );

    const at = (): Point => nozzle;
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
          inhaling.tick(ms, now);
          exhaling.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawWispBetween(
            ctx,
            at,
            ms,
            now,
            WISP_SIZE * sizeAt(ms),
            0.6,
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
