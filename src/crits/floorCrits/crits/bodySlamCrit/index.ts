// Body Slam, a floor crit: the number balls up into a big heavyweight wisp
// that leaps from bar to bar down the bars in view, springing up stretched
// and belly-flopping flat onto each (a white-hot contact line, cracks of
// light through the bar, glitter squirted out, a jolt: the bar levels), the
// leaps quickening and the slams deepening; then it bounds sky-high off the
// last, hangs there trembling and swelling as light streaks in, and drops
// onto its own bar in the hardest slam of all, flattening in one big blast
import { COLOR } from "../../../../palette";
import {
  crusherScale,
  drawCrushBurst,
  drawCrushContact,
  drawCrushStrain,
  planCrush,
  tickCrush,
  type Crush,
} from "../../../../shared/animationStyles/crush";
import {
  drawChargeGlow,
  drawChargeStreaks,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import {
  drawWispHead,
  drawWispTrail,
  WISP_SIZE,
  WISP_TRAIL_MS,
} from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  byHeight,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, skyY } from "../../critPlayer/shared";

const IN_MS = 180;
const FIRST_LEAP_MS = 300;
// the hops' gaps closing from first to last, squeezed to fit HOP_BUDGET ms
// when many bars are in view; at least MIN_HOPS of them
const GAPS: [number, number] = [340, 170];
const HOP_BUDGET = 1000;
const MIN_HOPS = 3;
// the last leap: rising sky-high to RISE of it, hanging to HANG_END, dropping
const FINAL_MS = 720;
const RISE = 0.34;
const HANG_END = 0.82;
const SKY_ABOVE = 520;
const TREMBLE = 16;
// each hop's apex over its line, first to last; landings this share of the
// bar's half width either side of its middle
const HOP_HEIGHT: [number, number] = [280, 170];
const SIDE = 0.32;
// the heavyweight: body radius, wisp scale growing as it charges
const R = 64;
const WISP: [number, number] = [2.4, 3.2];
const DROP_STRETCH = 0.7;
const SWELL = 0.3;
// each slam on the bar
const POWER: [number, number] = [0.45, 1.1];
const CONTACT_W = R * 3.2;
const STRAIN_MS = 280;
const STRAIN_SIZE = 150;
const FLASH_MS = 180;
// the climax
const BURST = 620;
const BLAST = 440;
const BIG_FLASH = 640;
const BIG_FLASH_MS = 260;
const FINAL_STRAIN_MS = 520;
const FADE_MS = 240;
const TAIL_MS = DETONATION_MS + 100;
const SHAKES = [0.25, 0.8];

const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);

// planned at launch: the bars it lands on in turn, its own last
const order: number[] = [];
let crush: Crush = planCrush(0, 2, GAPS);
// kept each frame: each landing on its bar's top, the sky, the half width
const spots: Point[] = [];
const start: Point = { x: 0, y: 0 };
let sky = 0;
// subtracted from bodyAt while the head draws under its own transform
let localX = 0;
let localY = 0;
const slots: Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];
let slot = 0;
const scale: Point = { x: 1, y: 1 };
const here: Point = { x: 0, y: 0 };

// the last slam at or before t, -1 before the first
function slamBefore(t: number): number {
  const slams = crush.slams;
  let k = -1;
  while (k + 1 < slams.length && t >= slams[k + 1]) k++;
  return k;
}

// how far into the hang (0..1) at t, 0 outside it
function hangAt(t: number): number {
  const slams = crush.slams;
  const last = slams.length - 1;
  const t0 = slams[last - 1];
  const p = (t - t0) / (slams[last] - t0);
  if (p < RISE || p >= 1) return 0;
  return clamp01((p - RISE) / (HANG_END - RISE));
}

// the body's middle at t, sitting on each landing, leaping between them
function bodyAt(t: number): Point | null {
  slot = (slot + 1) & 3;
  const p = slots[slot];
  const slams = crush.slams;
  const last = slams.length - 1;
  if (t < IN_MS) {
    p.x = start.x - localX;
    p.y = start.y - localY;
    return p;
  }
  const k = slamBefore(t);
  if (k >= last) {
    p.x = spots[last].x - localX;
    p.y = spots[last].y - R - localY;
    return p;
  }
  const from = k < 0 ? start : spots[k];
  const fromY = k < 0 ? start.y : from.y - R;
  const to = spots[k + 1];
  const toY = to.y - R;
  const t0 = k < 0 ? IN_MS : slams[k];
  const u = (t - t0) / (slams[k + 1] - t0);
  if (k + 1 === last) {
    if (u < RISE) {
      const q = 1 - (1 - u / RISE) ** 2;
      p.x = lerp(from.x, to.x, q);
      p.y = lerp(fromY, sky, q);
    } else if (u < HANG_END) {
      const amp = TREMBLE * ((u - RISE) / (HANG_END - RISE));
      p.x = to.x + amp * Math.sin(t * 0.13);
      p.y = sky + amp * Math.sin(t * 0.19 + 1);
    } else {
      p.x = to.x;
      p.y = lerp(sky, toY, ((u - HANG_END) / (1 - HANG_END)) ** 2);
    }
  } else {
    const height = lerp(
      HOP_HEIGHT[0],
      HOP_HEIGHT[1],
      (k + 1) / Math.max(1, last - 1),
    );
    p.x = lerp(from.x, to.x, u);
    p.y = lerp(fromY, toY, u) - height * 4 * u * (1 - u);
  }
  p.x -= localX;
  p.y -= localY;
  return p;
}

