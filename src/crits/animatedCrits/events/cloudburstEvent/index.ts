// the "Cloudburst" event (ripple; crit tiers): it covers its crit, whose
// click freezes the screen while drops of light pelt the income bars in view
// from high above, each landing in a splash and a flat ring rippling out
// along its floor, a drizzle quickening to a downpour, the drum of drops
// rising; a huge drop gathers over the clicked floor, light streaming up off
// the bars into it, swelling and trembling; the rain stops for a beat, then
// it plunges onto the clicked floor in the biggest splash, a bang and the
// hardest shake, and its giant ring rolls out up and down the building,
// every bar it crosses splashing up a crit tier, the clicked one two. Then
// the crit's tier pays out
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import {
  drawDrop,
  drawRipple,
  drawSplash,
  rainTimes,
  RIPPLE_MS,
} from "../../../../shared/animationStyles/ripple";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  playBarExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import type { Point } from "../../../../shared/wisp";
import { FLOOR_H } from "../../../../floors/constants";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "cloudburst";
const MAX_BARS = 8;
// a drop falls FALL px onto a bar, DROP px, growing to DROP_BIG in the
// downpour; its ring RIPPLE of the bar's width out, RIPPLE_W px thick
const FALL = 420;
const DROP: [number, number] = [30, 46];
const SPLASH: [number, number] = [16, 26];
const RIPPLE: [number, number] = [0.32, 0.5];
const RIPPLE_W = 12;
const DROP_SHAKE: [number, number] = [0.12, 0.45];
const DRUM_EVERY = 4;
const DRUM_RATE: [number, number] = [0.7, 1.25];
// the huge drop gathers GATHER_MS before the rain stops, BIG_FALL of the way
// up from the clicked bar to the screen's top, up to BIG_DROP px, trembling
// TREMBLE px, light streaming STREAM specks a bar up into it
const GATHER_MS = 500;
const BIG_FALL = 0.82;
const MIN_BIG_FALL = 320;
const BIG_DROP = 120;
const TREMBLE = 10;
const STREAM = 6;
const SPECK = 20;
// the plunge: the biggest splash and blast, a wide flat ring on the floor
const BIG_SPLASH = 56;
const BIG_SPLASH_N = 15;
const BIG_SPLASH_MS = 520;
const BIG_BLAST = 320;
const BIG_FLAT = 0.75;
const BIG_FLAT_W = 34;
const BIG_FLAT_MS = 600;
const BIG_SHAKE = 1.1;
// the giant ring rolling up and down: RING_W px thick, a second one trailing
// at TRAIL of its size, never wider than RING_SPAN of the screen
const RING_W = 36;
const TRAIL = 0.8;
const RING_SPAN = 0.62;
const RING_OVER = 80;
// a bar the ring crosses: a quick ring and splash out of it, a jolt
const CROSS_RIPPLE = 0.7;
const CROSS_RIPPLE_W = 20;
const CROSS_MS = 320;
const CROSS_SPLASH = 30;
const CROSS_SPLASH_N = 9;
const CROSS_SHAKE: [number, number] = [0.8, 1.4];
const CLICKED_SHAKE = 1.2;

