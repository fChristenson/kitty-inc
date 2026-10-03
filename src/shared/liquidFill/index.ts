import { COLOR } from "../../palette";
import {
  createGlossyGradient,
  drawPillBorder,
  getGlossyGradient,
  shadeColor,
} from "../../utils";
import { hash01 } from "../twinkle";

// the "liquid" look of the upgrade button and income bar: sloshing cash with
// rising bubbles. `heat` (0..1: a long press, a Sale, Overtime) brings it to
// a rolling boil: the surface churns harder and faster, and more, bigger
// bubbles rush up and burst at the surface, flicking droplets. The button's
// liquid also sloshes against its own wiggle.
// Drawn every frame for every floor on screen, and phones choke on per-frame
// clips and wavy paths, so a calm widget is only blits of layers built once:
// its waves are pre-drawn strips slid sideways. Only a boiling or sloshing
// one is drawn live.

// a horizontal gradient across the whole bar, from the first color to the second
export type LiquidGauge = readonly [string, string];

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
// the button's calm surface: its rest height (of h), wave, bob (of h), and the
// back wave's rise above it
const REST = 0.3;
const CALM_AMP = 6;
const BOB = 0.04;
const BACK_RISE = 6;
const WAVE_K = 28;
const WAVE_LEN = Math.PI * 2 * WAVE_K;
// px the front wave strip fades into the body below it
const STRIP_FADE = 10;
// calm bubbles rise from under the button's rim
const BUBBLE_FLOOR = 24;
const BAR_BUBBLE_MARGIN = 14;
const EDGE_AMP = 9;
const EDGE_ROW = 3;
const MAX_LAYER_SETS = 24;
const BUBBLE_RES = 2;
const MAX_BUBBLE_SPRITE = 6;

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

function layer(w: number, h: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  return canvas.getContext("2d")!;
}

function remember<T>(cache: Map<string, T>, key: string, value: T): T {
  if (cache.size >= MAX_LAYER_SETS) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
  return value;
}

// a calm bubble's ring, pre-drawn per whole size
const bubbleSprites: HTMLCanvasElement[] = [];
export function stampBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const i = Math.max(1, Math.min(MAX_BUBBLE_SPRITE, Math.round(size)));
  let sprite = bubbleSprites[i];
  if (!sprite) {
    const box = (i + BUBBLE_WIDTH) * 2;
    const c = layer(box * BUBBLE_RES, box * BUBBLE_RES);
    c.scale(BUBBLE_RES, BUBBLE_RES);
    c.strokeStyle = BUBBLE_STROKE;
    c.lineWidth = BUBBLE_WIDTH;
    c.beginPath();
    c.arc(box / 2, box / 2, i, 0, Math.PI * 2);
    c.stroke();
    sprite = bubbleSprites[i] = c.canvas;
  }
  const half = size + BUBBLE_WIDTH;
  ctx.drawImage(sprite, x - half, y - half, half * 2, half * 2);
}

// a wavy-topped body from base ± amp down to bottom, across width
function waveBody(
  c: CanvasRenderingContext2D,
  width: number,
  base: number,
  amp: number,
  bottom: number,
): void {
  c.beginPath();
  c.moveTo(0, bottom);
  for (let px = 0; px <= width; px += 4)
    c.lineTo(px, base + amp * Math.sin(px / WAVE_K));
  c.lineTo(width, bottom);
  c.closePath();
}

// where a strip's column starts for a wave at `phase`
function waveShift(phase: number): number {
  return (((phase * WAVE_K) % WAVE_LEN) + WAVE_LEN) % WAVE_LEN;
}

