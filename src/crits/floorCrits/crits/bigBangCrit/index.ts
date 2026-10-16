// the big bang floor crit: the number shrinks into a single point of white
// light hanging between the bars in view at their middle; light streaks in
// to it from every bar, faster and faster, the point trembling, flickering
// and compressing smaller and brighter as the rumble rises; at the climax it
// bangs, a ring shockwave tearing outward at speed and hitting each bar as
// it reaches it, nearest first (a flash, a jolt, debris flung off it, the
// bar levelling), its own bar's hit the biggest blast and hardest shake
import { COLOR } from "../../../../palette";
import {
  chargeAt,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
  byHeight,
} from "../../critPlayer";
import { skyY } from "../../critPlayer/shared";

const BB_IN_MS = 200;
const BB_CHARGE_AT = 100;
const BB_CHARGE_MS = 1200;
const BB_BANG_AT = BB_CHARGE_AT + BB_CHARGE_MS;
// alone in view, the point hangs this far above its bar
const BB_ABOVE = 170;
const BB_MIN_ABOVE = 110;
const BB_TREMBLE = 10;
// the point's core and halo, from an empty charge to a full one: it
// compresses as it charges
const BB_CORE: [number, number] = [34, 9];
const BB_HALO: [number, number] = [190, 90];
const BB_FLARE: [number, number] = [30, 300];
const BB_WISP: [number, number] = [1.3, 0.45];
const BB_STREAK_REACH: [number, number] = [180, 320];
// streaks in from every bar: this many each, quickening (cycles per ms)
const BB_FEEDS = 4;
const BB_MAX_FEED_BARS = 12;
const BB_FEED_SPEED: [number, number] = [0.0012, 0.0065];
const BB_FEED_TAIL = 0.28;
// the shockwave: crosses to its furthest bar in this long at most
const BB_RING_REACH_MS = 240;
const BB_RING_MIN_SPEED = 2.6;
const BB_RING_MS = 520;
const BB_BANG_FLASH_MS = 240;
const BB_BANG_FLASH = 900;
const BB_BANG_BLAST = 320;
// a bar it hits: a flare along it, glints running out along it with the
// ring, debris flung off it away from the bang
const BB_HIT_MS = 380;
const BB_SPARKS = 14;
const BB_SPARK_REACH = 240;
const BB_OWN_BLAST = 520;
const BB_SHAKES = [1.2, 3.8];
const BB_TAIL_MS = DETONATION_MS + 60;

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);
const RING_GOLD = COLOR.heavenlyGold;
const RING_WHITE = COLOR.white;
const TAU = Math.PI * 2;

// each feed streak's start along its bar (-1..1 of the half width) and lag
const FEED_X: number[] = [];
const FEED_LAG: number[] = [];
for (let j = 0; j < BB_MAX_FEED_BARS * BB_FEEDS; j++) {
  FEED_X.push(hash01(j, 21) * 2 - 1);
  FEED_LAG.push(hash01(j, 22));
}
// each debris spark's heading (sideways, and off the bar) and reach
const SPARK_DX: number[] = [];
const SPARK_DY: number[] = [];
const SPARK_REACH: number[] = [];
for (let j = 0; j < BB_SPARKS; j++) {
  const a = (hash01(j, 31) - 0.5) * 2.6;
  SPARK_DX.push(Math.sin(a) * 1.4);
  SPARK_DY.push(Math.cos(a));
  SPARK_REACH.push(0.45 + 0.55 * hash01(j, 32));
}

// planned at launch: the bars top to bottom, when the ring hits each, and
// how fast it runs
const order: number[] = [];
const hitAt: number[] = [];
let ringSpeed = BB_RING_MIN_SPEED;
let charge: Charge = planCharge(BB_CHARGE_AT, BB_CHARGE_MS);
// the point, kept each frame for pointAt
const center: Point = { x: 0, y: 0 };
const slots: Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];
let slot = 0;
const here: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };

// between the two middle bars in view, or above its bar when it's alone
function placeCenter(r: Running, bars: Point[]): void {
  const n = order.length;
  if (n >= 2 && bars.length >= 2) {
    const k = n >> 1;
    const a = bars[order[k - 1]] ?? bars[0];
    const b = bars[order[k]] ?? bars[bars.length - 1];
    center.x = (a.x + b.x) / 2;
    center.y = (a.y + b.y) / 2;
    return;
  }
  if (bars.length === 0) return;
  center.x = bars[0].x;
  center.y = Math.min(skyY(r, bars, BB_ABOVE), bars[0].y - BB_MIN_ABOVE);
}