export const forceCloudburstEvent = registerWispEvent(
  KEY,
  "Cloudburst",
  () => meta.chance,
  (floor, context, area) => {
    const {
      firstMs,
      drops: count,
      gapsMs,
      fallMs,
      hushMs,
      plungeMs,
      ringMs,
      clickedTiers,
      clickedGapMs,
      holdMs,
      mergeMs,
    } = meta.values;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    // the clicked floor's bar, or the one nearest it when it has none
    let clicked: RewardBar = bars[0];
    for (const bar of bars) {
      if (bar.floor === floor) {
        clicked = bar;
        break;
      }
      if (
        Math.abs(bar.center.y - FLOOR_H / 2) <
        Math.abs(clicked.center.y - FLOOR_H / 2)
      )
        clicked = bar;
    }
    const impact = clicked.center;
    const width = area.right - area.left;

    // the rain: where and when each drop lands, its size
    const times = rainTimes(count, firstMs, gapsMs);
    const dropX = new Float32Array(count);
    const dropY = new Float32Array(count);
    const dropAt = new Float32Array(count);
    const dropK = new Float32Array(count);
    const dropBar = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const b = Math.floor(hash01(i, 7121) * bars.length) % bars.length;
      const bar = bars[b];
      dropBar[i] = b;
      dropX[i] = bar.box.x + bar.box.width * (0.08 + 0.84 * hash01(i, 7122));
      dropY[i] = bar.center.y;
      dropAt[i] = times[i];
      dropK[i] = i / Math.max(1, count - 1);
    }
    const lastDrop = times[count - 1];
    const letGo = lastDrop + hushMs;
    const bigAt = letGo + plungeMs;
    const gatherAt = lastDrop - GATHER_MS;
    const bigFall = Math.max(MIN_BIG_FALL, (impact.y - area.top) * BIG_FALL);
    // the giant ring: out to the farther screen edge at a steady speed
    const ringReach =
      Math.max(impact.y - area.top, area.bottom - impact.y) + RING_OVER;
    const crossAt = new Float32Array(bars.length);
    for (let b = 0; b < bars.length; b++)
      crossAt[b] =
        bars[b] === clicked
          ? bigAt
          : bigAt +
            (ringMs * Math.abs(bars[b].center.y - impact.y)) / ringReach;
    const clickedEnd = bigAt + (clickedTiers - 1) * clickedGapMs;
    const endMs = Math.max(bigAt + ringMs, clickedEnd);
    const drawEnd = bigAt + Math.max(ringMs + CROSS_MS, DETONATION_MS);

    const spot: Point = { x: 0, y: 0 };
    const order = Array.from({ length: count }, (_, i) => i);
    const raining = createBeats(
      order,
      (i) => dropAt[i],
      (i) => {
        spot.x = dropX[i];
        spot.y = dropY[i];
        cover!.burst(spot, lerp([0.12, 0.22], dropK[i]));
        if (!cover!.isLive()) return;
        playBloop();
        if (i % DRUM_EVERY === DRUM_EVERY - 1)
          playBarExplosion(lerp(DRUM_RATE, dropK[i]));
        shakeScreen(lerp(DROP_SHAKE, dropK[i]));
      },
    );
    const others = bars.filter((bar) => bar !== clicked);
    const crossing = createBeats(
      others,
      (bar) => crossAt[bars.indexOf(bar)],
      (bar, k) => {
        cover!.tierUp(bar, impact);
        cover!.burst(bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CROSS_SHAKE, k / Math.max(1, others.length - 1)));
      },
    );
    const tierTimes = Array.from(
      { length: clickedTiers },
      (_, k) => bigAt + k * clickedGapMs,
    );
    const landing = createBeats(
      tierTimes,
      (ms) => ms,
      (_, k) => {
        cover!.tierUp(clicked);
        if (k === 0) {
          cover!.blast(impact);
          cover!.slam(clicked);
          if (cover!.isLive()) shakeScreen(BIG_SHAKE);
          return;
        }
        cover!.burst(impact, 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CLICKED_SHAKE);
      },
    );

    // the huge drop gathering over the clicked bar, trembling harder
    const hover: Point = { x: 0, y: 0 };
    const drawGathering = (ctx: CanvasRenderingContext2D, ms: number) => {
      const c = clamp01((ms - gatherAt) / (letGo - gatherAt));
      const e = c * c;
      hover.x = impact.x + Math.sin(ms * 0.11) * TREMBLE * e;
      hover.y = impact.y - bigFall + Math.cos(ms * 0.17) * TREMBLE * e * 0.6;
      // light streaming up off the bars into it, quickening
      const trips = (ms - gatherAt) / lerp([520, 220], c);
      for (let b = 0; b < bars.length; b++) {
        const from = bars[b].center;
        for (let i = 0; i < STREAM; i++) {
          const seed = hash01(i, b + 7130);
          if (trips + seed < 1) continue;
          const u = (trips + seed) % 1;
          const fromX =
            from.x + (hash01(i, b + 7131) - 0.5) * bars[b].box.width;
          const f = u * u;
          stampGlimmer(
            ctx,
            fromX + (hover.x - fromX) * f,
            from.y + (hover.y - from.y) * f,
            SPECK * (1 - 0.5 * f),
            i + b * STREAM,
            i % 3 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
      }
      const size = BIG_DROP * (0.3 + 0.7 * e);
      stampGlimmer(
        ctx,
        hover.x,
        hover.y,
        size * 1.6,
        ms * 0.004,
        COLOR.heavenlyGold,
      );
      stampGlimmer(ctx, hover.x, hover.y, size, 3, COLOR.white);
    };

    const drawRing = (
      ctx: CanvasRenderingContext2D,
      r: number,
      thick: number,
    ) => {
      const rx = Math.min(width * RING_SPAN, r * 0.9 + 60);
      ctx.beginPath();
      ctx.ellipse(impact.x, impact.y, rx, r, 0, 0, Math.PI * 2);
      ctx.lineWidth = thick;
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.stroke();
      ctx.lineWidth = thick * 0.4;
      ctx.strokeStyle = COLOR.white;
      ctx.stroke();
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          raining.tick(ms, now);
          crossing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > drawEnd) return;
          const previous = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          // the rain's flat rings along the floors
          if (ms < lastDrop + RIPPLE_MS)
            for (let i = 0; i < count; i++) {
              const age = ms - dropAt[i];
              if (age < 0 || age >= RIPPLE_MS) continue;
              spot.x = dropX[i];
              spot.y = dropY[i];
              drawRipple(
                ctx,
                spot,
                age,
                bars[dropBar[i]].box.width * lerp(RIPPLE, dropK[i]),
                RIPPLE_W,
              );
            }
          // the giant ring and the rings it sets off
          const since = ms - bigAt;
          if (since >= 0) {
            drawRipple(
              ctx,
              impact,
              since,
              width * BIG_FLAT,
              BIG_FLAT_W,
              2,
              BIG_FLAT_MS,
            );
            if (since < ringMs) {
              const u = since / ringMs;
              const alpha = ctx.globalAlpha;
              ctx.globalAlpha = alpha * Math.min(1, 3.5 * (1 - u));
              drawRing(ctx, ringReach * u, RING_W * (1 - 0.4 * u));
              drawRing(ctx, ringReach * u * TRAIL, RING_W * 0.45);
              ctx.globalAlpha = alpha;
            }
            for (let b = 0; b < bars.length; b++)
              if (bars[b] !== clicked)
                drawRipple(
                  ctx,
                  bars[b].center,
                  ms - crossAt[b],
                  bars[b].box.width * CROSS_RIPPLE,
                  CROSS_RIPPLE_W,
                  2,
                  CROSS_MS,
                );
          }
          beginLightBatch(ctx);
          if (ms < lastDrop + RIPPLE_MS)
            for (let i = 0; i < count; i++) {
              const until = dropAt[i] - ms;
              if (until > fallMs || until <= -RIPPLE_MS) continue;
              spot.x = dropX[i];
              spot.y = dropY[i];
              const k = dropK[i];
              drawDrop(ctx, spot, until, fallMs, FALL, lerp(DROP, k));
              drawSplash(ctx, spot, -until, lerp(SPLASH, k));
            }
          if (ms >= gatherAt && ms < letGo) drawGathering(ctx, ms);
          drawDrop(ctx, impact, bigAt - ms, plungeMs, bigFall, BIG_DROP);
          if (since >= 0) {
            drawSplash(
              ctx,
              impact,
              since,
              BIG_SPLASH,
              BIG_SPLASH_N,
              BIG_SPLASH_MS,
            );
            for (let b = 0; b < bars.length; b++)
              if (bars[b] !== clicked)
                drawSplash(
                  ctx,
                  bars[b].center,
                  ms - crossAt[b],
                  CROSS_SPLASH,
                  CROSS_SPLASH_N,
                  CROSS_MS,
                );
          }
          endLightBatch(ctx);
          ctx.globalCompositeOperation = previous;
          drawDetonation(ctx, impact, since, BIG_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