// the calm button: the base and the liquid's body under its waves (under),
// the back and front waves as strips a wavelength longer than the button,
// and the reflection and border (over)
interface ButtonLayers {
  w: number;
  h: number;
  r: number;
  under: HTMLCanvasElement;
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  over: HTMLCanvasElement;
  stripTop: number;
  stripH: number;
  inset: number;
}
const buttonLayers = new Map<string, ButtonLayers>();
function getButtonLayers(
  w: number,
  h: number,
  r: number,
  color: string,
): ButtonLayers {
  const hit = buttonLayers.get(color);
  if (hit && hit.w === w && hit.h === h && hit.r === r) return hit;
  const restY = h * REST;
  const bob = h * BOB;
  const stripTop = Math.floor(restY - BACK_RISE - CALM_AMP - 3);
  // the body starts under the lowest trough; the front strip runs past it
  // by a bob and its fade, so they always overlap
  const bodyTop = restY + CALM_AMP + bob + 1;
  const stripH = Math.ceil(bodyTop + bob + STRIP_FADE + 1) - stripTop;
  const stripW = Math.ceil(w + WAVE_LEN) + 2;
  // the strips stay clear of the top corners (the rim hides the gap)
  const cr = Math.max(0, Math.min(r, w / 2, h / 2));
  const reach = stripTop - bob;
  const inset =
    reach < cr ? Math.ceil(cr - Math.sqrt(cr * cr - (cr - reach) ** 2)) + 1 : 1;

  const u = layer(w, h);
  roundedPath(u, 0, 0, w, h, r);
  u.fillStyle = shadeColor(color, -0.62);
  u.fill();
  u.clip();
  u.fillStyle = createGlossyGradient(u, restY - 8, h - restY + 8, color);
  u.fillRect(0, bodyTop, w, h - bodyTop);

  const b = layer(stripW, stripH);
  waveBody(
    b,
    stripW,
    restY - BACK_RISE - stripTop,
    CALM_AMP + 1,
    restY + CALM_AMP + 2 - stripTop,
  );
  b.globalAlpha = BACK_WAVE_ALPHA;
  b.fillStyle = shadeColor(color, 0.35);
  b.fill();

  const f = layer(stripW, stripH);
  waveBody(f, stripW, restY - stripTop, CALM_AMP, stripH);
  f.fillStyle = createGlossyGradient(
    f,
    restY - 8 - stripTop,
    h - restY + 8,
    color,
  );
  f.fill();
  f.globalCompositeOperation = "destination-out";
  const fade = f.createLinearGradient(0, stripH - STRIP_FADE, 0, stripH);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  f.fillStyle = fade;
  f.fillRect(0, stripH - STRIP_FADE, stripW, STRIP_FADE);

  const o = layer(w, h);
  o.save();
  roundedPath(o, 0, 0, w, h, r);
  o.clip();
  o.beginPath();
  o.moveTo(30, 0);
  o.lineTo(70, 0);
  o.lineTo(20, h);
  o.lineTo(-20, h);
  o.fillStyle = REFLECTION;
  o.fill();
  o.restore();
  drawPillBorder(o, 0, 0, w, h, r, color);

  return remember(buttonLayers, color, {
    w,
    h,
    r,
    under: u.canvas,
    back: b.canvas,
    front: f.canvas,
    over: o.canvas,
    stripTop,
    stripH,
    inset,
  });
}

function drawCalmButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  t: number,
): void {
  const L = getButtonLayers(w, h, r, color);
  const bob = h * BOB * Math.sin(t / 420);
  const span = w - L.inset * 2;
  const dx = x + L.inset;
  const dy = y + L.stripTop + bob;
  ctx.drawImage(L.under, x, y);
  ctx.drawImage(
    L.back,
    L.inset + waveShift(t / 210 + 2),
    0,
    span,
    L.stripH,
    dx,
    dy,
    span,
    L.stripH,
  );
  ctx.drawImage(
    L.front,
    L.inset + waveShift(t / 260),
    0,
    span,
    L.stripH,
    dx,
    dy,
    span,
    L.stripH,
  );
  const bottom = y + h - BUBBLE_FLOOR;
  const surface = y + h * REST + bob;
  const runW = w - 40;
  for (let i = 0; i < CALM_BUBBLES; i++) {
    const bubble = BUBBLES[i];
    const p = (t / 1000 / bubble.speed + bubble.phase) % 1;
    const px = 20 + bubble.x * runW;
    const top = surface + CALM_AMP * Math.sin(px / WAVE_K + t / 260);
    stampBubble(ctx, x + px, bottom - p * (bottom - top), bubble.size);
  }
  ctx.drawImage(L.over, x, y);
}

