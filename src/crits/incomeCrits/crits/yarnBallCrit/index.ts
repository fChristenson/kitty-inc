// Yarn Ball, an income crit: the green amount shrinks away and a little ball
// of glowing gold yarn is batted out of it onto a loop round the total; it
// rolls round and round in quickening laps, winding up the glints lying on
// the loop so it swells, its loose thread trailing longer behind, each lap a
// jolt and a share of the amount spat up onto the readout; then it's batted
// hard into the readout and unravels in a burst of gold threads with the last
// share, the big blast and hardest shake
import { COLOR } from "../../../../palette";
import { easeOut } from "../../../../shared/easing";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawSnowball,
  planSnowball,
  rolledAt,
  snowballRadius,
  type Snowball,
} from "../../../../shared/animationStyles/snowball";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawNumberShrink, readoutSpot } from "../shared";

// batted out of the flash onto the loop's foot, then the laps, then batted
// into the readout
const BAT_MS = 170;
const LOOP_MS = 1150;
const LOOP_END = BAT_MS + LOOP_MS;
const BAT_IN_MS = 120;
const IMPACT = LOOP_END + BAT_IN_MS;
// the loop round the total: RX x RY, its middle DROP px under it, RX at most
// EDGE px in from the screen's sides
const LAPS = 4;
const RX = 340;
const RY = 105;
const DROP = 35;
const EDGE = 50;
const TURN = Math.PI * 2 * LAPS;
// the laps quicken: its share of the turning at u is A*u + (1-A)*u^2
const A = 0.35;
// the glints lying on the loop, JITTER px off it
const SPECKS = 90;
const JITTER = 36;
const SPECK = 18;
// the ball: BASE round, growing GROW a sqrt of a glint; its wound strands
const BASE = 16;
const GROW = 4.6;
const STRANDS = 4;
const YARN = "#c98614";
const STRAND = "#ffe27a";
// the loose thread: TRAIL samples back over a span of TRAIL_MS, waving WAVE
const TRAIL = 16;
const TRAIL_MS: [number, number] = [35, 80];
const WAVE = 0.7;
// the bats: a white swipe under the ball over SWIPE_MS
const SWIPE_MS = 140;
// each lap's share spat up over SPIT_MS onto the readout, a flash on landing
const SPIT_MS = 150;
const SPIT_BOW = 120;
const SPIT_FONT: [number, number] = [0.45, 0.3];
const FLASH_MS = 170;
const SPIT_FLASH = 120;
const LAP_FLASH = 90;
// the unravelling: THREADS curls of gold flung off the readout over UNRAVEL_MS
const THREADS = 40;
const UNRAVEL_MS = 420;
const THREAD_LEN: [number, number] = [170, 430];
const CURL = 0.7;
const SEGS = 5;
const IMPACT_BLAST = 440;
const IMPACT_FLASH = 420;
const LAP_SHAKE: [number, number] = [0.5, 1.1];
const BAT_SHAKE = 1.2;
// shakes by step: a share, the last
const SHAKES = [0.6, 3];

const GOLD = fadeStops(COLOR.heavenlyGold);
const GREEN = fadeStops(COLOR.moneyGreen);
const WHITE = fadeStops(COLOR.white, 0.2);
const TEXT = { alpha: 1 };

interface Plan {
  snow: Snowball;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  lapEnds: Float32Array;
  spitTo: Point[];
  angles: Float32Array;
  lengths: Float32Array;
  jolts: number;
  batted: boolean;
}
const plans = new WeakMap<Running, Plan>();
const ball: Point = { x: 0, y: 0 };
const back: Point = { x: 0, y: 0 };

// the share u (0..1) of the loop's time at which it has turned share s
const solve = (s: number): number =>
  (-A + Math.sqrt(A * A + 4 * (1 - A) * clamp01(s))) / (2 * (1 - A));

// where the ball is at ms, into `into`
function ballAt(p: Plan, ms: number, to: Point, into: Point): Point {
  const footY = p.cy + p.ry;
  if (ms <= BAT_MS) {
    const u = easeOut(clamp01(ms / BAT_MS));
    into.x = lerp(0, p.cx, u);
    into.y = lerp(0, footY, u);
  } else if (ms <= LOOP_END) {
    const u = (ms - BAT_MS) / LOOP_MS;
    const a = Math.PI / 2 + TURN * (A * u + (1 - A) * u * u);
    into.x = p.cx + p.rx * Math.cos(a);
    into.y = p.cy + p.ry * Math.sin(a);
  } else {
    const u = clamp01((ms - LOOP_END) / BAT_IN_MS);
    const e = u * u;
    into.x = lerp(p.cx, to.x, e);
    into.y = lerp(footY, to.y, e);
  }
  return into;
}

