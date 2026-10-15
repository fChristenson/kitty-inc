// the "Catnip" event (pull; free hires): it covers its crit, whose click
// freezes the screen while a ball of catnip pops up over the clicked floor
// and starts to pull: glitter and little wisps tear off every floor in view
// and stream into it, a trickle then a flood, the ball swelling, throbbing
// and trembling harder as the rumble rises; it collapses to a point and
// bursts in the biggest bang and shake, flinging bright wisps out round it
// that dive one by one onto the floors, quicker and quicker, each landing a
// new worker, the clicked floor last with several. Then the crit's tier
// pays out
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
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { missingWorkerCount } from "../../../../floors/worker";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "catnip";
const MAX_OTHERS = 6;
// the ball HOME of a floor's height down the clicked floor, BALL px across
// from empty to full, popping up over POP_IN_MS, trembling TREMBLE px,
// throbbing THROB of its size, turning SPIN rad a ms at full
const HOME = 0.42;
const BALL: [number, number] = [70, 190];
const POP_IN_MS = 120;
const TREMBLE = 20;
const THROB = 0.08;
const SPIN: [number, number] = [0.0006, 0.004];
const GLOW = 2.6;
// each speck it gulps swells it GULP of its size for GULP_MS
const GULP = 0.05;
const GULP_MS = 70;
const GULP_MAX = 8;
// the specks: SPECKS torn off the floors, each popping up over TEAR_MS then
// sucked in over FLY ms (quicker as the flood builds), bowed BOW of the way
const SPECKS = 300;
const TEAR_MS = 90;
const FLY: [number, number] = [380, 170];
const FLOOD = 0.45;
const BOW = 0.28;
const SPECK = 24;
// little wisps torn off too, TEAR_WISPS of them, TEAR_WISP_MS each
const TEAR_WISPS = 8;
const TEAR_WISP_MS = 300;
const TEAR_WISP = 0.5;
// the burst: BURST_BLAST px, BURST_SHAKE the hardest of all, FLUNG specks
// flung out FLING px a ms over FLING_MS
const BURST_BLAST = 300;
const BURST_SHAKE = 3.6;
const FLUNG = 140;
const FLING: [number, number] = [1.2, 3];
const FLING_MS = 420;
// the hire wisps: flung out OUT_MS onto a ring RING of the width round the
// burst, squashed RING_SQUASH, whirling RING_SPIN rad a ms, each diving onto
// its spot over DIVE_MS; gaps shrink by GAP_DECAY down to GAP_MIN ms
const OUT_MS = 160;
const RING = 0.24;
const RING_SQUASH = 0.7;
const RING_SPIN = 0.011;
const DIVE_MS = 240;
const DIVE_OUT = 0.6;
const GAP_DECAY = 0.8;
const GAP_MIN = 45;
const HIRE_WISP = 1.1;
const HIRE_UP = 40;
const HIRE_BURST = 0.6;
const HIRE_SHAKE: [number, number] = [0.9, 1.8];
const SOUND_GAP_MS = 55;
// extra hires on the clicked floor stand SPREAD of its width apart
const SPREAD = 0.14;
const EDGE = 0.12;

const GREEN = fadeStops(COLOR.potionGreen);
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.2);
const SPECK_COLORS = [COLOR.potionGreenLight, COLOR.heavenlyGold, COLOR.white];

// the catnip ball: a bundle of leaves, bold outlines, flecked with gold
const SPRITE = 256;
let ballSprite: HTMLCanvasElement | null = null;

