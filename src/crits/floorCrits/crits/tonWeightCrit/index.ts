// Ton Weight, a floor crit: a glitter wisp perches on each bar in view and a
// cartoon iron weight whistles down onto each in turn, stretched as it falls,
// slamming flat onto the wisp (it squashes to a pancake, a white-hot contact
// line, cracks of light through the bar, glitter squirted out both sides, a
// jolt: the bar levels), then yanking back up for the next; the drops
// quicken and the slams deepen. Then it yanks up highest, hangs trembling as
// light streaks in and the rumble rises, and drops onto its own bar's wisp in
// the hardest slam of all, one big blast
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
  chargeAt,
  drawChargeGlow,
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
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
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

const IN_MS = 160;
const FIRST_DROP_MS = 320;
// the drops' gaps closing from first to last, squeezed to fit DROP_BUDGET ms
// when many bars are in view; at least MIN_DROPS before its own bar's
const GAPS: [number, number] = [340, 170];
const DROP_BUDGET = 1000;
const MIN_DROPS = 3;
// each gap: held down HOLD_MS, yanked up over UP_SHARE of it, hovering, then
// whistling down over DROP_MS; the last rises over RISE of FINAL_MS, hangs,
// and drops over FINAL_DROP_MS
const HOLD_MS = 40;
const UP_SHARE = 0.4;
const DROP_MS = 80;
const FINAL_MS = 720;
const RISE = 0.28;
const FINAL_DROP_MS = 120;
const FINAL_STRETCH = 0.6;
// each drop from this high over its wisp, first to last; the last from the sky
const HOVER: [number, number] = [190, 300];
const ENTER = 160;
const SKY_ABOVE = 560;
const TREMBLE = 14;
// the weight: W wide, H tall with its handle, the body from BODY_TOP down
const W = 170;
const H = 150;
const BODY_TOP = 48;
const PAD = 14;
const SPRITE_RES = 1.5;
// the wisps: perched this share of the bar's half width either side of its
// middle (first to last), squashed to PANCAKE under the weight
const SIDE: [number, number] = [0.42, 0.14];
const WISP_SCALE = 1.5;
const WISP_R = 34;
const FLAT = 8;
const PANCAKE = 0.14;
const PANCAKE_MS = 150;
// each slam on the bar
const POWER: [number, number] = [0.5, 1.15];
const CONTACT_W = W * 1.4;
const STRAIN_MS = 280;
const STRAIN_SIZE = 140;
const FLASH_MS = 170;
const STREAK_LEN = 220;
// the climax
const BURST = 620;
const BLAST = 440;
const BIG_FLASH = 620;
const BIG_FLASH_MS = 260;
const FINAL_STRAIN_MS = 520;
const REST_MS = 60;
const FADE_MS = 220;
const TAIL_MS = DETONATION_MS + 100;
const SHAKES = [0.25, 0.8];

const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);

// the iron weight, drawn once: a handle loop over a trapezoid block with a
// gold plate, bold black outlines
let sprite: HTMLCanvasElement | null = null;
function weightSprite(): HTMLCanvasElement {
  if (sprite) return sprite;
  const c = document.createElement("canvas");
  c.width = Math.ceil((W + PAD * 2) * SPRITE_RES);
  c.height = Math.ceil((H + PAD * 2) * SPRITE_RES);
  const g = c.getContext("2d")!;
  g.scale(SPRITE_RES, SPRITE_RES);
  g.translate(PAD, PAD);
  g.lineJoin = "round";
  g.lineCap = "round";
  // the handle loop
  g.beginPath();
  g.ellipse(W / 2, 38, 30, 30, 0, 0, Math.PI * 2);
  g.strokeStyle = "#000";
  g.lineWidth = 26;
  g.stroke();
  g.strokeStyle = "#4b5260";
  g.lineWidth = 14;
  g.stroke();
  g.beginPath();
  g.ellipse(W / 2, 38, 30, 30, 0, Math.PI * 1.1, Math.PI * 1.5);
  g.strokeStyle = "#aab2c0";
  g.lineWidth = 4;
  g.stroke();
  // the block
  const top = W * 0.32;
  g.beginPath();
  g.moveTo(W / 2 - top, BODY_TOP);
  g.lineTo(W / 2 + top, BODY_TOP);
  g.lineTo(W - 4, H - 4);
  g.lineTo(4, H - 4);
  g.closePath();
  const fill = g.createLinearGradient(0, 0, W, 0);
  fill.addColorStop(0, "#7d8697");
  fill.addColorStop(0.45, "#4b5260");
  fill.addColorStop(1, "#2a2e36");
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = "#000";
  g.lineWidth = 8;
  g.stroke();
  // a glossy edge down its left
  g.beginPath();
  g.moveTo(W / 2 - top + 12, BODY_TOP + 10);
  g.lineTo(18, H - 16);
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 8;
  g.stroke();
  // the gold plate
  g.beginPath();
  g.roundRect(W * 0.3, BODY_TOP + 34, W * 0.4, 34, 8);
  g.fillStyle = COLOR.heavenlyGold;
  g.fill();
  g.strokeStyle = "#000";
  g.lineWidth = 5;
  g.stroke();
  g.beginPath();
  g.moveTo(W * 0.34, BODY_TOP + 42);
  g.lineTo(W * 0.5, BODY_TOP + 42);
  g.strokeStyle = "rgba(255,255,255,0.7)";
  g.lineWidth = 4;
  g.stroke();
  sprite = c;
  return c;
}

