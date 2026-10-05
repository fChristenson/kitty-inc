import { COLOR } from "../../palette";
import { createGlossyGradient, drawPillBorder, shadeColor } from "../../utils";
import { processWhenIdle } from "../idle";

// the upgrade button and income bar. Drawn every frame for every floor on
// screen, so each is a few blits of layers baked once per color:
// - the button is a glossy pill that squashes and stretches like jelly: a
//   wobble every so often at rest, a jiggle that never settles while it's hot
//   (heat 0..1: a long press, a Sale, Overtime), and a lurch as it rocks;
// - the bar fills with chevrons flowing toward its end, faster while hot, from
//   a looping flipbook of the whole bar;
// - a full bar (see pressureBar) is the bar baked whole, with a soft halo.

// a horizontal gradient across the whole bar, from the first color to the second
export type BarGauge = readonly [string, string];

const WOBBLE_MS = 1800;
const WOBBLE_AMP = 0.07;
const WOBBLE_DECAY_MS = 280;
const WOBBLE_RATE_MS = 40;
const JIGGLE_AMP = 0.05;
const JIGGLE_RATE_MS = 30;
const WIGGLE_LURCH = 0.4;
const HEAT_SPEED = 2.5;
const REFLECTION = "rgba(255,255,255,0.18)";

const CHEVRON_FRAMES = 8;
const CHEVRON_PERIOD = 48;
const CHEVRON_LOOP_MS = 700;
const CHEVRON_ALPHA = 0.2;
const CHEVRON_HEAT_SPEED = 3;
const BAR_SHINE = "rgba(255,255,255,0.22)";
const HALO_SPREAD = 20;

const MAX_LAYER_SETS = 24;
// the chevron flipbooks are ~1.8MB each
const MAX_CHEVRON_SETS = 8;

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

function layer(w: number, h: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  return canvas.getContext("2d")!;
}

function remember<T>(
  cache: Map<string, T>,
  key: string,
  value: T,
  max: number,
): T {
  if (cache.size >= max) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
  return value;
}

// a cached layer: its canvas, until a bitmap of it is ready. Drawing a canvas
// the first time costs a snapshot of it (several ms, more on phones), so
// that's done off the frame by createImageBitmap
export type Layer = HTMLCanvasElement | ImageBitmap;
function toBitmap<T>(owner: T, key: keyof T): void {
  const source = owner[key];
  if (!(source instanceof HTMLCanvasElement)) return;
  void createImageBitmap(source).then(
    (bitmap) => {
      (owner[key] as Layer) = bitmap;
    },
    () => {},
  );
}

// ---------- the jelly button ----------
interface ButtonLayer {
  w: number;
  h: number;
  r: number;
  pill: Layer;
}
const buttonLayers = new Map<string, ButtonLayer>();
function getButtonLayer(
  w: number,
  h: number,
  r: number,
  color: string,
): ButtonLayer {
  const hit = buttonLayers.get(color);
  if (hit && hit.w === w && hit.h === h && hit.r === r) return hit;
  const c = layer(w, h);
  roundedPath(c, 0, 0, w, h, r);
  c.fillStyle = createGlossyGradient(c, 0, h, color);
  c.fill();
  c.save();
  c.clip();
  c.beginPath();
  c.moveTo(30, 0);
  c.lineTo(70, 0);
  c.lineTo(20, h);
  c.lineTo(-20, h);
  c.fillStyle = REFLECTION;
  c.fill();
  c.restore();
  drawPillBorder(c, 0, 0, w, h, r, color);
  const baked = remember(
    buttonLayers,
    color,
    { w, h, r, pill: c.canvas as Layer },
    MAX_LAYER_SETS,
  );
  toBitmap(baked, "pill");
  return baked;
}

// the button's squash (sx) and stretch (sy) this frame, about its middle:
// apply it to everything drawn on the button. Reused, read straight away
export interface JellyPose {
  sx: number;
  sy: number;
}
const jelly: JellyPose = { sx: 1, sy: 1 };
export function getJellyPose(
  key: object,
  now: number,
  heat = 0,
  // the button's own rotation: it lurches as it rocks
  wiggle = 0,
): JellyPose {
  const t = tick(buttonClocks, key, now, 1 + heat * HEAT_SPEED);
  const since = t % WOBBLE_MS;
  const squash =
    WOBBLE_AMP *
      Math.exp(-since / WOBBLE_DECAY_MS) *
      Math.sin(since / WOBBLE_RATE_MS) +
    heat * JIGGLE_AMP * Math.sin(t / JIGGLE_RATE_MS) +
    wiggle * WIGGLE_LURCH;
  jelly.sx = 1 + squash;
  jelly.sy = 1 - squash;
  return jelly;
}

export function drawJellyButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
): void {
  ctx.drawImage(getButtonLayer(w, h, r, color).pill, x, y);
}

// ---------- the chevron bar ----------
// its empty track (under), the chevrons flowing over the filled bar, a frame
// per CHEVRON_FRAMES side by side (chevrons), and its shine and border (over)
interface BarLayers {
  w: number;
  h: number;
  r: number;
  under: Layer;
  chevrons: Layer;
  over: Layer;
}
const barLayers = new Map<string, BarLayers>();

function barBody(
  w: number,
  h: number,
  r: number,
  color: string,
  gauge?: BarGauge,
): HTMLCanvasElement {
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
  return b.canvas;
}