// the calm bar: its empty track (under), its liquid full across (body), its
// shine and border (over), and both of the first two at once (full)
interface BarLayers {
  w: number;
  h: number;
  r: number;
  under: HTMLCanvasElement;
  body: HTMLCanvasElement;
  over: HTMLCanvasElement;
  full: HTMLCanvasElement | null;
}
const barLayers = new Map<string, BarLayers>();
function getBarLayers(
  w: number,
  h: number,
  r: number,
  color: string,
  gauge?: LiquidGauge,
): BarLayers {
  const key = gauge ? `${color}|${gauge[0]}|${gauge[1]}` : color;
  const hit = barLayers.get(key);
  if (hit && hit.w === w && hit.h === h && hit.r === r) return hit;
  const u = layer(w, h);
  roundedPath(u, 0, 0, w, h, r);
  u.fillStyle = COLOR.incomeTrack;
  u.fill();

  const b = layer(w, h);
  roundedPath(b, 0, 0, w, h, r);
  if (gauge) {
    const gradient = b.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, gauge[0]);
    gradient.addColorStop(1, gauge[1]);
    b.fillStyle = gradient;
  } else {
    b.fillStyle = createGlossyGradient(b, 0, h, color);
  }
  b.fill();

  const o = layer(w, h);
  roundedPath(o, 16, 9, w - 32, h * 0.24, 12);
  o.fillStyle = BAR_SHINE;
  o.fill();
  drawPillBorder(o, 0, 0, w, h, r, color);

  return remember(barLayers, key, {
    w,
    h,
    r,
    under: u.canvas,
    body: b.canvas,
    over: o.canvas,
    full: null,
  });
}

// the calm bubbles drifting along a bar filled to fillW: x, y, size triples,
// local to the bar
const barBubbleSpots = new Float32Array(CALM_BUBBLES * 3);
function placeBarBubbles(h: number, fillW: number, t: number): Float32Array {
  const run = Math.max(0, fillW - BAR_BUBBLE_MARGIN * 2);
  for (let i = 0; i < CALM_BUBBLES; i++) {
    const bubble = BUBBLES[i];
    const p = (t / 1400 / bubble.speed + bubble.phase) % 1;
    barBubbleSpots[i * 3] = BAR_BUBBLE_MARGIN + p * run;
    barBubbleSpots[i * 3 + 1] =
      18 + bubble.x * (h - 36) + Math.sin(t / 200 + bubble.phase * 9) * 4;
    barBubbleSpots[i * 3 + 2] = bubble.size;
  }
  return barBubbleSpots;
}

function drawCalmBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillW: number,
  color: string,
  t: number,
  gauge?: LiquidGauge,
): void {
  const L = getBarLayers(w, h, r, color, gauge);
  ctx.drawImage(L.under, x, y);
  const straight = Math.min(w, Math.max(0, fillW - EDGE_AMP));
  if (straight >= 1)
    ctx.drawImage(L.body, 0, 0, straight, h, x, y, straight, h);
  // the sloshing leading edge, a row at a time, each a pixel over its
  // neighbours so no seams show
  const from = Math.max(0, straight - 1);
  for (let yy = 0; yy < h; yy += EDGE_ROW) {
    const reach = Math.min(
      w,
      fillW + Math.sin((yy + EDGE_ROW / 2) / 11 + t / 110) * EDGE_AMP,
    );
    const rowW = reach - from;
    const rowH = Math.min(EDGE_ROW + 1, h - yy);
    if (rowW > 0)
      ctx.drawImage(L.body, from, yy, rowW, rowH, x + from, y + yy, rowW, rowH);
  }
  const spots = placeBarBubbles(h, fillW, t);
  for (let i = 0; i < spots.length; i += 3)
    stampBubble(ctx, x + spots[i], y + spots[i + 1], spots[i + 2]);
  ctx.drawImage(L.over, x, y);
}

