// the "Roman Candle" event (explosion; crit tiers): it covers its crit,
// whose click freezes the screen while a wisp drops out of the clicked
// floor's button to the bottom of the screen and fizzes like a lit roman
// candle, then pops: one fizzing bomb wisp after another shoots up out of
// it, thump, thump, thump, ever faster; most burst high overhead in white
// blasts and bangs, but every other one arcs over onto an income bar and
// goes off on it with a big jolt as the bar jumps a crit tier; the last
// lands in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "romanCandle";
const MAX_BARS = 3;
const BOTTOM = 90;
const DROP_MS = 250;
const HIGH = 200;
const BALL = 0.4;
const CANDLE = 0.5;
const FUSE = 16;
const AIR_BLAST = 140;
const BAR_BLAST = 180;
const POP_SHAKE = 0.4;
const HIT_SHAKE: [number, number] = [0.8, 1.5];

export const forceRomanCandleEvent = registerWispEvent(
  KEY,
  "Roman Candle",
  () => CONFIG.romanCandleEvent.chance,
  (floor, context, area) => {
    const { popsMs, flightMs, holdMs, mergeMs } = CONFIG.romanCandleEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const candle: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - BOTTOM,
    };
    // a pop high overhead before every bar's ball
    const targets: (RewardBar | null)[] = bars.flatMap((bar) => [null, bar]);
    let clock = DROP_MS;
    const balls = targets.map((bar, k) => {
      const pops = clock;
      clock += lerp(popsMs, k / Math.max(1, targets.length - 1));
      const to: Point = bar
        ? bar.center
        : {
            x: candle.x + (Math.random() - 0.5) * 300,
            y: area.top + 200 + Math.random() * 150,
          };
      const ctrl: Point = {
        x: (candle.x + to.x) / 2,
        y: Math.min(candle.y, to.y) - (bar ? HIGH : 0),
      };
      const at: Point = { x: 0, y: 0 };
      return {
        bar,
        to,
        pops,
        blows: pops + flightMs,
        at: (ms: number): Point =>
          bezier(
            candle,
            ctrl,
            to,
            easeOut(clamp01((ms - pops) / flightMs)),
            at,
          ),
      };
    });
    const hits = balls.filter((b) => b.bar !== null);
    const last = hits[hits.length - 1];
    const endAt = last.blows;
    const candleAt: Point = { x: 0, y: 0 };
    const candleWisp = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / DROP_MS));
      candleAt.x = lerp([button.x, candle.x], u);
      candleAt.y = lerp([button.y, candle.y], u);
      return candleAt;
    };

    const popping = createBeats(
      balls,
      (b) => b.pops,
      () => {
        cover!.burst(candle, 0.3);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(POP_SHAKE);
      },
    );
    const blowing = createBeats(
      balls,
      (b) => b.blows,
      (b) => {
        if (!b.bar) {
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.tierUp(b.bar, candle);
        if (b === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(b.to);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(
          lerp(HIT_SHAKE, hits.indexOf(b) / Math.max(1, hits.length - 1)),
        );
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
          popping.tick(ms, now);
          blowing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of balls) {
            if (b !== last)
              drawDetonation(
                ctx,
                b.to,
                ms - b.blows,
                b.bar ? BAR_BLAST : AIR_BLAST,
                now,
              );
            if (ms < b.pops || ms >= b.blows) continue;
            drawLitFuse(
              ctx,
              b.at(ms),
              clamp01((ms - b.pops) / flightMs),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BALL,
              0.7,
              b.pops,
              b.blows,
            );
          }
          if (ms < last.pops + 100) {
            drawLitFuse(
              ctx,
              candleWisp(ms),
              clamp01(ms / last.pops),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              candleWisp,
              ms,
              now,
              WISP_SIZE * CANDLE,
              0.6,
              0,
              last.pops + 100,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
