// Moon Boots, a floor crit: the number balls up into a wisp in two chunky
// spring-boots that bounds up the bars in view from the bottom to the top.
// Every landing crushes its coils flat (a flattened flash, a shock ring and a
// ring of glitter kicked off the bar, a jolt: the bar levels), every spring-off
// higher and quicker, the boots glowing orange to white-hot. From the top bar
// it springs sky-high, flips as light streaks in, and stomps down onto its
// own bar in one big blast
import { COLOR } from "../../../../palette";
import {
  drawBounceSplash,
  type Bounce,
} from "../../../../shared/animationStyles/bounce";
import {
  drawChargeGlow,
  drawChargeStreaks,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { buzz } from "../../../../shared/vibration";
import {
  drawGlitterLight,
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

const IN_MS = 150;
// each climbing leg, first to last, squeezed to fit CLIMB_BUDGET; the
// crouch on the springs at its start (none on the first, from the number)
const GAPS: [number, number] = [330, 190];
const CROUCH: [number, number] = [80, 50];
const CLIMB_BUDGET = 1050;
const MAX_CLIMB = 7;
// each hop's arc over its chord, plus half the height it climbs
const LIFT: [number, number] = [150, 260];
const SIDE = 0.3;
// the last leap: a deep crouch, rising sky-high, a flip, the stomp
const FINAL_CROUCH = 110;
const RISE_MS = 220;
const FLIP_MS = 210;
const STOMP_MS = 120;
const FINAL_MS = FINAL_CROUCH + RISE_MS + FLIP_MS + STOMP_MS;
const SKY_ABOVE = 440;
const FLOAT = 40;
// the wisp, its springs and boots, in the flash's units
const SIZE = WISP_SIZE * 1.6;
const BODY_R = 40;
const SPRING = 34;
const BOOT_W = 34;
const BOOT_H = 20;
const BOOT_DX = 24;
const ZIGS = 6;
const COIL_W = 11;
const SQUASH = 0.3;
const IMPACT_MS = 110;
const FADE_MS = 140;
// each landing on a bar
const FX_MS = 360;
const FX_SIZE: [number, number] = [150, 270];
const RING = 12;
const JOLT: [number, number] = [0.3, 0.9];
const BUZZ: [number, number] = [14, 34];
// the climax
const BLAST = 460;
const BIG_FLASH = 640;
const BIG_FLASH_MS = 260;
const BIG_RING = 520;
const BIG_GLITTER = 18;
const CLIMAX_SHAKE = 3.4;
const TAIL_MS = DETONATION_MS + 100;
const SHAKES = [0.3, 1];

const WHITE = fadeStops(COLOR.white, 0.3);
const GOLD = glowStops(COLOR.heavenlyGold);
const HEAT_COLORS = [
  COLOR.orange,
  COLOR.amber,
  COLOR.starYellow,
  COLOR.goldenTicketYellow,
  COLOR.white,
];
const HEAT_STOPS = [
  glowStops(COLOR.orange),
  glowStops(COLOR.amber),
  glowStops(COLOR.starYellow),
  glowStops(COLOR.goldenTicketYellow),
  glowStops(COLOR.white),
];

// planned at launch: the bars it lands on bottom to top, its own last; when
// each leg starts and lands, its crouch, and each landing as a bounce
const order: number[] = [];
const legStart: number[] = [];
const landAt: number[] = [];
const crouchOf: number[] = [];
const spots: Point[] = [];
const bounces: Bounce[] = [];
let climbs = 0;
let ticked = 0;
let flipDir = 1;
// kept each frame
let skyFeet = 0;
const startFeet: Point = { x: 0, y: 0 };
const here: Point = { x: 0, y: 0 };
// the pose poseAt writes: the body's middle, its squash (+ crushed, - stretched), its turn
const pose = { x: 0, y: 0, c: 0, spin: 0 };
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

const squashY = (c: number) => 1 - SQUASH * c;
const springOf = (c: number) => SPRING * (1 - (c > 0 ? 0.75 : 0.6) * c);
// the body's middle over its boot soles
const heightOf = (c: number) =>
  BODY_R * 0.7 * squashY(c) + springOf(c) + BOOT_H;
// down on the springs then off them, stretched at the end
const crouchSquash = (u: number) =>
  u < 0.45
    ? Math.sin(((u / 0.45) * Math.PI) / 2)
    : 1 - (1.6 * (u - 0.45)) / 0.55;

function poseAt(t: number): void {
  let fx = 0;
  let fy = 0;
  let c = 0;
  let spin = 0;
  if (t < IN_MS) {
    fx = startFeet.x;
    fy = startFeet.y;
  } else {
    let k = 0;
    while (k <= climbs && t >= landAt[k]) k++;
    if (k > climbs) {
      const own = spots[climbs];
      fx = own.x;
      fy = own.y;
      c = Math.max(0, 1 - (t - landAt[climbs]) / IMPACT_MS);
    } else {
      const from = k === 0 ? startFeet : spots[k - 1];
      const to = spots[k];
      const t0 = legStart[k];
      const crouch = crouchOf[k];
      if (t - t0 < crouch) {
        fx = from.x;
        fy = from.y;
        c =
          crouchSquash((t - t0) / crouch) *
          (k === climbs ? 1 : lerp(0.6, 1, k / Math.max(1, climbs)));
      } else if (k < climbs) {
        const u = clamp01(
          (t - t0 - crouch) / Math.max(1, landAt[k] - t0 - crouch),
        );
        const tl = k / Math.max(1, climbs - 1);
        const lift =
          lerp(LIFT[0], LIFT[1], tl) + 0.5 * Math.max(0, from.y - to.y);
        fx = lerp(from.x, to.x, u);
        fy = lerp(from.y, to.y, u) - lift * 4 * u * (1 - u);
        c = u < 0.3 ? -0.6 * (1 - u / 0.3) : 0;
      } else {
        const v = t - t0 - crouch;
        if (v < RISE_MS) {
          const q = 1 - (1 - v / RISE_MS) ** 2;
          fx = lerp(from.x, to.x, 0.6 * q);
          fy = lerp(from.y, skyFeet, q);
          c = -0.6 * (1 - q);
        } else if (v < RISE_MS + FLIP_MS) {
          const u = (v - RISE_MS) / FLIP_MS;
          fx = lerp(from.x, to.x, 0.6 + 0.4 * u);
          fy = skyFeet - FLOAT * Math.sin(Math.PI * u);
          spin = flipDir * Math.PI * 2 * u * u * (3 - 2 * u);
          c = 0.5 * Math.sin(Math.PI * u);
        } else {
          const u = clamp01((v - RISE_MS - FLIP_MS) / STOMP_MS);
          fx = to.x;
          fy = lerp(skyFeet, to.y, u * u);
          c = -0.6 * u;
        }
      }
    }
  }
  pose.x = fx;
  pose.y = fy - heightOf(c);
  pose.c = c;
  pose.spin = spin;
}

function bodyAt(t: number): Point {
  slot = (slot + 1) & 3;
  const p = slots[slot];
  poseAt(t);
  p.x = pose.x - localX;
  p.y = pose.y - localY;
  return p;
}

// two springs and boots under the body's middle at (0, 0)
function drawBoots(
  ctx: CanvasRenderingContext2D,
  c: number,
  heat: number,
  alpha: number,
): void {
  const top = BODY_R * 0.7 * squashY(c);
  const spring = springOf(c);
  const sole = top + spring;
  const hot = Math.min(
    HEAT_COLORS.length - 1,
    Math.floor(heat * HEAT_COLORS.length),
  );
  const previous = ctx.globalCompositeOperation;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = HEAT_COLORS[hot];
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let s = -1; s <= 1; s += 2) {
    const bx = s * BOOT_DX;
    ctx.moveTo(bx, top);
    for (let j = 1; j < ZIGS; j++)
      ctx.lineTo(bx + (j & 1 ? COIL_W : -COIL_W), top + (spring * j) / ZIGS);
    ctx.lineTo(bx, sole);
  }
  ctx.stroke();
  ctx.fillStyle = HEAT_COLORS[hot];
  ctx.fillRect(-BOOT_DX - BOOT_W / 2, sole, BOOT_W, BOOT_H);
  ctx.fillRect(BOOT_DX - BOOT_W / 2, sole, BOOT_W, BOOT_H);
  ctx.fillStyle = COLOR.white;
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillRect(-BOOT_DX - BOOT_W / 2, sole, BOOT_W, BOOT_H * 0.3);
  ctx.fillRect(BOOT_DX - BOOT_W / 2, sole, BOOT_W, BOOT_H * 0.3);
  ctx.globalCompositeOperation = "lighter";
  const glow = BOOT_W * (1.1 + 1.4 * heat);
  const y = sole + BOOT_H * 0.5;
  ctx.globalAlpha = alpha * (0.5 + 0.5 * heat);
  drawGlow(ctx, HEAT_STOPS[hot], -BOOT_DX, y, glow);
  drawGlow(ctx, HEAT_STOPS[hot], BOOT_DX, y, glow);
  if (heat > 0.5) {
    ctx.globalAlpha = alpha * (heat - 0.5) * 2;
    drawGlow(ctx, WHITE, -BOOT_DX, y, glow * 0.45);
    drawGlow(ctx, WHITE, BOOT_DX, y, glow * 0.45);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

// a flattened flash, a shock ring and a ring of glitter kicked off a landing
function drawLanding(
  ctx: CanvasRenderingContext2D,
  at: Point,
  since: number,
  ms: number,
  size: number,
  glitter: number,
  seed: number,
  now: number,
): void {
  const e = since / ms;
  const fade = 1 - e;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(1, 0.35);
  ctx.globalAlpha = fade * fade;
  drawGlow(ctx, WHITE, 0, 0, size * (0.6 + 0.6 * e));
  ctx.restore();
  const rx = Math.max(0, size * (0.25 + 1.1 * (1 - (1 - e) ** 2)));
  const ry = rx * 0.3;
  ctx.globalAlpha = fade;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.lineWidth = Math.max(0.5, 12 * fade);
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  for (let i = 0; i < glitter; i++) {
    const a = (i / glitter) * Math.PI * 2 + seed;
    drawGlitterLight(
      ctx,
      at.x + Math.cos(a) * rx * 1.05,
      at.y + Math.sin(a) * ry * 1.05 - size * 0.35 * e,
      size * 0.09,
      seed * 31 + i,
      fade,
      now,
    );
  }
}

registerFloorCrit("moonBootsCrit", {
  plan(_r, bars, hit) {
    order.length = 0;
    const up = byHeight(bars);
    for (let i = up.length - 1; i >= 0; i--) if (up[i] !== 0) order.push(up[i]);
    if (order.length > MAX_CLIMB) {
      const all = order.slice();
      order.length = 0;
      for (let i = 0; i < MAX_CLIMB; i++)
        order.push(all[Math.round((i * (all.length - 1)) / (MAX_CLIMB - 1))]);
    }
    if (order.length === 0) order.push(0);
    while (order.length < 2) order.push(order[order.length - 1]);
    climbs = order.length;
    order.push(0);
    while (spots.length < order.length) spots.push({ x: 0, y: 0 });
    while (bounces.length < spots.length)
      bounces.push({ at: spots[bounces.length], ms: 0, normal: -Math.PI / 2 });
    legStart.length = landAt.length = crouchOf.length = 0;
    let sum = 0;
    for (let k = 0; k < climbs; k++)
      sum += lerp(GAPS[0], GAPS[1], k / Math.max(1, climbs - 1));
    const fit = Math.min(1, CLIMB_BUDGET / Math.max(1, sum));
    let clock = IN_MS;
    for (let k = 0; k < climbs; k++) {
      const t = k / Math.max(1, climbs - 1);
      legStart.push(clock);
      crouchOf.push(k === 0 ? 0 : lerp(CROUCH[0], CROUCH[1], t) * fit);
      clock += lerp(GAPS[0], GAPS[1], t) * fit;
      landAt.push(clock);
    }
    legStart.push(clock);
    crouchOf.push(FINAL_CROUCH);
    clock += FINAL_MS;
    landAt.push(clock);
    for (let k = 0; k <= climbs; k++) bounces[k].ms = landAt[k];
    ticked = 0;
    for (let k = 0; k < climbs; k++) hit(order[k], landAt[k], 0);
    hit(0, landAt[climbs], 1);
  },
  draw(ctx, r, ms, bars) {
    if (bars.length === 0 || climbs === 0) return;
    const now = r.startedAt + ms;
    const end = landAt[climbs];
    const halfW = r.play.barHalfWidth;
    for (let k = 0; k <= climbs; k++) {
      const bar = bars[order[k]] ?? bars[0];
      const side = k === climbs ? 0 : k % 2 ? SIDE : -SIDE;
      spots[k].x = bar.x + side * halfW;
      spots[k].y = bar.y - BAR_HALF_H;
    }
    startFeet.x = 0;
    startFeet.y = heightOf(0);
    const top = spots[climbs - 1];
    skyFeet = Math.min(skyY(r, bars, SKY_ABOVE), top.y - SKY_ABOVE * 0.8);
    flipDir = spots[climbs].x >= top.x ? 1 : -1;

    // a jolt every landing, harder each, the stomp the hardest
    while (ticked <= climbs && ms >= landAt[ticked]) {
      if (ticked === climbs) {
        r.shake(CLIMAX_SHAKE);
        buzz(BUZZ[1] * 2);
      } else {
        const t = ticked / Math.max(1, climbs - 1);
        r.shake(lerp(JOLT[0], JOLT[1], t));
        buzz(lerp(BUZZ[0], BUZZ[1], t));
      }
      ticked++;
    }

    // the number balling up into the wisp
    if (ms < IN_MS) {
      const t = (ms / IN_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, 0, 0, lerp(r.flashFont, 0, t), {
        alpha: 1 - t,
      });
    }

    // the landings so far, each bar kicking light off it
    let heat = 0;
    for (let k = 0; k < climbs; k++) {
      const since = ms - landAt[k];
      if (since < 0) break;
      heat = (k + 1) / climbs;
      if (since >= FX_MS) continue;
      const t = k / Math.max(1, climbs - 1);
      const size = lerp(FX_SIZE[0], FX_SIZE[1], t);
      drawLanding(ctx, spots[k], since, FX_MS, size, RING, k + 1, now);
      drawBounceSplash(ctx, bounces[k], since, size, now);
    }

    // the last leap: charging through the flip, its own bar glowing up
    const v = ms - legStart[climbs] - FINAL_CROUCH - RISE_MS;
    const charge = v > 0 && ms < end ? clamp01(v / FLIP_MS) : 0;
    if (ms >= legStart[climbs]) heat = Math.max(heat, 0.8 + 0.2 * charge);
    poseAt(ms);
    const px = pose.x;
    const py = pose.y;
    const c = pose.c;
    const spin = pose.spin;
    if (charge > 0) {
      here.x = px;
      here.y = py;
      drawChargeStreaks(ctx, here, charge, lerp(240, 400, charge), ms);
      drawChargeGlow(ctx, here, charge, BODY_R * 6, now);
      const target = spots[climbs];
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.6 * charge * (0.8 + 0.2 * Math.sin(now * 0.06));
      drawGlow(ctx, GOLD, target.x, target.y, BODY_R * (2 + 2 * charge));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }

    // the wisp: its trail, then its boots and head turned and squashed
    if (ms >= IN_MS * 0.5 && ms < end + WISP_TRAIL_MS)
      drawWispTrail(ctx, bodyAt, ms, now, SIZE * (0.8 + 0.4 * heat));
    const fade = 1 - clamp01((ms - end) / FADE_MS);
    if (fade > 0) {
      const grow = clamp01(ms / IN_MS);
      const sy = squashY(c);
      ctx.save();
      ctx.translate(px, py);
      if (spin !== 0) ctx.rotate(spin);
      ctx.scale(grow, grow);
      drawBoots(ctx, c, heat, fade);
      ctx.scale(1 / Math.sqrt(sy), sy);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.7 * fade;
      drawGlow(ctx, GOLD, 0, 0, BODY_R * (1.6 + 0.8 * heat));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
      localX = px;
      localY = py;
      drawWispHead(ctx, bodyAt, ms, now, SIZE, 0.3 + 0.7 * heat, fade);
      localX = 0;
      localY = 0;
      ctx.restore();
    }

    // the stomp on its own bar
    const since = ms - end;
    if (since >= 0) {
      const at = spots[climbs];
      if (since < FX_MS * 1.6) {
        drawLanding(ctx, at, since, FX_MS * 1.6, BIG_RING, BIG_GLITTER, 0, now);
        drawBounceSplash(ctx, bounces[climbs], since, BIG_RING * 0.7, now);
      }
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
