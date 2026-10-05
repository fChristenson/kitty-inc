import { COLOR } from "../../palette";
import { drawChevronBar, getFullBar, type BarGauge } from "../glossyWidgets";

// the income bar under pressure. A floor too fast to show a fill beats like a
// racing heart, swelling with a glowing halo (two scaled blits). Held, it
// swells slowly then rushes, vibrating faster and faster like a kettle, then
// bursts light out from its middle and springs back; a long press swells its
// middle as if about to burst.
// That warp stamps the bar back in thin vertical slices, each stretched by the
// bulge there, after redrawing it onto a spare canvas, so only a held bar costs.
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
const BEAT_MS = 700;
const BEAT_STRETCH_X = 0.015;
const BEAT_STRETCH_Y = 0.14;
const BEAT_HALO_Y = 0.2;
const BEAT_HALO_ALPHA = 0.3;
const BEAT_TEXT = 0.1;
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

// a calm, full bar's racing heartbeat: two quick swells a beat, with its halo
function drawHeartbeat(
  ctx: CanvasRenderingContext2D,
  key: object,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  now: number,
): PressurePose {
  const t = (now + offsetOf(key)) % BEAT_MS;
  const beat =
    Math.exp(-(((t - 60) / 50) ** 2)) +
    0.6 * Math.exp(-(((t - 260) / 50) ** 2));
  const full = getFullBar(w, h, r, color);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const alpha = ctx.globalAlpha;
  const haloW = full.halo.width * (1 + BEAT_STRETCH_X * beat);
  const haloH = full.halo.height * (1 + BEAT_HALO_Y * beat);
  ctx.globalAlpha =
    alpha * (BEAT_HALO_ALPHA + (1 - BEAT_HALO_ALPHA) * Math.min(1, beat));
  ctx.drawImage(full.halo, cx - haloW / 2, cy - haloH / 2, haloW, haloH);
  ctx.globalAlpha = alpha;
  const barW = w * (1 + BEAT_STRETCH_X * beat);
  const barH = h * (1 + BEAT_STRETCH_Y * beat);
  ctx.drawImage(full.bar, cx - barW / 2, cy - barH / 2, barW, barH);
  sharedPose.textScale = 1 + BEAT_TEXT * beat;
  sharedPose.shakeX = 0;
  return sharedPose;
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
  if (heat === 0 && fillW >= w)
    return drawHeartbeat(ctx, key, x, y, w, h, r, color, now);
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

// the bar racing under a held button, bulging in the middle
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
  gauge?: BarGauge,
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
  gauge?: BarGauge,
): PressurePose {
  // reused: read straight away by the caller
  const pose = sharedPose;
  pose.textScale = 1 + TEXT_SWELL * Math.max(0, inflation);
  pose.shakeX = shakeX;
  if (Math.abs(inflation) < WARP_EPSILON) {
    if (shakeX !== 0) ctx.translate(shakeX, 0);
    drawChevronBar(ctx, key, x, y, w, h, r, fillW, color, now, heat, gauge);
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
  drawChevronBar(
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
