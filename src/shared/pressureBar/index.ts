import { COLOR } from "../../palette";
import {
  drawLiquidBar,
  getCalmFullBar,
  stampBubble,
  type LiquidGauge,
} from "../liquidFill";

// the liquid bar warped by pressure. A floor too fast to show a fill swells
// slowly then rushes, vibrating faster and faster like a kettle, then bursts
// light out from its middle and springs back; a long press swells its middle
// as if about to burst.
// The warp stamps the bar back in thin vertical slices, each stretched by the
// bulge there. A calm bar's slices come straight from its cached layers; a
// boiling one is redrawn onto a spare canvas first, so only that one costs.
const CYCLE_MS = 1100;
const BUILD = 0.62;
const BURST_SHARE = 0.28;
const BULGE = 0.2;
const STRETCH_X = 0.025;
const VIBRATION_PX = 2.5;
const TEXT_SWELL = 0.12;
const FLASH = 0.15;
const BURST_FLASH = 0.25;
const BURST_BAND = 90;
const BURST_ALPHA = 0.65;
const BOIL_INFLATION = 1.5;
const BOIL_THROB_MS = 55;
const BOIL_SHAKE_PX = 1.5;
const BOIL_FLASH = 0.06;
// below this the bulge is under a pixel: draw the bar straight
const WARP_EPSILON = 0.02;
const MAX_RES = 2;
// room around the bar on the spare canvas for its bulging outline
const PAD_X = 30;
const PAD_Y = 40;
const SLICE = 16;
const CALM_SLICE = 24;
// the glow's one stretch: the dome's bulge across its middle
const GLOW_BULGE = 0.6;
const INSET = 9;
const FLAT = new Float32Array([0]);

export interface PressurePose {
  textScale: number;
  shakeX: number;
}
const sharedPose: PressurePose = { textScale: 1, shakeX: 0 };

const offsets = new WeakMap<object, number>();
function offsetOf(key: object): number {
  let offset = offsets.get(key);
  if (offset === undefined) {
    offset = Math.random() * CYCLE_MS;
    offsets.set(key, offset);
  }
  return offset;
}

const flatCanvas = document.createElement("canvas");
const flat = flatCanvas.getContext("2d")!;

// the dome's shape at each slice, 0 at the ends to 1 in the middle: across
// the spare canvas's padded width, or across a calm bar's own
const profiles = new Map<number, Float32Array>();
function domeProfile(w: number): Float32Array {
  let profile = profiles.get(w);
  if (!profile) {
    const count = Math.ceil((w + PAD_X * 2) / SLICE);
    profile = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = Math.min(1, Math.max(0, (i * SLICE - PAD_X) / w));
      profile[i] = Math.sin(Math.PI * u) ** 1.4;
    }
    profiles.set(w, profile);
  }
  return profile;
}
const calmProfiles = new Map<number, Float32Array>();
function calmProfile(w: number): Float32Array {
  let profile = calmProfiles.get(w);
  if (!profile) {
    const count = Math.ceil(w / CALM_SLICE);
    profile = new Float32Array(count);
    for (let i = 0; i < count; i++)
      profile[i] =
        Math.sin(Math.PI * Math.min(1, ((i + 0.5) * CALM_SLICE) / w)) ** 1.4;
    calmProfiles.set(w, profile);
  }
  return profile;
}