// a calm, full bar's layers for a caller that warps it (see pressureBar):
// its liquid (fill), its shine and border (over) and its bubbles (x, y, size
// triples, local to the bar)
export interface CalmFullBar {
  fill: HTMLCanvasElement;
  over: HTMLCanvasElement;
  bubbles: Float32Array;
}
const calmFullBar: CalmFullBar = {
  fill: null!,
  over: null!,
  bubbles: barBubbleSpots,
};
export function getCalmFullBar(
  key: object,
  w: number,
  h: number,
  r: number,
  color: string,
  now: number,
): CalmFullBar {
  const t = tick(barClocks, key, now, 1);
  const L = getBarLayers(w, h, r, color);
  if (!L.full) {
    const c = layer(w, h);
    c.drawImage(L.under, 0, 0);
    c.drawImage(L.body, 0, 0);
    L.full = c.canvas;
  }
  calmFullBar.fill = L.full;
  calmFullBar.over = L.over;
  placeBarBubbles(h, w, t);
  return calmFullBar;
}

// the gauge's gradient on a live-drawn bar
const gaugeGradients = new WeakMap<
  CanvasRenderingContext2D,
  Map<string, CanvasGradient>
>();
function gaugeGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  gauge: LiquidGauge,
): CanvasGradient {
  let byKey = gaugeGradients.get(ctx);
  if (!byKey) gaugeGradients.set(ctx, (byKey = new Map()));
  const key = `${x}|${w}|${gauge[0]}|${gauge[1]}`;
  let gradient = byKey.get(key);
  if (!gradient) {
    gradient = ctx.createLinearGradient(x, 0, x + w, 0);
    gradient.addColorStop(0, gauge[0]);
    gradient.addColorStop(1, gauge[1]);
    byKey.set(key, gradient);
  }
  return gradient;
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
  if (heat === 0 && slosh.angle === 0 && slosh.velocity === 0) {
    drawCalmButton(ctx, x, y, w, h, r, color, t);
    return;
  }
  const lean = Math.abs(slosh.angle);
  const restY = y + h * REST;
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
    y + h - BUBBLE_FLOOR,
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
  gauge?: LiquidGauge,
): void {
  const t = tick(barClocks, key, now, 1 + heat * BOIL_SPEED);
  if (heat === 0) {
    drawCalmBar(ctx, x, y, w, h, r, fillW, color, t, gauge);
    return;
  }
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
  for (let px = 0; px < fillW; px += STEP) ctx.lineTo(x + px, surfaceY(s, px));
  // the sloshing leading edge
  const edge = x + fillW;
  const edgeAmp = EDGE_AMP + heat * 8;
  for (let yy = 0; yy <= h; yy += 4) {
    ctx.lineTo(edge + Math.sin(yy / 11 + t / 110) * edgeAmp, y + yy);
  }
  ctx.closePath();
  ctx.fillStyle = gauge
    ? gaugeGradient(ctx, x, w, gauge)
    : getGlossyGradient(ctx, y, h, color);
  ctx.fill();
  // calm bubbles drift along the bar
  ctx.strokeStyle = BUBBLE_STROKE;
  ctx.lineWidth = BUBBLE_WIDTH;
  const spots = placeBarBubbles(h, fillW, t);
  ctx.beginPath();
  for (let i = 0; i < spots.length; i += 3)
    addBubble(ctx, x + spots[i], y + spots[i + 1], spots[i + 2]);
  ctx.stroke();
  // the boil's bubbles rush straight up and burst at the surface
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
  roundedPath(ctx, x + 16, y + 9, w - 32, h * 0.24, 12);
  ctx.fillStyle = BAR_SHINE;
  ctx.fill();
  ctx.restore();
  drawPillBorder(ctx, x, y, w, h, r, color);
}
