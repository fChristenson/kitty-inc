// the "Bounce Wave" event (bounce; crit tiers): it covers its crit, whose
// click freezes the screen while a row of ball wisps along the bottom of
// the screen all bounce up together, each a little quicker than its
// neighbour, so they drift out of step into rolling waves, snakes and
// zigzags of bouncing balls, every bounce a splash and a boing, faster and
// faster; then every ball lands at once with a slam and they all spring up
// onto the income bars, each bar jumping a crit tier as its balls land, the
// last in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispHead, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import { drawBounceSplash, type Bounce } from "../../shared/bounce";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "bounceWave";
const MAX_BARS = 4;
const BALLS = 12;
// bounces in the whole wave by the slowest ball; each next does one more
const FIRST = 7;
const LOW = 40;
const INSET = 70;
// px per ms², so every ball's hop is a true arc for its period
const GRAVITY = 0.03;
const FLY_MS = 420;
const ARC = 260;
const BALL = 0.32;
const SPLASH = 60;
const BOING_GAP_MS = 60;
const SHAKE_GAP_MS = 110;
const BOUNCE_SHAKE = 0.15;
const UNISON_SHAKE = 1.0;
const HIT_SHAKE: [number, number] = [0.7, 1.4];

interface Ball {
  x: number;
  periodMs: number;
  lift: number;
  bar: RewardBar;
  to: Point;
}

const UP = -Math.PI / 2;

export const forceBounceWaveEvent = registerWispEvent(
  KEY,
  "Bounce Wave",
  () => CONFIG.bounceWaveEvent.chance,
  (floor, context, area) => {
    const { waveMs, holdMs, mergeMs } = CONFIG.bounceWaveEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const floorY = area.bottom - LOW;
    const balls: Ball[] = Array.from({ length: BALLS }, (_, i) => {
      const periodMs = waveMs / (FIRST + i);
      const bar = bars[i % bars.length];
      return {
        x: lerp([area.left + INSET, area.right - INSET], i / (BALLS - 1)),
        periodMs,
        lift: (GRAVITY * periodMs * periodMs) / 8,
        bar,
        to: {
          x: bar.box.x + 20 + Math.random() * (bar.box.width - 40),
          y: bar.box.y - 10,
        },
      };
    });
    const bounces: Bounce[] = [];
    for (const b of balls)
      for (let n = 1; n * b.periodMs < waveMs - 1; n++)
        bounces.push({
          at: { x: b.x, y: floorY },
          ms: n * b.periodMs,
          normal: UP,
        });
    bounces.sort((p, q) => p.ms - q.ms);
    const lands = waveMs + FLY_MS;
    // each bar's tier lands with the first ball that reaches it
    const hits = bars
      .map((bar) => ({ bar, ms: lands + bars.indexOf(bar) * 60 }))
      .filter((h) => balls.some((b) => b.bar === h.bar));
    const last = hits[hits.length - 1];
    const endAt = last.ms;
    const ats = balls.map((b) => {
      const spot: Point = { x: b.x, y: floorY };
      const from: Point = { x: b.x, y: floorY };
      const bend: Point = {
        x: lerp([b.x, b.to.x], 0.5),
        y: Math.min(floorY, b.to.y) - ARC,
      };
      const delay = bars.indexOf(b.bar) * 60;
      return (ms: number): Point => {
        if (ms < waveMs) {
          const u = (Math.max(0, ms) % b.periodMs) / b.periodMs;
          spot.x = b.x;
          spot.y = floorY - 4 * b.lift * u * (1 - u);
          return spot;
        }
        return bezier(
          from,
          bend,
          b.to,
          clamp01((ms - waveMs) / (FLY_MS + delay)),
          spot,
        );
      };
    });

    let boing = -Infinity;
    let jolt = -Infinity;
    const bouncing = createBeats(
      bounces,
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive()) return;
        if (b.ms - jolt >= SHAKE_GAP_MS) {
          jolt = b.ms;
          shakeScreen(BOUNCE_SHAKE);
        }
        if (b.ms - boing < BOING_GAP_MS) return;
        boing = b.ms;
        playBloop();
      },
    );
    const unison = createBeats(
      [waveMs],
      (ms) => ms,
      () => {
        cover!.burst({ x: (area.left + area.right) / 2, y: floorY }, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(UNISON_SHAKE);
      },
    );
    const landing = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.tierUp(h.bar, h.bar.center);
        if (h === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.bar.center);
          return;
        }
        cover!.burst(h.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const unisonSplashes: Bounce[] = balls.map((b) => ({
      at: { x: b.x, y: floorY },
      ms: waveMs,
      normal: UP,
    }));

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          bouncing.tick(ms, now);
          unison.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const b of bounces) {
            if (b.ms > ms) break;
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          }
          for (const b of unisonSplashes)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH * 2, now);
          if (ms > endAt) return;
          for (const at of ats)
            drawWispHead(ctx, at, ms, now, WISP_SIZE * BALL, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
