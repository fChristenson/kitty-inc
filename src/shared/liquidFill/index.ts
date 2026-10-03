import { COLOR } from "../../palette";
import { drawPillBorder, getGlossyGradient, shadeColor } from "../../utils";
import { hash01 } from "../twinkle";

// the "liquid" look of the upgrade button and income bar: sloshing cash with
// rising bubbles. `heat` (0..1: a long press, a Sale, Overtime) brings it to
// a rolling boil: the surface churns harder and faster, and more, bigger
// bubbles rush up and burst at the surface, flicking droplets. The button's
// liquid also sloshes against its own wiggle.
// Drawn every frame for every floor on screen, so: no per-frame allocation,
// one stroke for all plain bubbles, and no surface math while it's calm.

export type LiquidPaint = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) => string | CanvasGradient;

const BOIL_SPEED = 3;
const BOIL_WAVES = 12;
const BOIL_CHAOS = 0.8;
const BOIL_BUBBLES = 22;
const BOIL_BUBBLE_SIZE = 7;
const CALM_BUBBLES = 9;
const BUBBLES = Array.from({ length: CALM_BUBBLES + BOIL_BUBBLES }, (_, i) => ({
  x: hash01(i, 2),
  speed: 0.4 + hash01(i, 3) * 0.7,
  size: 2 + hash01(i, 4) * 4,
  grow: hash01(i, 5),
  phase: hash01(i, 6),
}));
const BUBBLE_STROKE = "rgba(255,255,255,0.75)";
const BUBBLE_WIDTH = 2;
const BACK_WAVE_ALPHA = 0.55;
const REFLECTION = "rgba(255,255,255,0.18)";
const BAR_SHINE = "rgba(255,255,255,0.22)";
// a bubble bursts over the last share of its rise
const POP_SHARE = 0.1;
// surface sample spacing, px
const STEP = 8;

// each widget runs its own clock (sped up by its heat), keyed by its floor
interface Clock {
  t: number;
  last: number;
}
const buttonClocks = new WeakMap<object, Clock>();
const barClocks = new WeakMap<object, Clock>();
const MAX_CLOCK_STEP_MS = 100;
function tick(
  clocks: WeakMap<object, Clock>,
  key: object,
  now: number,
  speed: number,
): number {
  let clock = clocks.get(key);
  if (!clock) {
    clock = { t: Math.random() * 10000, last: now };
    clocks.set(key, clock);
  }
  clock.t += Math.min(MAX_CLOCK_STEP_MS, Math.max(0, now - clock.last)) * speed;
  clock.last = now;
  return clock.t;
}

// the button's liquid is a damped spring chasing a level surface: when the
// button rocks, it lags, overshoots and sloshes from wall to wall
const SLOSH_GAIN = 2.2;
const SLOSH_STIFFNESS = 380;
const SLOSH_DAMPING = 5;
const SLOSH_MAX = 0.5;
const SLOSH_STEP_S = 0.004;
const SLOSH_REST = 0.001;
const SLOSH_WALL_CLIMB = 34;
const SLOSH_SPLASH_SPEED = 6;
interface Slosh {
  angle: number;
  velocity: number;
  last: number;
}
const sloshes = new WeakMap<object, Slosh>();
function stepSlosh(key: object, now: number, wiggle: number): Slosh {
  let slosh = sloshes.get(key);
  if (!slosh) {
    slosh = { angle: 0, velocity: 0, last: now };
    sloshes.set(key, slosh);
  }
  const dt = Math.min(0.05, Math.max(0, (now - slosh.last) / 1000));
  slosh.last = now;
  const target = -wiggle * SLOSH_GAIN;
  if (
    target === 0 &&
    Math.abs(slosh.angle) < SLOSH_REST &&
    Math.abs(slosh.velocity) < SLOSH_REST
  ) {
    slosh.angle = 0;
    slosh.velocity = 0;
    return slosh;
  }
  const steps = Math.ceil(dt / SLOSH_STEP_S);
  const step = dt / steps;
  for (let i = 0; i < steps; i++) {
    slosh.velocity +=
      (SLOSH_STIFFNESS * (target - slosh.angle) -
        SLOSH_DAMPING * slosh.velocity) *
      step;
    slosh.angle += slosh.velocity * step;
  }
  slosh.angle = Math.max(-SLOSH_MAX, Math.min(SLOSH_MAX, slosh.angle));
  return slosh;
}

// one liquid surface: rippling waves, an extra churn while boiling, and the
// slosh's tip and its pile-up against the high wall. Reused, never allocated
interface Surface {
  base: number;
  width: number;
  amp: number;
  phase: number;
  chaos: number;
  chaosPhase: number;
  slope: number;
  climb: number;
  highSide: number;
}
const buttonSurface: Surface = {
  base: 0,
  width: 0,
  amp: 0,
  phase: 0,
  chaos: 0,
  chaosPhase: 0,
  slope: 0,
  climb: 0,
  highSide: 0,
};
const backSurface: Surface = { ...buttonSurface };
const barSurface: Surface = { ...buttonSurface };