// planned at launch: the bars it drops on in turn, its own last
const order: number[] = [];
let crush: Crush = planCrush(0, 2, GAPS);
let charge: Charge = planCharge(0, 1);
let hangStart = 0;
// kept each frame: each wisp's spot on its bar's top, the sky
const spots: Point[] = [];
let sky = 0;
// the weight's bottom middle this frame, and how far into a drop (-1 not)
let wx = 0;
let wy = 0;
let dropU = -1;
const scale: Point = { x: 1, y: 1 };
const shake: Point = { x: 0, y: 0 };
const here: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
// a perched wisp, drawn under its spot's own transform
const perch: Point = { x: 0, y: -WISP_R };
const perchAt = () => perch;

// the last slam at or before t, -1 before the first
function slamBefore(t: number): number {
  const slams = crush.slams;
  let k = -1;
  while (k + 1 < slams.length && t >= slams[k + 1]) k++;
  return k;
}

// the weight at ms, k the last slam landed: held down, yanked up over the
// next wisp, hovering, then whistling down onto it
function weightAt(ms: number, k: number): void {
  const slams = crush.slams;
  const last = slams.length - 1;
  dropU = -1;
  if (k >= last) {
    wx = spots[last].x;
    wy = spots[last].y - FLAT;
    return;
  }
  const n = k + 1;
  const t1 = slams[n];
  const t0 = k < 0 ? IN_MS : slams[k];
  const gap = Math.max(1, t1 - t0);
  const drop = n === last ? FINAL_DROP_MS : Math.min(DROP_MS, gap * 0.4);
  const dropStart = t1 - drop;
  const leave = t0 + (k < 0 ? 0 : Math.min(HOLD_MS, gap * 0.15));
  const upEnd = Math.min(
    dropStart,
    leave + gap * (n === last ? RISE : UP_SHARE),
  );
  const target = spots[n];
  const restY = target.y - FLAT;
  const hoverY =
    n === last
      ? sky
      : restY - lerp(HOVER[0], HOVER[1], n / Math.max(1, last - 1));
  const fx = k < 0 ? target.x : spots[k].x;
  const fy = k < 0 ? hoverY - ENTER : spots[k].y - FLAT;
  if (ms < leave) {
    wx = fx;
    wy = fy;
  } else if (ms < upEnd) {
    const q = 1 - (1 - (ms - leave) / Math.max(1, upEnd - leave)) ** 3;
    wx = lerp(fx, target.x, q);
    wy = lerp(fy, hoverY, q);
  } else if (ms < dropStart) {
    wx = target.x;
    wy = hoverY;
  } else {
    dropU = clamp01((ms - dropStart) / drop);
    wx = target.x;
    wy = lerp(hoverY, restY, dropU * dropU);
  }
}