// a white swipe batting the ball at x, y up
function drawSwipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  since: number,
): void {
  if (since < 0 || since >= SWIPE_MS) return;
  const f = 1 - since / SWIPE_MS;
  const base = ctx.globalAlpha;
  ctx.globalAlpha = base * f;
  ctx.strokeStyle = COLOR.white;
  ctx.lineWidth = 4 + 16 * f;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(
    x,
    y + size * 2.4,
    Math.max(0, size * 1.6),
    Math.PI * 1.2,
    Math.PI * 1.8,
  );
  ctx.stroke();
  ctx.globalAlpha = base;
}

// the yarn ball: a gold core wound with strands, turning with `spin`
function drawYarn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rad: number,
  spin: number,
): void {
  const r = Math.max(0, rad);
  ctx.fillStyle = YARN;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = STRAND;
  ctx.lineWidth = Math.max(1.5, r * 0.13);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let k = 0; k < STRANDS; k++) {
    const rot = spin + (k * Math.PI) / STRANDS;
    const ex = r * 0.9;
    const ey = r * (k % 2 ? 0.55 : 0.3);
    ctx.moveTo(x + Math.cos(rot) * ex, y + Math.sin(rot) * ex);
    ctx.ellipse(x, y, ex, ey, rot, 0, Math.PI);
  }
  ctx.stroke();
}

