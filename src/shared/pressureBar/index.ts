import { COLOR } from "../../palette";
import { drawLiquidBar, type LiquidPaint } from "../liquidFill";

// the liquid bar warped by pressure. A floor too fast to show a fill swells
// slowly then rushes, vibrating faster and faster like a kettle, then bursts
// light out from its middle and springs back; a long press swells its middle
// as if about to burst.
// The warp redraws the bar onto a spare canvas and stamps it back in thin
// vertical slices, each stretched by the bulge there, so it's only done while
// there's a visible bulge: otherwise the bar is drawn straight, unwarped.
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
const SLICE = 8;
const INSET = 9;

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

// the dome's shape at each slice, 0 at the ends to 1 in the middle
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

// a band of light fading in from 0 to BURST_BAND, drawn shifted/flipped
const burstGradients = new WeakMap<CanvasRenderingContext2D, CanvasGradient>();
function burstGradient(ctx: CanvasRenderingContext2D): CanvasGradient {
  let gradient = burstGradients.get(ctx);
  if (!gradient) {
    gradient = ctx.createLinearGradient(0, 0, BURST_BAND, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(1, "rgba(255,255,255,1)");
    burstGradients.set(ctx, gradient);
  }
  return gradient;
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
  paint?: LiquidPaint,
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
    paint,
  );
}

// the burst's light and the swell's glow, inside the bar's rim
function drawGlowInside(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  burst: number,
  glow: number,
): void {
  const flash = BURST_FLASH * burst + glow;
  if (burst <= 0 && flash <= 0) return;
  c.save();
  c.beginPath();
  c.roundRect(
    x + INSET,
    y + INSET,
    w - INSET * 2,
    h - INSET * 2,
    Math.max(0, r - INSET),
  );
  c.clip();
  if (burst > 0) {
    const reach = (1 - burst) * (w / 2 + 80);
    c.globalAlpha = BURST_ALPHA * (0.5 + burst * 0.5);
    c.fillStyle = burstGradient(c);
    for (let dir = 1; dir >= -1; dir -= 2) {
      c.save();
      c.translate(x + w / 2 + dir * reach, y);
      c.scale(dir, 1);
      c.translate(-BURST_BAND, 0);
      c.fillRect(0, 0, BURST_BAND, h);
      c.restore();
    }
  }
  if (flash > 0) {
    c.globalAlpha = Math.min(1, flash);
    c.fillStyle = COLOR.white;
    c.fillRect(x, y, w, h);
  }
  c.restore();
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
  paint?: LiquidPaint,
): PressurePose {
  // reused: read straight away by the caller
  const pose = sharedPose;
  pose.textScale = 1 + TEXT_SWELL * Math.max(0, inflation);
  pose.shakeX = shakeX;
  if (Math.abs(inflation) < WARP_EPSILON) {
    if (shakeX !== 0) ctx.translate(shakeX, 0);
    drawLiquidBar(ctx, key, x, y, w, h, r, fillW, color, now, heat, paint);
    drawGlowInside(ctx, x, y, w, h, r, burst, glow);
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
    paint,
  );
  drawGlowInside(flat, PAD_X, PAD_Y, w, h, r, burst, glow);

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
