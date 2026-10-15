// the "Supercell" event (tornado; crit tiers): it covers its crit, whose
// click freezes the screen while a huge storm cloud spreads turning across
// the top of the screen, soft and glowing, lightning flickering inside it,
// cracking with a jolt; a funnel lowers out of it onto the top bar in view,
// spinning up, and its foot tears zigzag across every bar down the screen,
// end to end and floor to floor, quicker each pass, the funnel thickening
// and the rumble rising; every bar it touches flashes and takes a crit tier,
// the cloud cracking with it, and its glitter and coins are spun up the
// funnel as the foot runs over them; then it swings to the middle, winds up
// to a blur and flings everything back out in one burst onto every bar, a
// big blast and the last crit tier on each. Then the crit's tier pays out
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import {
  drawTornado,
  flingFrom,
  funnelAt,
  liftAt,
  planTornado,
  tornadoTurn,
} from "../../../../shared/animationStyles/tornado";
import {
  createBolt,
  drawBolt,
  type Bolt,
} from "../../../../shared/animationStyles/lightning";
import { clamp01, lerp, quicken, quickenAt } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  playBarExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import type { Point } from "../../../../shared/wisp";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "supercell";
const MAX_BARS = 8;
const TAU = Math.PI * 2;
// the cloud: centred CLOUD_Y of the screen down, CLOUD_W of its width wide
// and CLOUD_H of its height tall, in rings of puffs turning round its middle
const CLOUD_Y = 0.07;
const CLOUD_W = 0.56;
const CLOUD_H = 0.05;
const RING_PUFFS = [5, 8, 11];
const RING_OUT = [0.25, 0.62, 1];
const PUFF: [number, number] = [70, 120];
const CLOUD_SPIN = 0.0016;
const CLOUD_FADE_MS = 340;
// lightning inside it: a flicker chance every FLICK_MS, rising; a hit's
// flash lasting HIT_FLASH_MS
const FLICK_MS = 70;
const FLICK: [number, number] = [0.2, 0.55];
const HIT_FLASH_MS = 90;
const BOLTS = 4;
const FLASH_R = 110;
// the funnel: its foot and top FOOT and TOP of the screen's width round,
// thickening from the first to the second as it runs, swaying SWAY
const FOOT: [number, number] = [0.02, 0.055];
const TOP: [number, number] = [0.13, 0.3];
const SWAY = 0.03;
const SPIN_HZ: [number, number] = [0.6, 7];
const START = 0.45;
// its foot runs INSET of each bar's width in from its ends; winding up it
// trembles TREMBLE px
const INSET = 0.06;
const TREMBLE = 7;
// the glitter and coins lying on each bar
const CATCH = 10;
const SPECK = 28;
const COLLAPSE_MS = 220;
const RUMBLE_MS: [number, number] = [160, 50];
const RUMBLE_SHAKE: [number, number] = [0.3, 1.2];
const HIT_SHAKE: [number, number] = [0.6, 1.2];
const HIT_RATE: [number, number] = [0.8, 1.3];
const CRACK_SHAKE = 0.6;
const FLING_SHAKE = 1.4;

const CLOUD = [
  fadeStops(COLOR.nightShiftIndigo),
  fadeStops(COLOR.fourOfAKindIndigo),
  fadeStops(COLOR.unionBossSlate),
];
const FLASH = fadeStops(COLOR.pairBlue);
const CORE = fadeStops(COLOR.white);
const BLUR = fadeStops(COLOR.heavenlyGold);

interface Speck {
  bar: RewardBar;
  home: Point;
  caughtMs: number;
  seed: number;
}