registerFloorCrit("tonWeightCrit", {
  plan(_r, bars, hit) {
    order.length = 0;
    if (bars.length > 1)
      for (const bar of byHeight(bars)) if (bar !== 0) order.push(bar);
    while (order.length < MIN_DROPS) order.unshift(0);
    order.push(0);
    while (spots.length < order.length) spots.push({ x: 0, y: 0 });
    const drops = order.length - 1;
    let sum = 0;
    for (let k = 0; k < drops - 1; k++)
      sum += lerp(GAPS[0], GAPS[1], k / Math.max(1, drops - 2));
    const fit = Math.min(1, DROP_BUDGET / Math.max(1, sum));
    crush = planCrush(
      IN_MS + FIRST_DROP_MS,
      order.length,
      [GAPS[0] * fit, GAPS[1] * fit],
      FINAL_MS / (GAPS[1] * fit),
      {
        slamMs: DROP_MS,
        shake: [0.4, 1.3],
        buzz: [15, 40],
        climaxShake: 3.8,
      },
    );
    const slams = crush.slams;
    const t0 = slams[drops - 1];
    const gap = Math.max(1, slams[drops] - t0);
    hangStart = t0 + Math.min(HOLD_MS, gap * 0.15) + gap * RISE;
    const hangEnd = Math.max(hangStart + 1, slams[drops] - FINAL_DROP_MS);
    charge = planCharge(hangStart, hangEnd - hangStart, {
      shake: [0.1, 0.7],
      buzz: [6, 40],
      everyMs: [140, 45],
      climaxShake: 0.3,
      bang: false,
    });
    for (let k = 0; k < drops; k++) hit(order[k], slams[k], 0);
    hit(0, slams[drops], 1);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const slams = crush.slams;
    const last = slams.length - 1;
    const end = slams[last];
    const halfW = r.play.barHalfWidth;
    for (let k = 0; k <= last; k++) {
      const bar = bars[order[k]] ?? bars[0];
      const side =
        k === last
          ? 0
          : (k % 2 ? 1 : -1) * lerp(SIDE[0], SIDE[1], k / Math.max(1, last));
      spots[k].x = bar.x + side * halfW;
      spots[k].y = bar.y - BAR_HALF_H;
    }
    sky = Math.min(skyY(r, bars, SKY_ABOVE), spots[last].y - SKY_ABOVE * 0.6);
    tickCrush(crush, ms, r.shake);
    tickCharge(charge, ms, r.shake);

    // the number shrinking away as the wisps light up
    if (ms < IN_MS) {
      const t = (ms / IN_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, 0, 0, lerp(r.flashFont, 0, t), {
        alpha: 1 - t,
      });
    }

    const k = slamBefore(ms);
    weightAt(ms, k);
    const c = ms >= hangStart && ms < end ? chargeAt(charge, ms) : 0;
    if (c > 0 && dropU < 0) {
      trembleAt(c, ms, TREMBLE, shake);
      wx += shake.x;
      wy += shake.y;
    }

    // the wisps, each squashed as the weight lands on it, then a pancake
    const appear = clamp01((ms - IN_MS * 0.5) / 200);
    for (let j = 0; j <= last; j++) {
      const since = ms - slams[j];
      if (since >= PANCAKE_MS) continue;
      const spot = spots[j];
      let sy = 1;
      if (since >= 0) sy = PANCAKE;
      else if (j === k + 1)
        sy = Math.max(PANCAKE, Math.min(1, (spot.y - wy) / (2 * WISP_R)));
      const sx = Math.min(2.6, 1 / Math.sqrt(sy));
      const alpha = since >= 0 ? 1 - since / PANCAKE_MS : appear;
      const heat = j === last ? c : 0;
      ctx.save();
      ctx.translate(spot.x, spot.y);
      ctx.scale(sx, sy);
      drawWispHead(
        ctx,
        perchAt,
        ms,
        now,
        WISP_SIZE * WISP_SCALE * (1 + 0.4 * heat),
        heat,
        alpha,
      );
      ctx.restore();
    }

    // the slam it just landed: cracks through the bar, contact line, a flash
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
        drawGlow(ctx, WHITE, at.x, at.y, W * (0.8 + 0.6 * t));
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previous;
      }
    }

    // the weight: its glow, the hang's charge, its fall streaks, the block
    crusherScale(crush, ms, scale);
    if (k === last - 1 && dropU >= 0) {
      scale.y *= 1 + FINAL_STRETCH * dropU;
      scale.x /= Math.sqrt(1 + FINAL_STRETCH * dropU);
    }
    const fade =
      clamp01(ms / IN_MS) * (1 - clamp01((ms - end - REST_MS) / FADE_MS));
    if (fade > 0) {
      const tall = H * scale.y;
      here.x = wx;
      here.y = wy - tall * 0.45;
      if (c > 0) {
        drawChargeStreaks(ctx, here, c, lerp(260, 420, c), ms);
        drawChargeGlow(ctx, here, c, W * 2.6, now);
        const target = spots[last];
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.6 * c * (0.8 + 0.2 * Math.sin(now * 0.06));
        drawGlow(ctx, GOLD, target.x, target.y, W * (0.6 + 0.8 * c));
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previous;
      }
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (0.35 + 0.4 * c) * fade;
      drawGlow(ctx, GOLD, here.x, here.y, W * (0.85 + 0.5 * c));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
      if (dropU >= 0) {
        const len = STREAK_LEN * (0.5 + dropU);
        for (let s = -1; s <= 1; s += 2) {
          from.x = to.x = wx + s * W * 0.3 * scale.x;
          from.y = wy - tall - len;
          to.y = wy - tall * 0.5;
          drawBeam(ctx, from, to, 12, 0.75 * dropU * fade);
        }
      }
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(wx, wy);
      ctx.scale(scale.x, scale.y);
      ctx.drawImage(
        weightSprite(),
        -W / 2 - PAD,
        -H - PAD,
        W + PAD * 2,
        H + PAD * 2,
      );
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