registerFloorCrit("bodySlamCrit", {
  plan(_r, bars, hit) {
    order.length = 0;
    if (bars.length > 1)
      for (const bar of byHeight(bars)) if (bar !== 0) order.push(bar);
    while (order.length < MIN_HOPS) order.unshift(0);
    order.push(0);
    while (spots.length < order.length) spots.push({ x: 0, y: 0 });
    const hops = order.length - 1;
    let sum = 0;
    for (let k = 0; k < hops - 1; k++)
      sum += lerp(GAPS[0], GAPS[1], k / Math.max(1, hops - 2));
    const fit = Math.min(1, HOP_BUDGET / Math.max(1, sum));
    crush = planCrush(
      IN_MS + FIRST_LEAP_MS,
      order.length,
      [GAPS[0] * fit, GAPS[1] * fit],
      FINAL_MS / (GAPS[1] * fit),
      { shake: [0.4, 1.3], buzz: [15, 40], climaxShake: 3.6 },
    );
    for (let k = 0; k < hops; k++) hit(order[k], crush.slams[k], 0);
    hit(0, crush.slams[hops], 1);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const slams = crush.slams;
    const last = slams.length - 1;
    const end = slams[last];
    const halfW = r.play.barHalfWidth;
    for (let k = 0; k <= last; k++) {
      const bar = bars[order[k]] ?? bars[0];
      const side = k === last ? 0 : k % 2 ? SIDE : -SIDE;
      spots[k].x = bar.x + side * halfW;
      spots[k].y = bar.y - BAR_HALF_H;
    }
    sky = Math.min(skyY(r, bars, SKY_ABOVE), spots[last].y - SKY_ABOVE * 0.6);
    tickCrush(crush, ms, r.shake);

    // the number balling up into the heavyweight
    if (ms < IN_MS) {
      const t = (ms / IN_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, 0, 0, lerp(r.flashFont, 0, t), {
        alpha: 1 - t,
      });
    }

    // the slam it just landed: contact line, cracks through the bar, a flash
    const k = slamBefore(ms);
    if (k >= 0 && k < last) {
      const since = ms - slams[k];
      const at = spots[k];
      const t = k / Math.max(1, last - 1);
      if (since < STRAIN_MS)
        drawCrushStrain(
          ctx,
          at,
          Math.PI / 2,
          CONTACT_W,
          (0.45 + 0.55 * t) * (1 - since / STRAIN_MS),
          STRAIN_SIZE,
          now,
        );
      drawCrushContact(
        ctx,
        at,
        Math.PI / 2,
        CONTACT_W,
        since,
        lerp(POWER[0], POWER[1], t),
        now,
      );
      if (since < FLASH_MS) {
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = (1 - since / FLASH_MS) ** 2;
        drawGlow(ctx, WHITE, at.x, at.y, R * (2 + 1.5 * t));
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previous;
      }
    }

    // the hang: light streaking in, its own bar's landing glowing up
    const c = hangAt(ms);
    const head = ms < end + FADE_MS ? bodyAt(ms) : null;
    if (c > 0 && head) {
      here.x = head.x;
      here.y = head.y;
      drawChargeStreaks(ctx, here, c, lerp(260, 420, c), ms);
      drawChargeGlow(ctx, here, c, R * 5, now);
      const target = spots[last];
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.6 * c * (0.8 + 0.2 * Math.sin(now * 0.06));
      drawGlow(ctx, GOLD, target.x, target.y, R * (1.5 + 1.5 * c));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }

    // the heavyweight: trail, then a round gold body under its own squash
    const size = WISP_SIZE * lerp(WISP[0], WISP[1], c);
    if (ms >= IN_MS * 0.5 && ms < end + WISP_TRAIL_MS)
      drawWispTrail(ctx, bodyAt, ms, now, size);
    if (head) {
      const grow = clamp01(ms / IN_MS);
      const fade = 1 - clamp01((ms - end) / FADE_MS);
      crusherScale(crush, ms, scale);
      if (k === last - 1) {
        const t0 = slams[last - 1];
        const u = (ms - t0) / (end - t0);
        if (u >= HANG_END) {
          const q = (u - HANG_END) / (1 - HANG_END);
          scale.y *= 1 + DROP_STRETCH * q;
          scale.x /= Math.sqrt(1 + DROP_STRETCH * q);
        }
      }
      const swell = grow * (1 + SWELL * c);
      const hx = head.x;
      const hy = head.y;
      ctx.save();
      ctx.translate(hx, hy + R);
      ctx.scale(scale.x * swell, scale.y * swell);
      ctx.translate(0, -R);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.75 * fade;
      drawGlow(ctx, GOLD, 0, 0, R * 1.7);
      ctx.globalAlpha = (0.5 + 0.5 * c) * fade;
      drawGlow(ctx, WHITE, 0, 0, R * 0.9);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
      localX = hx;
      localY = hy;
      drawWispHead(ctx, bodyAt, ms, now, size, 0.3 + 0.7 * c, fade);
      localX = 0;
      localY = 0;
      ctx.restore();
    }

    // the climax on its own bar
    const since = ms - end;
    if (since >= 0) {
      const at = spots[last];
      if (since < FINAL_STRAIN_MS)
        drawCrushStrain(
          ctx,
          at,
          Math.PI / 2,
          CONTACT_W * 1.6,
          1 - since / FINAL_STRAIN_MS,
          STRAIN_SIZE * 1.8,
          now,
        );
      drawCrushBurst(ctx, at, Math.PI / 2, BURST, since, now);
      if (since < BIG_FLASH_MS) {
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = (1 - since / BIG_FLASH_MS) ** 2;
        drawGlow(ctx, WHITE, at.x, at.y, BIG_FLASH);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previous;
      }
      drawDetonation(ctx, at, since, BLAST, now);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