function pointAt(t: number): Point | null {
  if (t < BB_CHARGE_AT || t > BB_BANG_AT) return null;
  slot = (slot + 1) & 3;
  const p = slots[slot];
  trembleAt(chargeAt(charge, t), t, BB_TREMBLE, p);
  p.x += center.x;
  p.y += center.y;
  return p;
}

// how far the feed streaks have run by ms: their speed integrated over a
// charge that builds as its time share squared
function feedPhase(ms: number): number {
  const dt = Math.max(0, Math.min(BB_CHARGE_MS, ms - BB_CHARGE_AT));
  const x = dt / BB_CHARGE_MS;
  return (
    BB_FEED_SPEED[0] * dt +
    ((BB_FEED_SPEED[1] - BB_FEED_SPEED[0]) * BB_CHARGE_MS * x * x * x) / 3
  );
}

function drawCharging(
  ctx: CanvasRenderingContext2D,
  r: Running,
  c: number,
  ms: number,
  now: number,
  bars: Point[],
): void {
  const { x, y } = here;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  // light streaking in from every bar in view
  const phase = feedPhase(ms);
  const half = r.play.barHalfWidth;
  const feeds = Math.min(order.length, BB_MAX_FEED_BARS);
  const width = 6 + 8 * c;
  const alpha = 0.3 + 0.7 * c;
  for (let k = 0; k < feeds; k++) {
    const bar = order[k];
    if (bar >= bars.length) continue;
    const at = bars[bar];
    for (let j = 0; j < BB_FEEDS; j++) {
      const i = k * BB_FEEDS + j;
      const u = (phase + j / BB_FEEDS + FEED_LAG[i] * 0.5) % 1;
      const head = u * u;
      const tail = Math.max(0, head - BB_FEED_TAIL);
      const sx = at.x + FEED_X[i] * half * 0.9;
      from.x = lerp(sx, x, tail);
      from.y = lerp(at.y, y, tail);
      to.x = lerp(sx, x, head);
      to.y = lerp(at.y, y, head);
      drawBeam(ctx, from, to, width, alpha * Math.min(1, u * 4));
    }
  }
  endLightBatch(ctx);
  drawChargeStreaks(
    ctx,
    here,
    c,
    lerp(BB_STREAK_REACH[0], BB_STREAK_REACH[1], c),
    ms,
  );
  // a lens flare stretching out across it as it brightens
  const flicker = 0.7 + 0.3 * hash01(Math.floor(now / 34), 7);
  const flare = lerp(BB_FLARE[0], BB_FLARE[1], c);
  from.x = x - flare;
  to.x = x + flare;
  from.y = to.y = y;
  drawBeam(ctx, from, to, 6 + 10 * c, (0.3 + 0.7 * c) * flicker);
  beginLightBatch(ctx);
  // the halo and core shrinking in, hotter and whiter as they go
  const core = lerp(BB_CORE[0], BB_CORE[1], c);
  ctx.globalAlpha = (0.35 + 0.5 * c) * flicker;
  drawGlow(ctx, GOLD, x, y, lerp(BB_HALO[0], BB_HALO[1], c));
  ctx.globalAlpha = Math.min(1, 0.5 + 0.5 * c) * flicker;
  drawGlow(ctx, WHITE, x, y, core * 3);
  ctx.globalAlpha = 1;
  drawGlow(ctx, WHITE, x, y, core * (1.2 + 0.4 * c));
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

function drawRing(ctx: CanvasRenderingContext2D, since: number): void {
  if (since < 0 || since >= BB_RING_MS) return;
  const t = since / BB_RING_MS;
  const left = 1 - t;
  const radius = Math.max(0, ringSpeed * since);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = RING_GOLD;
  ctx.globalAlpha = 0.5 * left;
  ctx.lineWidth = lerp(60, 14, t);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.35 * left;
  ctx.lineWidth = lerp(24, 6, t);
  ctx.beginPath();
  ctx.arc(center.x, center.y, Math.max(0, radius * 0.82), 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = RING_WHITE;
  ctx.globalAlpha = left;
  ctx.lineWidth = lerp(16, 4, t);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

// each bar the ring hits: a flare along it, glints running out along it
// with the ring and debris flung off it away from the bang
function drawHits(
  ctx: CanvasRenderingContext2D,
  r: Running,
  ms: number,
  bars: Point[],
  now: number,
): void {
  const half = r.play.barHalfWidth;
  const radius = ringSpeed * (ms - BB_BANG_AT);
  for (let k = 0; k < order.length; k++) {
    const bar = order[k];
    const since = ms - hitAt[bar];
    if (since < 0 || since >= BB_HIT_MS || bar >= bars.length) continue;
    const left = 1 - since / BB_HIT_MS;
    const at = bars[bar];
    from.x = at.x - half;
    from.y = to.y = at.y;
    to.x = at.x + half;
    drawBeam(ctx, from, to, (bar === 0 ? 170 : 110) * left, left);
  }
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let k = 0; k < order.length; k++) {
    const bar = order[k];
    const since = ms - hitAt[bar];
    if (since < 0 || since >= BB_HIT_MS || bar >= bars.length) continue;
    const t = since / BB_HIT_MS;
    const left = 1 - t;
    const own = bar === 0;
    const y = bars[bar].y;
    const away = y >= center.y ? 1 : -1;
    ctx.globalAlpha = left * left;
    drawGlow(ctx, WHITE, center.x, y, (own ? 560 : 280) * left);
    // where the ring crosses the bar, running out to its ends
    const dy = y - center.y;
    const off = Math.min(
      half,
      Math.sqrt(Math.max(0, radius * radius - dy * dy)),
    );
    ctx.globalAlpha = left;
    stampGlimmer(ctx, center.x - off, y, 70 * left, now * 0.01, COLOR.white);
    stampGlimmer(
      ctx,
      center.x + off,
      y,
      70 * left,
      now * 0.01 + 1,
      COLOR.white,
    );
    const out = Math.sqrt(t) * BB_SPARK_REACH * (own ? 1.6 : 1);
    for (let j = 0; j < BB_SPARKS; j++) {
      const reach = out * SPARK_REACH[j];
      stampGlimmer(
        ctx,
        center.x + SPARK_DX[j] * reach,
        y + away * SPARK_DY[j] * reach + 110 * t * t,
        (own ? 34 : 24) * left,
        now * 0.006 + j,
        j % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
  }
  endLightBatch(ctx);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

registerFloorCrit("bigBangCrit", {
  plan(r, bars, hit) {
    order.length = 0;
    for (const bar of byHeight(bars)) order.push(bar);
    hitAt.length = bars.length;
    placeCenter(r, bars);
    let furthest = 0;
    for (let i = 0; i < bars.length; i++)
      furthest = Math.max(furthest, Math.abs(bars[i].y - center.y));
    ringSpeed = Math.max(BB_RING_MIN_SPEED, furthest / BB_RING_REACH_MS);
    charge = planCharge(BB_CHARGE_AT, BB_CHARGE_MS, {
      shake: [0.1, 1],
      everyMs: [200, 45],
      climaxShake: 2.4,
      bang: false,
    });
    for (let i = 0; i < bars.length; i++) {
      hitAt[i] = BB_BANG_AT + Math.abs(bars[i].y - center.y) / ringSpeed;
      hit(i, hitAt[i], i === 0 ? 1 : 0);
    }
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    placeCenter(r, bars);
    tickCharge(charge, ms, r.shake);
    if (ms >= BB_BANG_AT && r.kicked === 0) {
      r.kicked = 1;
      playExplosion();
    }
    const ownAt = hitAt[0] ?? BB_BANG_AT;
    if (ms >= ownAt && r.kicked === 1 && ownAt - BB_BANG_AT > 60) {
      r.kicked = 2;
      playExplosion();
    }

    // the number shrinking into the point
    if (ms < BB_IN_MS) {
      const t = (ms / BB_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        center.x * t,
        center.y * t,
        lerp(r.flashFont, 0, t),
      );
    }

    const c = chargeAt(charge, ms);
    if (ms < BB_BANG_AT) {
      const at = pointAt(ms);
      if (at) {
        here.x = at.x;
        here.y = at.y;
        drawCharging(ctx, r, c, ms, now, bars);
      }
    }
    drawWispBetween(
      ctx,
      pointAt,
      ms,
      now,
      WISP_SIZE * lerp(BB_WISP[0], BB_WISP[1], c),
      c,
      BB_CHARGE_AT,
      BB_BANG_AT,
    );

    // the bang: a white-out flash at the point, the ring tearing outward
    const since = ms - BB_BANG_AT;
    if (since >= 0 && since < BB_BANG_FLASH_MS) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (1 - since / BB_BANG_FLASH_MS) ** 2;
      drawGlow(ctx, WHITE, center.x, center.y, BB_BANG_FLASH);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }
    drawRing(ctx, since);
    drawHits(ctx, r, ms, bars, now);
    drawDetonation(ctx, center, since, BB_BANG_BLAST, now);
    if (bars.length > 0) {
      here.x = center.x;
      here.y = bars[0].y;
      drawDetonation(ctx, here, ms - ownAt, BB_OWN_BLAST, now);
    }
  },
  tailMs: BB_TAIL_MS,
  shake: (step) => BB_SHAKES[step] ?? BB_SHAKES[0],
});