// the swell's glow inside the rim, and the burst's two bands of light (each
// fading in towards its outer end), built once for the bar's size
interface Lights {
  w: number;
  h: number;
  r: number;
  glow: HTMLCanvasElement;
  left: HTMLCanvasElement;
  right: HTMLCanvasElement;
}
let lights: Lights | null = null;
function lightLayer(w: number, h: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  return canvas.getContext("2d")!;
}
function getLights(w: number, h: number, r: number): Lights {
  if (lights && lights.w === w && lights.h === h && lights.r === r)
    return lights;
  const glow = lightLayer(w, h);
  glow.beginPath();
  glow.roundRect(
    INSET,
    INSET,
    w - INSET * 2,
    h - INSET * 2,
    Math.max(0, r - INSET),
  );
  glow.fillStyle = COLOR.white;
  glow.fill();
  const band = (fadesIn: boolean): HTMLCanvasElement => {
    const c = lightLayer(BURST_BAND, h - INSET * 2);
    const gradient = c.createLinearGradient(0, 0, BURST_BAND, 0);
    gradient.addColorStop(fadesIn ? 0 : 1, "rgba(255,255,255,0)");
    gradient.addColorStop(fadesIn ? 1 : 0, "rgba(255,255,255,1)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, BURST_BAND, h - INSET * 2);
    return c.canvas;
  };
  return (lights = {
    w,
    h,
    r,
    glow: glow.canvas,
    left: band(false),
    right: band(true),
  });
}

// the burst's bands racing out from the middle, kept off the rounded ends,
// on a bar centred at cx, cy and warped by stretch and bulge × profile
function drawBurst(
  ctx: CanvasRenderingContext2D,
  L: Lights,
  cx: number,
  cy: number,
  burst: number,
  stretch: number,
  bulge: number,
  profile: Float32Array,
  slice: number,
): void {
  const { w, h, r } = L;
  const reach = (1 - burst) * (w / 2 + 80);
  const lo = INSET + Math.max(0, r - INSET);
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha * BURST_ALPHA * (0.5 + burst * 0.5);
  for (let dir = 1; dir >= -1; dir -= 2) {
    const left = w / 2 + dir * reach - (dir > 0 ? BURST_BAND : 0);
    const from = Math.max(left, lo);
    const to = Math.min(left + BURST_BAND, w - lo);
    if (to <= from) continue;
    const k = Math.min(profile.length - 1, Math.floor((from + to) / 2 / slice));
    const bandH = (h - INSET * 2) * (1 + bulge * profile[k]);
    ctx.drawImage(
      dir > 0 ? L.right : L.left,
      from - left,
      0,
      to - from,
      h - INSET * 2,
      cx + (from - w / 2) * stretch,
      cy - bandH / 2,
      (to - from) * stretch,
      bandH,
    );
  }
  ctx.globalAlpha = alpha;
}

// the burst's light and the swell's glow on an unwarped bar
function drawLights(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  burst: number,
  glow: number,
): void {
  const flash = Math.min(1, BURST_FLASH * burst + glow);
  if (burst <= 0 && flash <= 0) return;
  const L = getLights(w, h, r);
  if (burst > 0) drawBurst(ctx, L, x + w / 2, y + h / 2, burst, 1, 0, FLAT, w);
  if (flash > 0) {
    const alpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha * flash;
    ctx.drawImage(L.glow, x, y);
    ctx.globalAlpha = alpha;
  }
}

// a calm, full bar warped straight from its one cached layer in slices, its
// bubbles moved with the bulge, and its glow stretched by the middle's bulge
function drawCalmWarped(
  ctx: CanvasRenderingContext2D,
  key: object,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  now: number,
  inflation: number,
  burst: number,
  shakeX: number,
  glow: number,
): void {
  const bar = getCalmFullBar(key, w, h, r, color, now);
  const L = getLights(w, h, r);
  const flash = Math.min(1, BURST_FLASH * burst + glow);
  const warped = Math.abs(inflation) >= WARP_EPSILON;
  const slice = warped ? CALM_SLICE : w;
  const profile = warped ? calmProfile(w) : FLAT;
  const stretch = warped ? 1 + STRETCH_X * inflation : 1;
  const bulge = warped ? BULGE * inflation : 0;
  const seam = warped ? 0.6 : 0;
  const cx = x + w / 2 + shakeX;
  const cy = y + h / 2;
  for (let i = 0; i < profile.length; i++) {
    const sx = i * slice;
    const sw = Math.min(slice, w - sx);
    const sh = h * (1 + bulge * profile[i]);
    ctx.drawImage(
      bar.bar,
      sx,
      0,
      sw,
      h,
      cx + (sx - w / 2) * stretch,
      cy - sh / 2,
      sw * stretch + seam,
      sh,
    );
  }
  const spots = bar.bubbles;
  for (let i = 0; i < spots.length; i += 3) {
    const k = Math.min(profile.length - 1, Math.floor(spots[i] / slice));
    stampBubble(
      ctx,
      cx + (spots[i] - w / 2) * stretch,
      cy + (spots[i + 1] - h / 2) * (1 + bulge * profile[k]),
      spots[i + 2],
    );
  }
  if (flash > 0) {
    const alpha = ctx.globalAlpha;
    const gh = h * (1 + bulge * GLOW_BULGE);
    ctx.globalAlpha = alpha * flash;
    ctx.drawImage(L.glow, cx - (w / 2) * stretch, cy - gh / 2, w * stretch, gh);
    ctx.globalAlpha = alpha;
  }
  if (burst > 0)
    drawBurst(ctx, L, cx, cy, burst, stretch, bulge, profile, slice);
}

const boil = { inflation: 0, shakeX: 0 };
function boilWarp(heat: number, now: number): typeof boil {
  boil.inflation =
    heat * BOIL_INFLATION * (0.8 + 0.2 * Math.sin(now / BOIL_THROB_MS));
  boil.shakeX = heat * BOIL_SHAKE_PX * Math.sin(now / 22);
  return boil;
}

export function drawPressureBar(
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
  // how far a long press swells it (the boil alone doesn't warp it)
  warpHeat = heat,
): PressurePose {
  const t = ((now + offsetOf(key)) % CYCLE_MS) / CYCLE_MS;
  const p = Math.min(1, t / BUILD);
  const sinceRelease = t < BUILD ? -1 : ((t - BUILD) * CYCLE_MS) / 1000;
  const inflation =
    sinceRelease < 0
      ? p ** 3
      : Math.exp(-sinceRelease * 12) * Math.cos(sinceRelease * 48);
  const burst = t < BUILD ? 0 : Math.max(0, 1 - (t - BUILD) / BURST_SHARE);
  const shakeX =
    sinceRelease < 0
      ? Math.sin((now / 1000) * (20 + 90 * p) * Math.PI * 2) *
        VIBRATION_PX *
        p *
        p
      : 0;
  if (heat === 0 && fillW >= w) {
    const pose = sharedPose;
    pose.textScale = 1 + TEXT_SWELL * Math.max(0, inflation);
    pose.shakeX = shakeX;
    drawCalmWarped(
      ctx,
      key,
      x,
      y,
      w,
      h,
      r,
      color,
      now,
      inflation,
      burst,
      shakeX,
      FLASH * Math.max(0, inflation),
    );
    return pose;
  }
  const swell = boilWarp(warpHeat, now);
  return renderWarped(
    ctx,
    key,
    x,
    y,
    w,
    h,
    r,
    fillW,
    color,
    now,
    heat,
    warpHeat > 0 ? Math.max(inflation, swell.inflation) : inflation,
    burst,
    shakeX + swell.shakeX,
    FLASH * Math.max(0, inflation),
  );
}

// the liquid bar boiling under a held button, bulging in the middle
export function drawBoilingBar(
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
  heat: number,
  warpHeat = heat,
  gauge?: LiquidGauge,
): PressurePose {
  const swell = boilWarp(warpHeat, now);
  return renderWarped(
    ctx,
    key,
    x,
    y,
    w,
    h,
    r,
    fillW,
    color,
    now,
    heat,
    swell.inflation,
    0,
    swell.shakeX,
    BOIL_FLASH * warpHeat,
    gauge,
  );
}

function renderWarped(
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
  heat: number,
  inflation: number,
  burst: number,
  shakeX: number,
  glow: number,
  gauge?: LiquidGauge,
): PressurePose {
  // reused: read straight away by the caller
  const pose = sharedPose;
  pose.textScale = 1 + TEXT_SWELL * Math.max(0, inflation);
  pose.shakeX = shakeX;
  if (Math.abs(inflation) < WARP_EPSILON) {
    if (shakeX !== 0) ctx.translate(shakeX, 0);
    drawLiquidBar(ctx, key, x, y, w, h, r, fillW, color, now, heat, gauge);
    drawLights(ctx, x, y, w, h, r, burst, glow);
    if (shakeX !== 0) ctx.translate(-shakeX, 0);
    return pose;
  }

  // rendered at the canvas's own scale (capped) so the slices stay sharp
  const m = ctx.getTransform();
  const res = Math.min(MAX_RES, Math.max(1, Math.hypot(m.a, m.b)));
  const totalW = w + PAD_X * 2;
  const totalH = h + PAD_Y * 2;
  const pxW = Math.ceil(totalW * res);
  const pxH = Math.ceil(totalH * res);
  if (flatCanvas.width !== pxW || flatCanvas.height !== pxH) {
    flatCanvas.width = pxW;
    flatCanvas.height = pxH;
  } else {
    flat.setTransform(1, 0, 0, 1, 0, 0);
    flat.clearRect(0, 0, pxW, pxH);
  }
  flat.setTransform(res, 0, 0, res, 0, 0);
  drawLiquidBar(
    flat,
    key,
    PAD_X,
    PAD_Y,
    w,
    h,
    r,
    fillW,
    color,
    now,
    heat,
    gauge,
  );
  drawLights(flat, PAD_X, PAD_Y, w, h, r, burst, glow);

  const profile = domeProfile(w);
  const cx = x + w / 2 + shakeX;
  const cy = y + h / 2;
  const stretch = 1 + STRETCH_X * inflation;
  const bulge = BULGE * inflation;
  const slicePx = SLICE * res;
  for (let i = 0; i < profile.length; i++) {
    const sx = i * SLICE;
    const sliceH = totalH * (1 + bulge * profile[i]);
    ctx.drawImage(
      flatCanvas,
      sx * res,
      0,
      Math.min(slicePx, pxW - sx * res),
      pxH,
      cx + (sx - totalW / 2) * stretch,
      cy - sliceH / 2,
      SLICE * stretch + 0.6,
      sliceH,
    );
  }
  return pose;
}