function leaf(
  ctx: CanvasRenderingContext2D,
  angle: number,
  from: number,
  length: number,
  width: number,
  fill: string,
): void {
  ctx.save();
  ctx.rotate(angle);
  ctx.translate(from, 0);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * 0.45, -width, length, 0);
  ctx.quadraticCurveTo(length * 0.45, width, 0, 0);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = COLOR.shareholdersGreen;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(length * 0.1, 0);
  ctx.lineTo(length * 0.8, 0);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(
    length * 0.45,
    -width * 0.35,
    length * 0.16,
    width * 0.14,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

function getBallSprite(): HTMLCanvasElement {
  if (ballSprite) return ballSprite;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SPRITE;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(SPRITE / 2, SPRITE / 2);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const h = SPRITE / 2;
  for (let i = 0; i < 11; i++)
    leaf(
      ctx,
      (i / 11) * Math.PI * 2,
      h * 0.15,
      h * 0.78,
      h * 0.2,
      i % 2 ? COLOR.potionGreen : COLOR.luckyCloverGreen,
    );
  for (let i = 0; i < 7; i++)
    leaf(
      ctx,
      (i / 7) * Math.PI * 2 + 0.4,
      h * 0.05,
      h * 0.55,
      h * 0.17,
      i % 2 ? COLOR.potionGreenLight : COLOR.potionGreen,
    );
  ctx.beginPath();
  ctx.arc(0, 0, h * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.luckyCloverGreen;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = COLOR.shareholdersGreen;
  ctx.stroke();
  ctx.fillStyle = COLOR.heavenlyGold;
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4;
    const r = h * (0.15 + (0.6 * ((i * 7) % 16)) / 16);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ballSprite = canvas;
  return canvas;
}

export const forceCatnipEvent = registerWispEvent(
  KEY,
  "Catnip",
  () => meta.chance,
  (floor, context, area) => {
    const {
      firstMs,
      pullMs,
      collapseMs,
      hireMs,
      hireGapMs,
      clickedHires,
      holdMs,
      mergeMs,
    } = meta.values;
    const found = findRewardHires(floor, context);
    if (found.length === 0) return;
    getBallSprite();
    const width = area.right - area.left;
    const home: Point = { x: FLOOR_W / 2, y: FLOOR_H * HOME };
    const climaxMs = firstMs + pullMs;
    const burstAt = climaxMs + collapseMs;

    // the hires: the other floors farthest first, then the clicked floor's
    const own = found.find((h) => h.floor === floor);
    const away = (h: RewardHire) => Math.hypot(h.x - home.x, h.y - home.y);
    const hires = found
      .filter((h) => h !== own)
      .sort((a, b) => away(b) - away(a))
      .slice(0, MAX_OTHERS);
    if (own) {
      hires.push(own);
      const extra = Math.min(clickedHires, missingWorkerCount(floor)) - 1;
      for (let k = 1; k <= extra; k++) {
        const side = (k % 2 ? 1 : -1) * Math.ceil(k / 2);
        const x = Math.min(
          FLOOR_W * (1 - EDGE),
          Math.max(FLOOR_W * EDGE, own.x + side * SPREAD * FLOOR_W),
        );
        hires.push({ ...own, x, workerIndex: null, hiredAt: null });
      }
    }
    const n = hires.length;
    let lands = burstAt + hireMs;
    let gap: number = hireGapMs;
    const spots = hires.map((hire, k) => {
      const spot = {
        hire,
        at: { x: hire.x, y: hire.y - HIRE_UP },
        lands,
        angle: (k / n) * Math.PI * 2 - Math.PI / 2,
      };
      lands += gap;
      gap = Math.max(GAP_MIN, gap * GAP_DECAY);
      return spot;
    });
    const last = spots[n - 1];
    const endMs = Math.max(last.lands, burstAt + DETONATION_MS);

    // the floors in view the specks tear off: each one's visible band
    const onScreen = context.getOnScreenFloors?.() ?? [];
    const top = onScreen.find((e) => e.floor === floor)?.top ?? 0;
    const rows = onScreen
      .filter((e) => e.visibleBottom - e.visibleTop > FLOOR_H * 0.2)
      .map((e) => ({
        y0: e.visibleTop + e.top - top,
        y1: e.visibleBottom + e.top - top,
      }));
    if (rows.length === 0) rows.push({ y0: area.top, y1: area.bottom });

    // the specks, in order of tearing off: a trickle then a flood
    const fromX = new Float32Array(SPECKS);
    const fromY = new Float32Array(SPECKS);
    const launch = new Float32Array(SPECKS);
    const fly = new Float32Array(SPECKS);
    const bow = new Float32Array(SPECKS);
    for (let i = 0; i < SPECKS; i++) {
      const row = rows[i % rows.length];
      const share = (i + 1) / SPECKS;
      fromX[i] = area.left + width * (0.04 + 0.92 * Math.random());
      fromY[i] = row.y0 + (row.y1 - row.y0) * (0.1 + 0.8 * Math.random());
      fly[i] = lerp(FLY, share);
      launch[i] = firstMs + (pullMs - fly[i]) * share ** FLOOD;
      bow[i] =
        (Math.random() < 0.5 ? -1 : 1) * BOW * (0.4 + 0.6 * Math.random());
    }
    // flung out at the burst
    const flingCos = new Float32Array(FLUNG);
    const flingSin = new Float32Array(FLUNG);
    const flingSpeed = new Float32Array(FLUNG);
    for (let i = 0; i < FLUNG; i++) {
      const a = Math.random() * Math.PI * 2;
      flingCos[i] = Math.cos(a);
      flingSin[i] = Math.sin(a);
      flingSpeed[i] = lerp(FLING, Math.random());
    }

    // the torn-off wisps, one off each floor in turn, quicker as it floods
    const tearWisps = Array.from({ length: TEAR_WISPS }, (_, k) => {
      const row = rows[k % rows.length];
      const from: Point = {
        x:
          area.left +
          width *
            (k % 2 ? 0.15 + 0.2 * Math.random() : 0.65 + 0.2 * Math.random()),
        y: (row.y0 + row.y1) / 2,
      };
      const start =
        firstMs + (pullMs - TEAR_WISP_MS) * ((k + 1) / TEAR_WISPS) ** 0.6;
      const end = start + TEAR_WISP_MS;
      const into: Point = { x: 0, y: 0 };
      const sign = k % 2 ? 1 : -1;
      return {
        start,
        end,
        at: (ms: number): Point | null => {
          if (ms < start || ms > end) return null;
          const u = easeIn((ms - start) / TEAR_WISP_MS);
          const dx = home.x - from.x;
          const dy = home.y - from.y;
          const b = sign * 0.3 * Math.sin(Math.PI * u);
          into.x = from.x + dx * u - dy * b;
          into.y = from.y + dy * u + dx * b;
          return into;
        },
      };
    });

    // the hire wisps: flung out onto the whirling ring, then each dives
    const ring = width * RING;
    const ringAt = (angle: number, ms: number, into: Point): Point => {
      const s = ms - burstAt;
      const r = ring * easeOut(clamp01(s / OUT_MS));
      const a = angle + RING_SPIN * s;
      into.x = home.x + Math.cos(a) * r;
      into.y = home.y + Math.sin(a) * r * RING_SQUASH;
      return into;
    };
    const hirePaths = spots.map((s) => {
      const into: Point = { x: 0, y: 0 };
      const start: Point = { x: 0, y: 0 };
      const dive = Math.max(burstAt, s.lands - DIVE_MS);
      return (ms: number): Point | null => {
        if (ms < burstAt || ms > s.lands) return null;
        if (ms < dive) return ringAt(s.angle, ms, into);
        ringAt(s.angle, dive, start);
        const u = easeIn(clamp01((ms - dive) / (s.lands - dive)));
        const cx = start.x + (start.x - home.x) * DIVE_OUT;
        const cy = start.y + (start.y - home.y) * DIVE_OUT;
        const v = 1 - u;
        into.x = v * v * start.x + 2 * v * u * cx + u * u * s.at.x;
        into.y = v * v * start.y + 2 * v * u * cy + u * u * s.at.y;
        return into;
      };
    });

    const charge = planCharge(firstMs, pullMs, {
      climaxShake: 1.4,
      bang: false,
    });
    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const appearing = createBeats(
      [firstMs],
      (ms) => ms,
      () => {
        cover!.burst(home, 0.7);
        if (cover!.isLive()) playBloop();
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
        if (cover!.isLive()) shakeScreen(BURST_SHAKE);
      },
    );
    const landing = createBeats(
      spots,
      (s) => s.lands,
      (s, k, now) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.at);
          return;
        }
        cover!.burst(s.at, HIRE_BURST);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(HIRE_SHAKE, k / Math.max(1, n - 1)));
        bang(now);
      },
    );

    const shiver: Point = { x: 0, y: 0 };
    const ball: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: last.lands + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          if (cover?.isLive()) tickCharge(charge, ms);
          appearing.tick(ms, now);
          collapsing.tick(ms, now);
          bursting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < firstMs || ms > endMs) return;
          const c = chargeAt(charge, Math.min(ms, climaxMs));
          trembleAt(c, ms, TREMBLE, shiver);
          ball.x = home.x + shiver.x;
          ball.y = home.y + shiver.y;
          const previous = ctx.globalCompositeOperation;

          if (ms < climaxMs) {
            // the specks: torn off, then sucked in; counting fresh gulps
            let gulps = 0;
            ctx.globalCompositeOperation = "lighter";
            beginLightBatch(ctx);
            for (let i = 0; i < SPECKS; i++) {
              const t0 = launch[i] - TEAR_MS;
              if (ms < t0) break;
              const arrive = launch[i] + fly[i];
              if (ms >= arrive) {
                if (ms - arrive < GULP_MS) gulps++;
                continue;
              }
              const color = SPECK_COLORS[i % 3];
              if (ms < launch[i]) {
                const pop = (ms - t0) / TEAR_MS;
                stampGlimmer(
                  ctx,
                  fromX[i] + Math.sin(ms * 0.09 + i) * 4,
                  fromY[i] + Math.cos(ms * 0.11 + i) * 4,
                  SPECK * pop * 1.3,
                  i,
                  color,
                );
                continue;
              }
              const e = ((ms - launch[i]) / fly[i]) ** 2;
              const dx = ball.x - fromX[i];
              const dy = ball.y - fromY[i];
              const b = bow[i] * Math.sin(Math.PI * e);
              stampGlimmer(
                ctx,
                fromX[i] + dx * e - dy * b,
                fromY[i] + dy * e + dx * b,
                SPECK * (1 - 0.55 * e),
                i + ms * 0.004,
                color,
              );
            }
            endLightBatch(ctx);
            ctx.globalCompositeOperation = previous;
            for (let k = 0; k < TEAR_WISPS; k++)
              drawWispBetween(
                ctx,
                tearWisps[k].at,
                ms,
                now,
                WISP_SIZE * TEAR_WISP,
                0.4,
                tearWisps[k].start,
                tearWisps[k].end,
              );

            // the ball: popping up, swelling, throbbing, gulping
            const pop = easeOut(clamp01((ms - firstMs) / POP_IN_MS));
            const size =
              (BALL[0] + (BALL[1] - BALL[0]) * c) *
              pop *
              (1 +
                THROB * c * Math.sin(ms * (0.02 + 0.05 * c)) +
                GULP * Math.min(gulps, GULP_MAX));
            drawBall(ctx, ball, size, c, ms * lerp(SPIN, c), now);
          } else if (ms < burstAt) {
            // collapsing to a point, white hot
            const u = easeIn((ms - climaxMs) / collapseMs);
            drawBall(ctx, ball, BALL[1] * (1 - u), 1 + u, ms * SPIN[1], now);
          }

          if (ms >= burstAt) {
            const t = ms - burstAt;
            drawDetonation(ctx, home, t, BURST_BLAST, now);
            if (t < FLING_MS) {
              ctx.globalCompositeOperation = "lighter";
              ctx.globalAlpha = 1 - t / FLING_MS;
              beginLightBatch(ctx);
              for (let i = 0; i < FLUNG; i++) {
                const d = flingSpeed[i] * t;
                stampGlimmer(
                  ctx,
                  home.x + flingCos[i] * d,
                  home.y + flingSin[i] * d,
                  SPECK * 1.3,
                  i,
                  SPECK_COLORS[i % 3],
                );
              }
              endLightBatch(ctx);
              ctx.globalAlpha = 1;
              ctx.globalCompositeOperation = previous;
            }
            for (let k = 0; k < n; k++)
              drawWispBetween(
                ctx,
                hirePaths[k],
                ms,
                now,
                WISP_SIZE * HIRE_WISP,
                0.7,
                burstAt,
                spots[k].lands,
              );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);

// the ball `size` px across at `at`, turned `turn`, glowing with heat c
// (over 1 white hot as it collapses)
function drawBall(
  ctx: CanvasRenderingContext2D,
  at: Point,
  size: number,
  c: number,
  turn: number,
  now: number,
): void {
  if (size <= 0) return;
  const previous = ctx.globalCompositeOperation;
  const flicker = 1 + 0.1 * Math.sin(now * 0.05);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, 0.45 + 0.4 * c);
  drawGlow(ctx, GREEN, at.x, at.y, size * GLOW * 0.5 * flicker);
  ctx.globalAlpha = Math.min(1, 0.25 + 0.4 * c);
  drawGlow(ctx, GOLD, at.x, at.y, size * GLOW * 0.35 * flicker);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  const half = size / 2;
  ctx.translate(at.x, at.y);
  ctx.rotate(turn);
  ctx.drawImage(ballSprite!, -half, -half, size, size);
  ctx.rotate(-turn);
  ctx.translate(-at.x, -at.y);
  const hot = Math.max(0, c - 0.5);
  if (hot <= 0) return;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, hot);
  drawGlow(ctx, WHITE, at.x, at.y, size * 0.45 + 60 * Math.max(0, c - 1));
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}