export const forceSupercellEvent = registerWispEvent(
  KEY,
  "Supercell",
  () => meta.chance,
  (floor, context, area) => {
    const {
      firstMs,
      cloudMs,
      lowerMs,
      sweepMs,
      windMs,
      flingMs,
      holdMs,
      mergeMs,
    } = meta.values;
    const found = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (found.length === 0) return;
    // top bar first, so the foot zigzags down the screen
    const bars = found.slice().sort((a, b) => a.center.y - b.center.y);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cloudX = (area.left + area.right) / 2;
    const cloudY = area.top + height * CLOUD_Y;
    const cloudRx = width * CLOUD_W;
    const cloudRy = height * CLOUD_H;
    const lowerAt = firstMs + cloudMs;
    const sweepAt = lowerAt + lowerMs;
    const sweepEnd = sweepAt + sweepMs;
    const flungMs = sweepEnd + windMs;
    const landMs = flungMs + flingMs;

    // the zigzag: along each bar end to end, alternating sides, dropping
    // straight down to the next
    const n = bars.length * 2;
    const px = new Float32Array(n);
    const py = new Float32Array(n);
    const cum = new Float32Array(n);
    for (let k = 0; k < bars.length; k++) {
      const box = bars[k].box;
      const left = box.x + box.width * INSET;
      const right = box.x + box.width * (1 - INSET);
      px[k * 2] = k % 2 ? right : left;
      px[k * 2 + 1] = k % 2 ? left : right;
      py[k * 2] = py[k * 2 + 1] = bars[k].center.y;
    }
    for (let i = 1; i < n; i++)
      cum[i] = cum[i - 1] + Math.hypot(px[i] - px[i - 1], py[i] - py[i - 1]);
    const length = cum[n - 1] || 1;
    const timeAt = (s: number) =>
      sweepAt + sweepMs * quickenAt(clamp01(s / length), START);

    const path = (ms: number, into: Point): Point => {
      if (ms < sweepAt) {
        const u = clamp01((ms - lowerAt) / lowerMs);
        into.x = px[0];
        into.y = cloudY + 16 + (py[0] - cloudY - 16) * u * u;
        return into;
      }
      if (ms < sweepEnd) {
        const s = length * quicken((ms - sweepAt) / sweepMs, START);
        let i = 1;
        while (i < n - 1 && cum[i] < s) i++;
        const seg = cum[i] - cum[i - 1] || 1;
        const u = clamp01((s - cum[i - 1]) / seg);
        into.x = px[i - 1] + (px[i] - px[i - 1]) * u;
        into.y = py[i - 1] + (py[i] - py[i - 1]) * u;
        return into;
      }
      // winding up: swinging to the middle, trembling harder
      const w = clamp01((Math.min(ms, flungMs) - sweepEnd) / windMs);
      const e = 1 - (1 - w) * (1 - w);
      into.x =
        px[n - 1] +
        (cloudX - px[n - 1]) * e +
        Math.sin(ms * 0.09) * TREMBLE * w;
      into.y = py[n - 1] + Math.cos(ms * 0.13) * TREMBLE * 0.5 * w;
      return into;
    };
    // its top hangs from the cloud, thickening as it runs
    const foot = (ms: number, into: Point): Point => {
      path(ms, into);
      const p = clamp01((ms - lowerAt) / (flungMs - lowerAt));
      tornado.height = Math.max(1, into.y - cloudY);
      tornado.foot = width * lerp(FOOT, p);
      tornado.top = width * lerp(TOP, p);
      return into;
    };
    const tornado = planTornado(foot, {
      startMs: lowerAt,
      endMs: flungMs,
      height: py[0] - cloudY,
      foot: width * FOOT[0],
      top: width * TOP[0],
      spinHz: SPIN_HZ,
      sway: width * SWAY,
      growMs: 60,
    });

    // each speck caught as the foot runs over it
    const specks: Speck[] = [];
    for (let k = 0; k < bars.length; k++) {
      const bar = bars[k];
      for (let i = 0; i < CATCH; i++) {
        const j = i + k * CATCH;
        const home = {
          x: bar.box.x + bar.box.width * ((i + 0.5) / CATCH),
          y: bar.center.y + (hash01(j, 5510) - 0.5) * bar.box.height * 0.8,
        };
        const seg = cum[k * 2 + 1] - cum[k * 2];
        const along = Math.min(seg, Math.abs(home.x - px[k * 2]));
        specks.push({
          bar,
          home,
          caughtMs: timeAt(cum[k * 2] + along),
          seed: hash01(j, 5511),
        });
      }
    }
    const hits = bars.map((bar, k) => ({ bar, ms: timeAt(cum[k * 2]), k }));

    // lightning inside the cloud, built once
    const bolts: Bolt[] = [];
    for (let k = 0; k < BOLTS; k++) {
      const x = cloudX + (k - (BOLTS - 1) / 2) * cloudRx * 0.42;
      bolts.push(
        createBolt(
          { x, y: cloudY - cloudRy * 0.6 },
          { x: x + (k % 2 ? 1 : -1) * cloudRx * 0.22, y: cloudY + cloudRy },
          1,
        ),
      );
    }
    let lastHit = -1e9;

    const at: Point = { x: 0, y: 0 };
    const rumbles: number[] = [];
    for (let ms = lowerAt; ms < flungMs; ) {
      rumbles.push(ms);
      ms += lerp(RUMBLE_MS, clamp01((ms - lowerAt) / (flungMs - lowerAt)));
    }
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      (ms) => {
        if (!cover?.isLive()) return;
        shakeScreen(
          lerp(RUMBLE_SHAKE, clamp01((ms - lowerAt) / (flungMs - lowerAt))),
        );
      },
    );
    // the cloud cracking as it spreads and as the funnel drops
    const cracking = createBeats(
      [firstMs + cloudMs * 0.45, lowerAt],
      (ms) => ms,
      (ms) => {
        lastHit = ms;
        if (!cover?.isLive()) return;
        playBarExplosion(0.7);
        shakeScreen(CRACK_SHAKE);
      },
    );
    const hitting = createBeats(
      hits,
      (h) => h.ms,
      (h) => {
        lastHit = h.ms;
        path(h.ms, at);
        cover!.tierUp(h.bar, at);
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        const k = h.k / Math.max(1, bars.length - 1);
        playBloop();
        playBarExplosion(lerp(HIT_RATE, k));
        shakeScreen(lerp(HIT_SHAKE, k));
      },
    );
    const mid: Point = { x: 0, y: 0 };
    const flinging = createBeats(
      [flungMs],
      (ms) => ms,
      () => {
        lastHit = flungMs;
        funnelAt(tornado, flungMs, 0.45, 0, mid);
        funnelAt(tornado, flungMs, 0.45, Math.PI, at);
        mid.x = (mid.x + at.x) / 2;
        cover!.burst(mid, 1.3);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FLING_SHAKE);
      },
    );
    const landing = createBeats(
      [landMs],
      (ms) => ms,
      () => {
        for (const bar of bars) {
          cover!.tierUp(bar, mid);
          cover!.slam(bar);
          if (bar !== clicked) cover!.burst(bar.center, 0.9);
        }
        cover!.blast(clicked.center);
      },
    );

    const p: Point = { x: 0, y: 0 };
    const q: Point = { x: 0, y: 0 };
    const drawCloud = (ctx: CanvasRenderingContext2D, ms: number) => {
      const u = clamp01((ms - firstMs) / cloudMs);
      const spread = 0.15 + 0.85 * (1 - (1 - u) * (1 - u));
      const fade = 1 - clamp01((ms - landMs) / CLOUD_FADE_MS);
      if (fade <= 0) return;
      const base = ctx.globalAlpha;
      const rot = ms * CLOUD_SPIN + tornadoTurn(tornado, ms) * 0.12;
      const run = clamp01((ms - lowerAt) / (flungMs - lowerAt));
      let i = 0;
      for (let r = 0; r < RING_PUFFS.length; r++) {
        const count = RING_PUFFS[r];
        const out = RING_OUT[r] * spread;
        for (let k = 0; k < count; k++, i++) {
          const a = rot * (1.6 - r * 0.3) + (k / count) * TAU + r;
          const puff = lerp(PUFF, hash01(i, 5520)) * spread;
          ctx.globalAlpha = base * fade * (0.35 + 0.2 * hash01(i, 5521));
          drawGlow(
            ctx,
            CLOUD[i % 3],
            cloudX + Math.cos(a) * cloudRx * out,
            cloudY + Math.sin(a) * cloudRy * out,
            puff,
            0.7,
          );
        }
      }
      // lightning: a flicker now and then, more as it runs, and every hit
      const bucket = Math.floor(ms / FLICK_MS);
      const hit = ms - lastHit < HIT_FLASH_MS;
      if (u > 0.2 && (hit || hash01(bucket, 5530) < lerp(FLICK, run))) {
        const b = hit
          ? bucket % BOLTS
          : Math.floor(hash01(bucket, 5531) * BOLTS);
        const bolt = bolts[b];
        const flash = hit ? 1 : 0.55;
        ctx.globalAlpha = base * fade * flash * 0.7;
        drawGlow(
          ctx,
          FLASH,
          bolt.from.x,
          cloudY,
          FLASH_R * (hit ? 1.8 : 1),
          0.6,
        );
        ctx.globalAlpha = base * fade * flash * 0.5;
        drawGlow(ctx, CORE, bolt.from.x, cloudY, FLASH_R * 0.5, 0.6);
        endLightBatch(ctx);
        ctx.globalAlpha = base * fade;
        drawBolt(ctx, bolt, flash, hit ? 0.7 : 0.45, COLOR.white);
        beginLightBatch(ctx);
      }
      ctx.globalAlpha = base;
    };

    const spot: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: landMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          rumbling.tick(ms, now);
          cracking.tick(ms, now);
          hitting.tick(ms, now);
          flinging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms < firstMs || ms > landMs + CLOUD_FADE_MS) return;
          const previous = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          drawCloud(ctx, ms);
          endLightBatch(ctx);
          if (ms >= lowerAt && ms < flungMs + COLLAPSE_MS)
            drawTornado(
              ctx,
              tornado,
              Math.min(ms, flungMs),
              1 - clamp01((ms - flungMs) / COLLAPSE_MS),
            );
          beginLightBatch(ctx);
          // winding up: the funnel blurring into one bright column
          if (ms >= sweepEnd && ms < flungMs + COLLAPSE_MS) {
            const w =
              clamp01((ms - sweepEnd) / windMs) *
              (1 - clamp01((ms - flungMs) / COLLAPSE_MS));
            const base = ctx.globalAlpha;
            const t = Math.min(ms, flungMs);
            for (let k = 0; k < 4; k++) {
              const h = (k + 0.5) / 4;
              funnelAt(tornado, t, h, 0, p);
              funnelAt(tornado, t, h, Math.PI, q);
              const r = Math.abs(p.x - q.x) * 0.7 + 12;
              ctx.globalAlpha = base * (0.15 + 0.45 * w) * w;
              drawGlow(ctx, BLUR, (p.x + q.x) / 2, p.y, r);
              ctx.globalAlpha = base * 0.4 * w * w;
              drawGlow(ctx, CORE, (p.x + q.x) / 2, p.y, r * 0.45);
            }
            ctx.globalAlpha = base;
          }
          // the glitter and coins: lying on their bar, spun up, flung back
          if (ms < landMs)
            for (let i = 0; i < specks.length; i++) {
              const s = specks[i];
              if (ms < s.caughtMs) {
                spot.x = s.home.x;
                spot.y = s.home.y;
              } else if (ms < flungMs) {
                liftAt(tornado, ms, s.caughtMs, s.seed, spot);
              } else {
                flingFrom(
                  tornado,
                  flungMs,
                  Math.min(s.caughtMs, flungMs),
                  s.seed,
                  s.home,
                  clamp01((ms - flungMs) / flingMs),
                  spot,
                );
              }
              stampGlimmer(
                ctx,
                spot.x,
                spot.y,
                SPECK,
                i,
                i % 4 === 0
                  ? COLOR.coinGold
                  : i % 3
                    ? COLOR.heavenlyGold
                    : COLOR.white,
              );
            }
          endLightBatch(ctx);
          ctx.globalCompositeOperation = previous;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
