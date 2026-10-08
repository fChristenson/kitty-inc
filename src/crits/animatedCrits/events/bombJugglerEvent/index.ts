// the "Bomb Juggler" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while a juggler wisp rises over the
// clicked floor's button juggling three lit bombs in a cascade, faster and
// higher, fuses fizzing; then it tosses bombs one after another onto the
// income bars, each going off in a big blast with a cluster of smaller
// blasts round it, its own bang and shake, the bar jolting with free
// levels; the last toss sends all three at once onto the last bar in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/explosion";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "bombJuggler";
const MAX_BARS = 4;
const BALLS = 3;
const RISE = 170;
const RISE_MS = 200;
const HANDS = 70;
// throws per ms, quickening, and the arc's height, growing
const RATE: [number, number] = [1 / 240, 1 / 130];
const HEIGHT: [number, number] = [80, 170];
const TOSS_ARC = 160;
const REFILL_MS = 140;
const CLUSTER = 4;
const CLUSTER_REACH = 60;
const FINAL_CLUSTER = 7;
const FINAL_REACH = 110;
const BOMB = 0.36;
const JUGGLER = 0.5;
const FUSE = 14;
const BLAST = 200;
const SMALL_BLAST = 100;
const FINAL_BLAST = 260;
const HUGE_BLAST = 360;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

interface Toss {
  ball: number;
  bar: RewardBar;
  from: Point;
  to: Point;
  leaves: number;
  lands: number;
  at: (ms: number) => Point;
}

export const forceBombJugglerEvent = registerWispEvent(
  KEY,
  "Bomb Juggler",
  () => CONFIG.bombJugglerEvent.chance,
  (floor, context) => {
    const { juggleMs, tossMs, flightMs, holdMs, mergeMs } =
      CONFIG.bombJugglerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const hover: Point = { x: button.x, y: button.y - RISE };
    const jugglerAt: Point = { x: 0, y: 0 };
    const juggler = (ms: number): Point => {
      ms = Math.max(0, ms);
      const u = easeOut(clamp01(ms / RISE_MS));
      jugglerAt.x = hover.x + Math.sin(ms * 0.01) * 6;
      jugglerAt.y = lerp([button.y, hover.y], u) + Math.sin(ms * 0.02) * 4;
      return jugglerAt;
    };
    // the cascade's phase in throws: the rate climbs over the juggle
    const span = juggleMs;
    const phase = (ms: number) => {
      const t = Math.min(ms, span);
      const base = RATE[0] * t + ((RATE[1] - RATE[0]) * t * t) / (2 * span);
      return base + RATE[1] * Math.max(0, ms - span);
    };
    const ball = (b: number, ms: number, into: Point): Point => {
      ms = Math.max(0, ms);
      const s = phase(ms) + (b * 2) / BALLS;
      const n = Math.floor(s);
      const f = s - n;
      const fromX = n % 2 === 0 ? -HANDS : HANDS;
      const height = lerp(HEIGHT, clamp01(ms / span));
      const rise = easeOut(clamp01(ms / RISE_MS));
      into.x = hover.x + lerp([fromX, -fromX], f);
      into.y =
        lerp([button.y, hover.y + 20], rise) - height * 4 * f * (1 - f) * rise;
      return into;
    };
    const balls = Array.from({ length: BALLS }, (_, b) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => ball(b, ms, at);
    });

    const blasts: Blast[] = [];
    const tosses: Toss[] = [];
    const toss = (b: number, bar: RewardBar, leaves: number, x: number) => {
      const from = ball(b, leaves, { x: 0, y: 0 });
      const to: Point = { x, y: bar.center.y };
      const lands = leaves + flightMs;
      const at: Point = { x: 0, y: 0 };
      tosses.push({
        ball: b,
        bar,
        from,
        to,
        leaves,
        lands,
        at: (ms: number): Point => {
          const u = clamp01((ms - leaves) / flightMs);
          at.x = lerp([from.x, to.x], u);
          at.y = lerp([from.y, to.y], u) - TOSS_ARC * 4 * u * (1 - u);
          return at;
        },
      });
      return lands;
    };
    let clock = juggleMs;
    bars.slice(0, -1).forEach((bar, k) => {
      const lands = toss(k % BALLS, bar, clock, bar.center.x);
      blasts.push({
        at: { x: bar.center.x, y: bar.center.y },
        ms: lands,
        size: BLAST,
        shake: 1 + 0.15 * k,
      });
      for (let c = 0; c < CLUSTER; c++) {
        const a = (c / CLUSTER) * Math.PI * 2 + k;
        blasts.push({
          at: {
            x: bar.center.x + Math.cos(a) * CLUSTER_REACH * 1.6,
            y: bar.center.y + Math.sin(a) * CLUSTER_REACH * 0.6,
          },
          ms: lands + 60 + c * 30,
          size: SMALL_BLAST,
          shake: 0.5,
        });
      }
      clock += lerp(tossMs, k / Math.max(1, bars.length - 2));
    });
    const lastBar = bars[bars.length - 1];
    let finalLands = 0;
    for (let b = 0; b < BALLS; b++) {
      const x = lastBar.box.x + lastBar.box.width * ((b + 0.5) / BALLS);
      finalLands = toss(b, lastBar, clock, x);
      blasts.push({
        at: { x, y: lastBar.center.y },
        ms: finalLands + b * 40,
        size: FINAL_BLAST,
        shake: 1.4,
      });
    }
    for (let c = 0; c < FINAL_CLUSTER; c++) {
      const a = (c / FINAL_CLUSTER) * Math.PI * 2;
      blasts.push({
        at: {
          x: lastBar.center.x + Math.cos(a) * FINAL_REACH * 2,
          y: lastBar.center.y + Math.sin(a) * FINAL_REACH * 0.7,
        },
        ms: finalLands + 120 + c * 35,
        size: SMALL_BLAST * 1.3,
        shake: 0.8,
      });
    }
    const hugeAt = finalLands + 140 + FINAL_CLUSTER * 35;
    blasts.push({
      at: lastBar.center,
      ms: hugeAt,
      size: HUGE_BLAST,
      shake: 1.6,
    });
    const throwAt = clock;
    const endAt = hugeAt;
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const landing = createBeats(
      tosses,
      (t) => t.lands,
      (t) => cover!.levels(t.bar, levelsFor(t.bar.floor), t.from),
    );
    const finale = createBeats(
      [hugeAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(lastBar.center);
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
          booming.tick(ms, now);
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          if (ms > endAt) return;
          for (let b = 0; b < BALLS; b++) {
            if (ms >= throwAt) break;
            // a juggled bomb vanishes as it's tossed, a fresh one lit in its place
            let hidden = false;
            for (const t of tosses)
              if (t.ball === b && ms >= t.leaves && ms < t.leaves + REFILL_MS)
                hidden = true;
            if (hidden) continue;
            const at = balls[b](ms);
            drawLitFuse(ctx, at, ms / throwAt, FUSE, now);
            drawWisp(ctx, balls[b], ms, now, WISP_SIZE * BOMB, 0.5);
          }
          for (const t of tosses) {
            if (ms < t.leaves || ms >= t.lands) continue;
            drawLitFuse(
              ctx,
              t.at(ms),
              0.9 + 0.1 * ((ms - t.leaves) / flightMs),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              t.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.8,
              t.leaves,
              t.lands,
            );
          }
          drawWispBetween(
            ctx,
            juggler,
            ms,
            now,
            WISP_SIZE * JUGGLER,
            0.3,
            0,
            throwAt + flightMs,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