function barTrack(w: number, h: number, r: number): HTMLCanvasElement {
  const u = layer(w, h);
  roundedPath(u, 0, 0, w, h, r);
  u.fillStyle = COLOR.incomeTrack;
  u.fill();
  return u.canvas;
}

function barOver(
  w: number,
  h: number,
  r: number,
  color: string,
): HTMLCanvasElement {
  const o = layer(w, h);
  roundedPath(o, 16, 9, w - 32, h * 0.24, 12);
  o.fillStyle = BAR_SHINE;
  o.fill();
  drawPillBorder(o, 0, 0, w, h, r, color);
  return o.canvas;
}

// one chevron, pointing along the bar, added to the current path at x
function addChevron(c: CanvasRenderingContext2D, x: number, h: number): void {
  const t = CHEVRON_PERIOD * 0.4;
  c.moveTo(x, 0);
  c.lineTo(x + t, 0);
  c.lineTo(x + t + h / 2, h / 2);
  c.lineTo(x + t, h);
  c.lineTo(x, h);
  c.lineTo(x + h / 2, h / 2);
  c.closePath();
}

function bakeChevrons(
  body: HTMLCanvasElement,
  w: number,
  h: number,
  r: number,
): HTMLCanvasElement {
  const cw = body.width;
  const c = layer(cw * CHEVRON_FRAMES, h);
  c.fillStyle = `rgba(255,255,255,${CHEVRON_ALPHA})`;
  for (let f = 0; f < CHEVRON_FRAMES; f++) {
    c.save();
    c.translate(f * cw, 0);
    c.drawImage(body, 0, 0);
    roundedPath(c, 0, 0, w, h, r);
    c.clip();
    c.beginPath();
    const shift = (f / CHEVRON_FRAMES) * CHEVRON_PERIOD;
    for (
      let x = -h - CHEVRON_PERIOD;
      x < w + CHEVRON_PERIOD;
      x += CHEVRON_PERIOD
    )
      addChevron(c, x + shift, h);
    c.fill();
    c.restore();
  }
  return c.canvas;
}

function getBarLayers(
  w: number,
  h: number,
  r: number,
  color: string,
  gauge?: BarGauge,
): BarLayers {
  const key = gauge ? `${color}|${gauge[0]}|${gauge[1]}` : color;
  const hit = barLayers.get(key);
  if (hit && hit.w === w && hit.h === h && hit.r === r) return hit;
  const baked = remember(
    barLayers,
    key,
    {
      w,
      h,
      r,
      under: barTrack(w, h, r) as Layer,
      chevrons: bakeChevrons(barBody(w, h, r, color, gauge), w, h, r) as Layer,
      over: barOver(w, h, r, color) as Layer,
    },
    MAX_CHEVRON_SETS,
  );
  toBitmap(baked, "under");
  toBitmap(baked, "chevrons");
  toBitmap(baked, "over");
  return baked;
}

export function drawChevronBar(
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
  gauge?: BarGauge,
): void {
  const L = getBarLayers(w, h, r, color, gauge);
  const t = tick(barClocks, key, now, 1 + heat * CHEVRON_HEAT_SPEED);
  ctx.drawImage(L.under, x, y);
  const fill = Math.min(w, fillW);
  if (fill >= 1) {
    const cw = Math.ceil(w);
    const f = Math.floor(
      ((t % CHEVRON_LOOP_MS) / CHEVRON_LOOP_MS) * CHEVRON_FRAMES,
    );
    ctx.drawImage(L.chevrons, f * cw, 0, fill, h, x, y, fill, h);
  }
  ctx.drawImage(L.over, x, y);
}

// ---------- the full bar ----------
// the plain bar baked whole (bar), and a soft halo HALO_SPREAD round it (halo)
export interface FullBar {
  w: number;
  h: number;
  r: number;
  bar: Layer;
  halo: Layer;
}
const fullBars = new Map<string, FullBar>();
export function getFullBar(
  w: number,
  h: number,
  r: number,
  color: string,
): FullBar {
  const hit = fullBars.get(color);
  if (hit && hit.w === w && hit.h === h && hit.r === r) return hit;
  const c = layer(w, h);
  c.drawImage(barTrack(w, h, r), 0, 0);
  c.drawImage(barBody(w, h, r, color), 0, 0);
  c.drawImage(barOver(w, h, r, color), 0, 0);
  // shadowBlur only here, at bake time
  const glow = layer(w + HALO_SPREAD * 2, h + HALO_SPREAD * 2);
  glow.shadowColor = glow.fillStyle = shadeColor(color, 0.5);
  glow.shadowBlur = HALO_SPREAD;
  roundedPath(glow, HALO_SPREAD, HALO_SPREAD, w, h, r);
  glow.fill();
  const baked = remember(
    fullBars,
    color,
    { w, h, r, bar: c.canvas as Layer, halo: glow.canvas as Layer },
    MAX_LAYER_SETS,
  );
  toBitmap(baked, "bar");
  toBitmap(baked, "halo");
  return baked;
}

// builds the layers for colors the game will show (crit tiers, events) in
// idle time, so a button or bar switching color never builds them mid-play
export function prewarmJellyButton(
  w: number,
  h: number,
  r: number,
  colors: readonly string[],
): void {
  processWhenIdle(colors, (color) => getButtonLayer(w, h, r, color), {
    chunkSize: 1,
  });
}

export function prewarmChevronBar(
  w: number,
  h: number,
  r: number,
  colors: readonly string[],
): void {
  processWhenIdle(colors, (color) => getBarLayers(w, h, r, color), {
    chunkSize: 1,
  });
}
