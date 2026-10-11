import { COLOR } from "../../palette";
import { createGlossyGradient, drawPillBorder, shadeColor } from "../../utils";
import { processWhenIdle } from "../idle";
import { hash01, stampGlimmer } from "../twinkle";
import {
  SLAM_WAVE_HOP,
  SLAM_WAVE_MS,
  SLAM_WAVE_SCALE,
  slamWaveHop,
  slamWavePassed,
} from "../slamWave";

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

// ---------- the gold bar ----------
// a floor at the level cap: smooth coin gold with gloss slashes and the usual
// border, glimmers twinkling over it
const GOLD_STOPS: readonly (readonly [number, string])[] = [
  [0, "#FFF6C0"],
  [0.35, "#F8C818"],
  [0.75, "#E9A90C"],
  [1, "#A86A00"],
];
// [x, width] of each slash along its bottom edge
const GOLD_SLASHES: readonly (readonly [number, number])[] = [
  [40, 34],
  [92, 12],
];
const GOLD_SLASH = "rgba(255,255,255,0.55)";
const GOLD_SLASH_LEAN = 0.45; // of the bar's height
let goldBar: { w: number; h: number; r: number; bar: Layer } | null = null;
function getGoldBar(w: number, h: number, r: number): Layer {
  if (!goldBar || goldBar.w !== w || goldBar.h !== h || goldBar.r !== r) {
    const c = layer(w, h);
    roundedPath(c, 0, 0, w, h, r);
    const gradient = c.createLinearGradient(0, 0, 0, h);
    for (const [at, color] of GOLD_STOPS) gradient.addColorStop(at, color);
    c.fillStyle = gradient;
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = GOLD_SLASH;
    const lean = h * GOLD_SLASH_LEAN;
    for (const [sx, sw] of GOLD_SLASHES) {
      c.beginPath();
      c.moveTo(sx + lean, 0);
      c.lineTo(sx + lean + sw, 0);
      c.lineTo(sx + sw, h);
      c.lineTo(sx, h);
      c.closePath();
      c.fill();
    }
    c.restore();
    c.drawImage(barOver(w, h, r, COLOR.heavenlyGold), 0, 0);
    goldBar = { w, h, r, bar: c.canvas as Layer };
    toBitmap(goldBar, "bar");
  }
  return goldBar.bar;
}

export function drawGoldBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.drawImage(getGoldBar(w, h, r), x, y);
}

// the switch to gold: the "Lvl" label's landed wave run along the bar, its
// slices hopping up one after another from the left like the label's
// letters, each turning gold and flashing bright as it hops. ms into it
export const GOLD_SWITCH_MS = SLAM_WAVE_MS;
const SWITCH_SLICE = 16;
// the label's wave band, a little wider than the text is tall
const SWITCH_BAND = 1.2; // of the bar's height
const SWITCH_SHINE = 0.6;
const switchCanvas = document.createElement("canvas");
const switchCtx = switchCanvas.getContext("2d")!;

// the switch's hop (0..1..0) at bar-local x, ms in, so what sits on the bar
// can ride it: the bar's middle there is GOLD_SWITCH_RISE x hop x h higher
export const GOLD_SWITCH_RISE = SLAM_WAVE_HOP + SLAM_WAVE_SCALE / 2;
export function goldSwitchHop(
  ms: number,
  x: number,
  w: number,
  h: number,
): number {
  const band = h * SWITCH_BAND;
  return slamWaveHop(ms, (x + band) / (w + band * 2));
}
export function drawGoldSwitch(
  ctx: CanvasRenderingContext2D,
  key: object,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillW: number,
  fromColor: string,
  now: number,
  ms: number,
): void {
  // the old bar, at the canvas's own scale so its slices stay sharp
  const m = ctx.getTransform();
  const res = Math.min(2, Math.max(1, Math.hypot(m.a, m.b)));
  const pxW = Math.ceil(w * res);
  const pxH = Math.ceil(h * res);
  if (switchCanvas.width !== pxW || switchCanvas.height !== pxH) {
    switchCanvas.width = pxW;
    switchCanvas.height = pxH;
  } else {
    switchCtx.setTransform(1, 0, 0, 1, 0, 0);
    switchCtx.clearRect(0, 0, pxW, pxH);
  }
  switchCtx.setTransform(res, 0, 0, res, 0, 0);
  drawChevronBar(switchCtx, key, 0, 0, w, h, r, fillW, fromColor, now, 0);
  const gold = getGoldBar(w, h, r);
  const band = h * SWITCH_BAND;
  const path = w + band * 2;
  const alpha = ctx.globalAlpha;
  const foot = y + h;
  for (let sx = 0; sx < w; sx += SWITCH_SLICE) {
    const sw = Math.min(SWITCH_SLICE, w - sx);
    const along = (sx + sw / 2 + band) / path;
    const hop = slamWaveHop(ms, along);
    const passed = slamWavePassed(ms, along);
    const s = 1 + SLAM_WAVE_SCALE * hop;
    const dh = h * s;
    const dy = foot - dh - SLAM_WAVE_HOP * h * hop;
    const dx = x + sx - (sw * (s - 1)) / 2;
    const dw = sw * s + 0.6;
    if (passed < 1)
      ctx.drawImage(switchCanvas, sx * res, 0, sw * res, pxH, dx, dy, dw, dh);
    if (passed > 0) {
      ctx.globalAlpha = alpha * passed;
      ctx.drawImage(gold, sx, 0, sw, h, dx, dy, dw, dh);
      if (hop > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha * SWITCH_SHINE * hop;
        ctx.drawImage(gold, sx, 0, sw, h, dx, dy, dw, dh);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = alpha;
    }
  }
}

// glimmers twinkling calmly over it, each at a fresh spot every life
const GLIMMERS = 6;
const GLIMMER_MS = 1600;
const GLIMMER_SIZE = 24;
const GLIMMER_SPIN = 1.5;
export function drawGoldGlimmers(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  now: number,
  seed: number,
): void {
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  // clear of the border
  const marginX = h * 0.5;
  const marginY = h * 0.35;
  for (let i = 0; i < GLIMMERS; i++) {
    const life = now / GLIMMER_MS + i / GLIMMERS + seed * 0.37;
    const t = life - Math.floor(life);
    const n = Math.floor(life) * 31 + seed;
    stampGlimmer(
      ctx,
      x + marginX + hash01(n, i) * (w - marginX * 2),
      y + marginY + hash01(n, i + 50) * (h - marginY * 2),
      GLIMMER_SIZE * Math.sin(Math.PI * t),
      t * GLIMMER_SPIN,
      COLOR.heavenlyGold,
    );
  }
  ctx.globalCompositeOperation = previous;
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
  processWhenIdle(colors, (color) => getButtonLayer(w, h, r, color));
}

export function prewarmChevronBar(
  w: number,
  h: number,
  r: number,
  colors: readonly string[],
): void {
  processWhenIdle(colors, (color) => getBarLayers(w, h, r, color));
}