registerFloorCrit("yarnBallCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const rx = Math.max(120, Math.min(RX, r.viewportWidth / 2 - EDGE));
    const cx = to.x;
    const cy = to.y + DROP;
    // the laps' length, for the strands' turning
    const h = ((rx - RY) / (rx + RY)) ** 2;
    const lap =
      Math.PI * (rx + RY) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    const specks: Point[] = [];
    const turns = new Float32Array(SPECKS);
    for (let i = 0; i < SPECKS; i++) {
      turns[i] = TURN * lerp(0.03, 0.97, holeHash(i, 9810));
      const a = Math.PI / 2 + turns[i];
      const j = (holeHash(i, 9811) - 0.5) * JITTER;
      specks.push({
        x: cx + (rx + j) * Math.cos(a),
        y: cy + (RY + j * 0.5) * Math.sin(a),
      });
    }
    const snow = planSnowball(
      [
        {
          from: { x: 0, y: 0 },
          to: { x: lap * LAPS, y: 0 },
          startMs: BAT_MS,
          endMs: LOOP_END,
        },
      ],
      specks,
      -1,
    );
    // picked up when the ball turns past each glint
    for (let i = 0; i < SPECKS; i++)
      snow.picks[i] = BAT_MS + LOOP_MS * solve(turns[i] / TURN);
    const lapEnds = new Float32Array(LAPS);
    for (let k = 0; k < LAPS; k++)
      lapEnds[k] = BAT_MS + LOOP_MS * solve((k + 1) / LAPS);
    const spitTo: Point[] = [];
    for (let k = 0; k < LAPS - 1; k++) {
      spitTo.push(readoutSpot(to, k, 9812));
      hit(0, lapEnds[k] + SPIT_MS, 0);
    }
    hit(0, IMPACT, 1);
    const angles = new Float32Array(THREADS);
    const lengths = new Float32Array(THREADS);
    for (let i = 0; i < THREADS; i++) {
      angles[i] = ((i + holeHash(i, 9813)) / THREADS) * Math.PI * 2;
      lengths[i] = lerp(...THREAD_LEN, holeHash(i, 9814));
    }
    plans.set(r, {
      snow,
      cx,
      cy,
      rx,
      ry: RY,
      lapEnds,
      spitTo,
      angles,
      lengths,
      jolts: 0,
      batted: false,
    });
  },
  draw(ctx, r, ms, bars) {
    const p = plans.get(r);
    if (!p) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const alpha = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;
    const footY = p.cy + p.ry;
    const prog = clamp01((ms - BAT_MS) / LOOP_MS);
    drawNumberShrink(ctx, r, ms);

    // a jolt at each lap's end, a harder one on the last bat
    while (p.jolts < LAPS - 1 && ms >= p.lapEnds[p.jolts]) {
      r.shake(lerp(...LAP_SHAKE, p.jolts / Math.max(1, LAPS - 2)));
      p.jolts++;
    }
    if (!p.batted && ms >= LOOP_END) {
      p.batted = true;
      r.shake(BAT_SHAKE);
    }

    const rad = snowballRadius(p.snow, ms, BASE, GROW);
    if (ms < IMPACT) {
      ballAt(p, ms, to, ball);
      // the loose thread trailing behind, longer each lap
      const span = lerp(...TRAIL_MS, prog);
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      for (let j = 1; j <= TRAIL; j++) {
        ballAt(p, Math.max(0, ms - (span * j) / TRAIL), to, back);
        const w = j * WAVE * Math.sin(now * 0.03 + j * 0.9);
        ctx.lineTo(back.x + w, back.y - w);
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // its glow, hotter each lap
      ctx.globalAlpha = alpha * (0.35 + 0.5 * prog);
      drawGlow(ctx, GOLD, ball.x, ball.y, rad * (2 + 1.2 * prog));
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
      const spin = rolledAt(p.snow, ms) / Math.max(1, rad);
      drawYarn(ctx, ball.x, ball.y, rad, spin);
      // the glints on the loop, fading in, wound on as it passes
      ctx.globalAlpha = alpha * clamp01(ms / BAT_MS);
      drawSnowball(ctx, p.snow, ms, ball, Math.max(1, rad), SPECK);
      ctx.globalAlpha = alpha;
    }

    // the bats: out of the flash, then up into the readout
    drawSwipe(ctx, 0, 0, BASE * 2, ms);
    drawSwipe(ctx, p.cx, footY, rad, ms - LOOP_END);

    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    // each lap's flash at the loop's foot, each share landing in green
    for (let k = 0; k < LAPS - 1; k++) {
      const since = ms - p.lapEnds[k];
      if (since >= 0 && since < FLASH_MS) {
        const f = 1 - since / FLASH_MS;
        ctx.globalAlpha = alpha * f;
        drawGlow(ctx, WHITE, p.cx, footY, LAP_FLASH * (1.5 - 0.5 * f));
      }
      const landed = since - SPIT_MS;
      if (landed >= 0 && landed < FLASH_MS) {
        const f = 1 - landed / FLASH_MS;
        const spot = p.spitTo[k];
        ctx.globalAlpha = alpha * f;
        drawGlow(ctx, GREEN, spot.x, spot.y, SPIT_FLASH * (1.4 - 0.4 * f), 0.5);
        drawGlow(ctx, WHITE, spot.x, spot.y, SPIT_FLASH * 0.35 * f);
      }
    }
    const since = ms - IMPACT;
    if (since >= 0 && since < FLASH_MS * 2) {
      const f = 1 - since / (FLASH_MS * 2);
      ctx.globalAlpha = alpha * f;
      drawGlow(ctx, GREEN, to.x, to.y, IMPACT_FLASH * (1.4 - 0.4 * f), 0.45);
      drawGlow(ctx, WHITE, to.x, to.y, IMPACT_FLASH * 0.4 * f, 0.6);
    }
    endLightBatch(ctx);
    ctx.globalAlpha = alpha;

    // the unravelling: curls of gold thread flung off the readout
    if (since >= 0 && since < UNRAVEL_MS) {
      const u = since / UNRAVEL_MS;
      const headT = easeOut(u);
      const tailT = Math.max(0, headT - lerp(0.6, 0.25, u));
      ctx.beginPath();
      for (let i = 0; i < THREADS; i++) {
        const a = p.angles[i];
        const len = p.lengths[i];
        const ex = to.x + Math.cos(a) * len;
        const ey = to.y + Math.sin(a) * len * 0.6;
        const qx = to.x + Math.cos(a + CURL) * len * 0.55;
        const qy = to.y + Math.sin(a + CURL) * len * 0.35;
        for (let s = 0; s <= SEGS; s++) {
          const t = lerp(tailT, headT, s / SEGS);
          const v = 1 - t;
          const x = v * v * to.x + 2 * v * t * qx + t * t * ex;
          const y = v * v * to.y + 2 * v * t * qy + t * t * ey;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * (1 - u);
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      beginLightBatch(ctx);
      for (let i = 0; i < THREADS; i++) {
        const a = p.angles[i];
        const len = p.lengths[i];
        const v = 1 - headT;
        const x =
          v * v * to.x +
          2 * v * headT * (to.x + Math.cos(a + CURL) * len * 0.55) +
          headT * headT * (to.x + Math.cos(a) * len);
        const y =
          v * v * to.y +
          2 * v * headT * (to.y + Math.sin(a + CURL) * len * 0.35) +
          headT * headT * (to.y + Math.sin(a) * len * 0.6);
        stampGlimmer(
          ctx,
          x,
          y,
          SPECK * 1.4,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalAlpha = alpha;
    }
    ctx.globalCompositeOperation = previous;

    // each lap's share, one solid arch up from the loop's foot onto the readout
    for (let k = 0; k < LAPS - 1; k++) {
      const t0 = ms - p.lapEnds[k];
      if (t0 < 0 || t0 >= SPIT_MS) continue;
      const b = p.spitTo[k];
      const t = (t0 / SPIT_MS) ** 2;
      const mx = (p.cx + b.x) / 2 + (b.x < p.cx ? SPIT_BOW : -SPIT_BOW);
      const my = (footY + b.y) / 2;
      const v = 1 - t;
      TEXT.alpha = Math.min(1, t0 / 30);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        v * v * p.cx + 2 * v * t * mx + t * t * b.x,
        v * v * footY + 2 * v * t * my + t * t * b.y,
        r.flashFont * lerp(...SPIT_FONT, t),
        TEXT,
      );
    }

    drawDetonation(ctx, to, since, IMPACT_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
