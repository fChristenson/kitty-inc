// the "Supermassive" event (pull; crit tiers): it covers its crit, whose
// click freezes the screen while a tiny blazing gold star ignites in the
// middle of it and starts tearing the light off every bar in view: streaks
// peel off each bar and curl round it spiralling in, a trickle then a flood,
// and every so often, quicker and quicker, one bar's light gushes off at
// once, the bar flashing and taking a crit tier. The star swells into a huge
// throbbing sun, trembling, its corona flaring, the rumble rising; it
// collapses to a white pinpoint, hangs a beat in silence, then explodes: the
// biggest blast and shake, and a ring of light slams across the screen, each
// bar it crosses taking the last crit tier. Then the crit's tier pays out
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import {
  chargeAt,
  planCharge,
  tickCharge,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playBarExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { stampGlimmer } from "../../../../shared/twinkle";
import type { Point } from "../../../../shared/wisp";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "supermassive";
const MAX_BARS = 8;
const TAU = Math.PI * 2;
// the star: SUN px across from a spark to full, popping in over POP_MS,
// trembling TREMBLE px, throbbing THROB of its size, its halo HALO of it;
// collapsing down to a PIN px pinpoint
const SUN: [number, number] = [36, 250];
const POP_MS = 110;
const TREMBLE = 16;
const THROB = 0.1;
const HALO = 0.9;
const PIN = 7;
// its corona: CORONA flares round its rim, each up to FLARE of its size,
// the ring of them turning CORONA_SPIN rad a ms
const CORONA = 12;
const FLARE = 0.34;
const CORONA_SPIN = 0.0009;
// each streak it swallows swells it GULP of its size for GULP_MS
const GULP = 0.035;
const GULP_MS = 70;
const GULP_MAX = 8;
// the streaks: STREAKS peeling off the bars, a trickle then a flood, each
// lighting up over TEAR_MS, then curling CURL rad round the star as it falls
// in over FLY ms (quicker as it floods); a tail of TRAIL glimmers TRAIL_GAP
// of its way apart
const STREAKS = 170;
const TEAR_MS = 80;
const FLY: [number, number] = [420, 190];
const FLOOD = 0.5;
const CURL: [number, number] = [1.3, 2.4];
const SPECK = 22;
const TRAIL = 3;
const TRAIL_GAP = 0.06;
// each bar's light gushing off at once: RIP streaks over RIP_MS, the rips
// quickening (RIP_EASE) from RIP_FROM ms after the star lights till RIP_TO ms
// before the collapse, farthest bar first
const RIP = 14;
const RIP_MS = 90;
const RIP_FROM = 160;
const RIP_TO = 360;
const RIP_EASE = 0.6;
const RIP_SHAKE: [number, number] = [0.5, 1.3];
const RIP_RATE: [number, number] = [0.8, 1.35];
// the blast: BLAST px, BLAST_SHAKE the hardest of all; its ring RING_W px
// thick thinning out, RING_SPARKS glimmers riding it, fading over
// RING_FADE_MS once past the screen's corners
const BLAST = 340;
const BLAST_SHAKE = 3.8;
const RING_W: [number, number] = [38, 10];
const RING_SPARKS = 48;
const RING_SPARK = 30;
const RING_FADE_MS = 120;
const RING_HIT_SHAKE = 1.1;

const ORANGE = fadeStops(COLOR.flameOrange);
const GOLD = fadeStops(COLOR.sunshineGold);
const FLARE_GLOW = fadeStops(COLOR.flameYellow);
const WHITE = fadeStops(COLOR.white, 0.2);
const SPECK_COLORS = [COLOR.flameYellow, COLOR.heavenlyGold, COLOR.white];

// the sun's disc: white hot in the middle through yellow and gold to orange
const SPRITE = 256;
let sunSprite: HTMLCanvasElement | null = null;

function getSunSprite(): HTMLCanvasElement {
  if (sunSprite) return sunSprite;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SPRITE;
  const ctx = canvas.getContext("2d")!;
  const h = SPRITE / 2;
  const fill = ctx.createRadialGradient(h, h, 0, h, h, h);
  fill.addColorStop(0, COLOR.white);
  fill.addColorStop(0.3, COLOR.flameYellow);
  fill.addColorStop(0.65, COLOR.sunshineGold);
  fill.addColorStop(0.9, COLOR.flameOrange);
  fill.addColorStop(1, "rgba(249,115,22,0)");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(h, h, h, 0, TAU);
  ctx.fill();
  sunSprite = canvas;
  return canvas;
}

export const forceSupermassiveEvent = registerWispEvent(
  KEY,
  "Supermassive",
  () => meta.chance,
  (floor, context, area) => {
    const {
      firstMs,
      pullMs,
      collapseMs,
      silenceMs,
      ringMs,
      holdMs,
      mergeMs,
    } = meta.values;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    getSunSprite();
    const n = bars.length;
    const home: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const climaxMs = firstMs + pullMs;
    const silenceAt = climaxMs + collapseMs;
    const burstAt = silenceAt + silenceMs;

    // the rips: the farthest bar first, quicker and quicker
    const far = (b: RewardBar) =>
      Math.hypot(b.center.x - home.x, b.center.y - home.y);
    const ripFrom = firstMs + RIP_FROM;
    const ripTo = climaxMs - RIP_TO;
    const rips = bars
      .slice()
      .sort((a, b) => far(b) - far(a))
      .map((bar, k) => ({
        bar,
        k,
        ms: ripFrom + (ripTo - ripFrom) * ((k + 1) / n) ** RIP_EASE,
      }));

    // every streak: where it peels off (round the star), when, how fast
    const total = STREAKS + RIP * n;
    const fromX = new Float32Array(total);
    const fromY = new Float32Array(total);
    const r0 = new Float32Array(total);
    const a0 = new Float32Array(total);
    const curl = new Float32Array(total);
    const launch = new Float32Array(total);
    const fly = new Float32Array(total);
    const place = (i: number, x: number, y: number, at: number, ms: number) => {
      fromX[i] = x;
      fromY[i] = y;
      r0[i] = Math.hypot(x - home.x, y - home.y);
      a0[i] = Math.atan2(y - home.y, x - home.x);
      curl[i] = lerp(CURL, Math.random());
      launch[i] = at;
      fly[i] = ms;
    };
    for (let i = 0; i < STREAKS; i++) {
      const bar = bars[i % n];
      const share = (i + 1) / STREAKS;
      const flyMs = lerp(FLY, share);
      place(
        i,
        bar.box.x + bar.box.width * Math.random(),
        bar.center.y + (Math.random() - 0.5) * bar.box.height * 1.2,
        firstMs + POP_MS + (pullMs - POP_MS - flyMs) * share ** FLOOD,
        flyMs,
      );
    }
    for (const rip of rips) {
      const flyMs = lerp(FLY, clamp01((rip.ms - firstMs) / pullMs));
      for (let j = 0; j < RIP; j++)
        place(
          STREAKS + rip.k * RIP + j,
          rip.bar.center.x + (Math.random() - 0.5) * rip.bar.box.width * 0.9,
          rip.bar.center.y + (Math.random() - 0.5) * rip.bar.box.height,
          rip.ms + (RIP_MS * j) / RIP,
          flyMs,
        );
    }

    // the ring: crossing to the screen's farthest corner in ringMs, slamming
    // each bar as it reaches its nearest edge
    const reach = Math.hypot(
      Math.max(home.x - area.left, area.right - home.x),
      Math.max(home.y - area.top, area.bottom - home.y),
    );
    const ringSpeed = reach / ringMs;
    const ringHits = bars
      .map((bar) => {
        const { x, y, width: w, height: h } = bar.box;
        const dx = Math.max(x - home.x, 0, home.x - x - w);
        const dy = Math.max(y - home.y, 0, home.y - y - h);
        return { bar, ms: burstAt + Math.hypot(dx, dy) / ringSpeed };
      })
      .sort((a, b) => a.ms - b.ms);
    const lastHit = ringHits[n - 1];
    const ringEnd = burstAt + ringMs + RING_FADE_MS;
    const endMs = Math.max(burstAt + DETONATION_MS, ringEnd);
    const ringCos = new Float32Array(RING_SPARKS);
    const ringSin = new Float32Array(RING_SPARKS);
    for (let i = 0; i < RING_SPARKS; i++) {
      ringCos[i] = Math.cos((i / RING_SPARKS) * TAU);
      ringSin[i] = Math.sin((i / RING_SPARKS) * TAU);
    }

    const charge = planCharge(firstMs, pullMs, {
      climaxShake: 1.4,
      bang: false,
    });
    const igniting = createBeats(
      [firstMs],
      (ms) => ms,
      () => {
        cover!.burst(home, 0.8);
        if (cover!.isLive()) playBloop();
      },
    );
    const ripping = createBeats(
      rips,
      (r) => r.ms,
      (r) => {
        cover!.tierUp(r.bar, home);
        cover!.burst(r.bar.center, 0.7);
        if (!cover!.isLive()) return;
        const q = r.k / Math.max(1, n - 1);
        playBloop();
        playBarExplosion(lerp(RIP_RATE, q));
        shakeScreen(lerp(RIP_SHAKE, q));
      },
    );
    const collapsing = createBeats(
      [climaxMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => {
        cover!.blast(home);
        if (cover!.isLive()) shakeScreen(BLAST_SHAKE);
      },
    );
    const ringing = createBeats(
      ringHits,
      (h) => h.ms,
      (h) => {
        cover!.tierUp(h.bar, home);
        cover!.slam(h.bar);
        if (h === lastHit) {
          cover!.blast(h.bar.center);
          return;
        }
        cover!.burst(h.bar.center, 0.9);
        if (!cover!.isLive()) return;
        playBarExplosion(1.2);
        shakeScreen(RING_HIT_SHAKE);
      },
    );

    const shiver: Point = { x: 0, y: 0 };
    const ball: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(lastHit.ms + holdMs, endMs) + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          if (cover?.isLive()) tickCharge(charge, ms);
          igniting.tick(ms, now);
          ripping.tick(ms, now);
          collapsing.tick(ms, now);
          bursting.tick(ms, now);
          ringing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < firstMs || ms > endMs) return;
          const previous = ctx.globalCompositeOperation;
          const base = ctx.globalAlpha;

          if (ms < climaxMs) {
            const c = chargeAt(charge, ms);
            trembleAt(c, ms, TREMBLE, shiver);
            ball.x = home.x + shiver.x;
            ball.y = home.y + shiver.y;
            // the streaks: lighting up on their bar, then curling in
            let gulps = 0;
            ctx.globalCompositeOperation = "lighter";
            beginLightBatch(ctx);
            for (let i = 0; i < total; i++) {
              const t0 = launch[i] - TEAR_MS;
              if (ms < t0) continue;
              const arrive = launch[i] + fly[i];
              if (ms >= arrive) {
                if (ms - arrive < GULP_MS) gulps++;
                continue;
              }
              const color = SPECK_COLORS[i % 3];
              if (ms < launch[i]) {
                stampGlimmer(
                  ctx,
                  fromX[i],
                  fromY[i],
                  SPECK * 1.3 * ((ms - t0) / TEAR_MS),
                  i,
                  color,
                );
                continue;
              }
              const u = (ms - launch[i]) / fly[i];
              for (let j = 0; j < TRAIL; j++) {
                const v = u - j * TRAIL_GAP;
                if (v < 0) break;
                const e = v * v;
                const r = r0[i] * (1 - e);
                const a = a0[i] + curl[i] * e;
                stampGlimmer(
                  ctx,
                  ball.x + Math.cos(a) * r,
                  ball.y + Math.sin(a) * r,
                  SPECK * (1 - 0.5 * e) * (1 - 0.28 * j),
                  i + j * 7 + ms * 0.004,
                  j === 0 ? color : COLOR.heavenlyGold,
                );
              }
            }
            endLightBatch(ctx);
            ctx.globalCompositeOperation = previous;

            // the sun: igniting, swelling, throbbing, gulping
            const pop = easeOut(clamp01((ms - firstMs) / POP_MS));
            const size =
              lerp(SUN, c) *
              pop *
              (1 +
                THROB * c * Math.sin(ms * (0.015 + 0.045 * c)) +
                GULP * Math.min(gulps, GULP_MAX));
            drawSun(ctx, ball, size, c, now);
          } else if (ms < silenceAt) {
            // collapsing, white hot, still trembling
            const u = clamp01((ms - climaxMs) / collapseMs);
            trembleAt(1, ms, TREMBLE * (1 - u), shiver);
            ball.x = home.x + shiver.x;
            ball.y = home.y + shiver.y;
            const size = Math.max(PIN, SUN[1] * (1 - easeIn(u)));
            drawSun(ctx, ball, size, 1 + u, now);
          } else if (ms < burstAt) {
            // the pinpoint, hanging in silence
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = base * 0.5;
            drawGlow(ctx, GOLD, home.x, home.y, 34);
            ctx.globalAlpha = base;
            drawGlow(ctx, WHITE, home.x, home.y, 12 + 3 * Math.sin(now * 0.08));
            ctx.globalCompositeOperation = previous;
          }

          if (ms >= burstAt) {
            const t = ms - burstAt;
            drawDetonation(ctx, home, t, BLAST, now);
            if (ms < ringEnd) {
              const r = ringSpeed * t;
              const fade =
                1 - clamp01((r - reach) / (ringSpeed * RING_FADE_MS));
              const w = lerp(RING_W, clamp01(t / ringMs));
              ctx.globalCompositeOperation = "lighter";
              ctx.globalAlpha = base * fade * 0.8;
              ctx.strokeStyle = COLOR.sunshineGold;
              ctx.lineWidth = w;
              ctx.beginPath();
              ctx.arc(home.x, home.y, r, 0, TAU);
              ctx.stroke();
              ctx.globalAlpha = base * fade;
              ctx.strokeStyle = COLOR.white;
              ctx.lineWidth = w * 0.3;
              ctx.beginPath();
              ctx.arc(home.x, home.y, r, 0, TAU);
              ctx.stroke();
              beginLightBatch(ctx);
              for (let i = 0; i < RING_SPARKS; i++)
                stampGlimmer(
                  ctx,
                  home.x + ringCos[i] * r,
                  home.y + ringSin[i] * r,
                  RING_SPARK,
                  i,
                  SPECK_COLORS[i % 3],
                );
              endLightBatch(ctx);
              ctx.globalAlpha = base;
              ctx.globalCompositeOperation = previous;
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);

// the sun `size` px across at `at`, glowing with heat (over 1 white hot as
// it collapses): an orange halo, flaring corona, its disc, a white core
function drawSun(
  ctx: CanvasRenderingContext2D,
  at: Point,
  size: number,
  heat: number,
  now: number,
): void {
  if (size <= 0) return;
  const previous = ctx.globalCompositeOperation;
  const base = ctx.globalAlpha;
  const c = Math.min(1, heat);
  const flicker = 1 + 0.08 * Math.sin(now * 0.045);
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  ctx.globalAlpha = base * (0.4 + 0.45 * c);
  drawGlow(ctx, ORANGE, at.x, at.y, size * HALO * flicker);
  ctx.globalAlpha = base * (0.35 + 0.4 * c);
  drawGlow(ctx, GOLD, at.x, at.y, size * 0.6 * flicker);
  const spin = now * CORONA_SPIN;
  const rim = size * 0.5;
  for (let k = 0; k < CORONA; k++) {
    const a = spin + (k / CORONA) * TAU;
    const f = 0.5 + 0.5 * Math.sin(now * (0.011 + 0.02 * c) + k * 2.39);
    const flare = size * FLARE * (0.35 + 0.65 * f) * (0.4 + 0.6 * c);
    const out = rim + flare * 0.3;
    ctx.globalAlpha = base * (0.3 + 0.5 * f);
    drawGlow(
      ctx,
      FLARE_GLOW,
      at.x + Math.cos(a) * out,
      at.y + Math.sin(a) * out,
      flare,
    );
  }
  endLightBatch(ctx);
  ctx.globalAlpha = base;
  ctx.globalCompositeOperation = previous;
  ctx.drawImage(sunSprite!, at.x - rim, at.y - rim, size, size);
  const hot = heat - 0.6;
  if (hot <= 0) return;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = base * Math.min(1, hot);
  drawGlow(ctx, WHITE, at.x, at.y, size * 0.4 + 30 * Math.max(0, heat - 1));
  ctx.globalAlpha = base;
  ctx.globalCompositeOperation = previous;
}