function surfaceY(s: Surface, px: number): number {
  let yy = s.base + Math.sin(px / 28 + s.phase) * s.amp;
  if (s.chaos !== 0) yy += Math.sin(px / 11 - s.chaosPhase) * s.chaos;
  if (s.slope !== 0) {
    yy += (px - s.width / 2) * s.slope;
    const toward = s.highSide * (px / s.width - 0.5) * 2;
    if (toward > 0) yy -= s.climb * toward ** 4;
  }
  return yy;
}

// the liquid body under a surface, down to bottomY
function surfacePath(
  ctx: CanvasRenderingContext2D,
  s: Surface,
  x: number,
  bottomY: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x, bottomY);
  for (let px = 0; px < s.width; px += STEP)
    ctx.lineTo(x + px, surfaceY(s, px));
  ctx.lineTo(x + s.width, surfaceY(s, s.width));
  ctx.lineTo(x + s.width, bottomY);
  ctx.closePath();
}

function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}

function addBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.moveTo(x + size, y);
  ctx.arc(x, y, size, 0, Math.PI * 2);
}

// a bubble bursting at the surface: a ring and two flicked droplets
function drawPop(
  ctx: CanvasRenderingContext2D,
  x: number,
  surface: number,
  size: number,
  q: number,
  heat: number,
): void {
  const drop = surface - Math.sin(q * Math.PI) * 14 * heat;
  ctx.globalAlpha = (1 - q) * Math.min(1, heat * 2);
  ctx.beginPath();
  ctx.arc(x, surface, size + q * 10 * heat + 2, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  addBubble(ctx, x - q * 12, drop, 2.5);
  addBubble(ctx, x + q * 12, drop, 2.5);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// the boil's bubbles rising from bottomY to the surface and bursting there,
// spread from startPx over runW along the liquid: all the plain ones in one
// stroke, the few bursting ones on their own
function drawRisingBubbles(
  ctx: CanvasRenderingContext2D,
  s: Surface,
  x: number,
  startPx: number,
  runW: number,
  bottomY: number,
  from: number,
  to: number,
  periodMs: number,
  t: number,
  heat: number,
  sizeScale: number,
  sway: number,
): void {
  const popping = heat > 0.15;
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const bubble = BUBBLES[i];
    const p = (t / periodMs / bubble.speed + bubble.phase) % 1;
    if (popping && p > 1 - POP_SHARE) continue;
    const px = startPx + bubble.x * runW;
    const top = surfaceY(s, px);
    addBubble(
      ctx,
      x + px + Math.sin(t / 80 + i) * sway,
      bottomY - p * (bottomY - top),
      bubble.size + heat * BOIL_BUBBLE_SIZE * bubble.grow * sizeScale,
    );
  }
  ctx.stroke();
  if (!popping) return;
  ctx.strokeStyle = COLOR.white;
  ctx.fillStyle = COLOR.white;
  for (let i = from; i < to; i++) {
    const bubble = BUBBLES[i];
    const p = (t / periodMs / bubble.speed + bubble.phase) % 1;
    if (p <= 1 - POP_SHARE) continue;
    const px = startPx + bubble.x * runW;
    drawPop(
      ctx,
      x + px,
      surfaceY(s, px),
      bubble.size + heat * BOIL_BUBBLE_SIZE * bubble.grow * sizeScale,
      (p - 1 + POP_SHARE) / POP_SHARE,
      heat,
    );
  }
  ctx.strokeStyle = BUBBLE_STROKE;
}

export function drawLiquidButton(
  ctx: CanvasRenderingContext2D,
  key: object,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  now: number,
  heat = 0,
  // the button's own rotation: the liquid sloshes against it
  wiggle = 0,
): void {
  const t = tick(buttonClocks, key, now, 1 + heat * BOIL_SPEED);
  const slosh = stepSlosh(key, now, wiggle);
  const lean = Math.abs(slosh.angle);
  const restY = y + h * 0.3;
  // sloshing smooths the little waves out
  const amp = (6 + heat * BOIL_WAVES) * (1 - Math.min(0.6, lean * 2));
  const s = buttonSurface;
  s.base = restY + h * 0.04 * Math.sin(t / 420);
  s.width = w;
  s.amp = amp;
  s.phase = t / 260;
  s.chaos = amp * heat * BOIL_CHAOS;
  s.chaosPhase = t / 150;
  s.slope = Math.tan(slosh.angle);
  s.climb = SLOSH_WALL_CLIMB * lean;
  s.highSide = -Math.sign(slosh.angle);
  const back = backSurface;
  Object.assign(back, s);
  back.base = s.base - 6;
  back.amp = amp + 1;
  back.phase = t / 210 + 2;
  back.chaosPhase = t / 170;

  roundedPath(ctx, x, y, w, h, r);
  ctx.fillStyle = shadeColor(color, -0.62);
  ctx.fill();
  ctx.save();
  ctx.clip();
  surfacePath(ctx, back, x, y + h);
  ctx.globalAlpha = BACK_WAVE_ALPHA;
  ctx.fillStyle = shadeColor(color, 0.35);
  ctx.fill();
  ctx.globalAlpha = 1;
  surfacePath(ctx, s, x, y + h);
  ctx.fillStyle = getGlossyGradient(ctx, restY - 8, y + h - restY + 8, color);
  ctx.fill();
  ctx.strokeStyle = BUBBLE_STROKE;
  ctx.lineWidth = BUBBLE_WIDTH;
  drawRisingBubbles(
    ctx,
    s,
    x,
    20,
    w - 40,
    y + h,
    0,
    CALM_BUBBLES + Math.round(heat * BOIL_BUBBLES),
    1000,
    t,
    heat,
    1,
    heat * 3,
  );
  // a hard slosh flings droplets off the crest at the high wall
  const fling = Math.min(1, Math.abs(slosh.velocity) / SLOSH_SPLASH_SPEED);
  if (fling > 0.15 && lean > 0.08) {
    const wallPx = s.highSide > 0 ? w - 22 : 22;
    const crest = surfaceY(s, wallPx);
    ctx.fillStyle = COLOR.white;
    ctx.globalAlpha = fling;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      addBubble(
        ctx,
        x + wallPx - s.highSide * (6 + i * 9),
        crest - fling * (10 + i * 7),
        3 - i * 0.6,
      );
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  ctx.moveTo(x + 30, y);
  ctx.lineTo(x + 70, y);
  ctx.lineTo(x + 20, y + h);
  ctx.lineTo(x - 20, y + h);
  ctx.fillStyle = REFLECTION;
  ctx.fill();
  ctx.restore();
  drawPillBorder(ctx, x, y, w, h, r, color);
}

export function drawLiquidBar(
  ctx: CanvasRenderingContext2D,
  key: object,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillW: number,
  color: string,
  now: number,
  heat = 0,
  // the liquid's own paint, when it isn't the border color's gloss
  paint?: LiquidPaint,
): void {
  const t = tick(barClocks, key, now, 1 + heat * BOIL_SPEED);
  roundedPath(ctx, x, y, w, h, r);
  ctx.fillStyle = COLOR.incomeTrack;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // a full bar's top only drops into a churning surface once it's heated
  const amp = heat * (6 + heat * BOIL_WAVES) * 0.6;
  const s = barSurface;
  s.base = y - 2 + h * 0.14 * heat;
  s.width = fillW;
  s.amp = amp;
  s.phase = t / 260;
  s.chaos = amp * heat * BOIL_CHAOS;
  s.chaosPhase = t / 150;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  if (heat > 0) {
    for (let px = 0; px < fillW; px += STEP)
      ctx.lineTo(x + px, surfaceY(s, px));
  } else {
    ctx.lineTo(x, s.base);
  }
  // the sloshing leading edge
  const edge = x + fillW;
  const edgeAmp = 9 + heat * 8;
  for (let yy = 0; yy <= h; yy += 4) {
    ctx.lineTo(edge + Math.sin(yy / 11 + t / 110) * edgeAmp, y + yy);
  }
  ctx.closePath();
  ctx.fillStyle = paint
    ? paint(ctx, x, y, w, h)
    : getGlossyGradient(ctx, y, h, color);
  ctx.fill();
  // calm bubbles drift along the bar
  ctx.strokeStyle = BUBBLE_STROKE;
  ctx.lineWidth = BUBBLE_WIDTH;
  const run = Math.max(0, fillW - 14);
  ctx.beginPath();
  for (let i = 0; i < CALM_BUBBLES; i++) {
    const bubble = BUBBLES[i];
    const p = (t / 1400 / bubble.speed + bubble.phase) % 1;
    addBubble(
      ctx,
      x + p * run,
      y + 18 + bubble.x * (h - 36) + Math.sin(t / 200 + bubble.phase * 9) * 4,
      bubble.size,
    );
  }
  ctx.stroke();
  // the boil's bubbles rush straight up and burst at the surface
  if (heat > 0) {
    drawRisingBubbles(
      ctx,
      s,
      x,
      14,
      Math.max(0, fillW - 34),
      y + h,
      CALM_BUBBLES,
      CALM_BUBBLES + Math.round(heat * BOIL_BUBBLES),
      700,
      t,
      heat,
      0.6,
      0,
    );
  }
  roundedPath(ctx, x + 16, y + 9, w - 32, h * 0.24, 12);
  ctx.fillStyle = BAR_SHINE;
  ctx.fill();
  ctx.restore();
  drawPillBorder(ctx, x, y, w, h, r, color);
}
