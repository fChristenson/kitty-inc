// Additive light stamps (glitter, sparkles, twinkles) in one WebGL pass:
// between beginLightBatch and endLightBatch, on a ctx already set to
// "lighter", queueLight takes each drawImage instead of drawing it, and the
// end draws them all at once (shared/spriteBatch, summed like "lighter"
// does). The same pixels as stamping them one by one, since added light
// doesn't care about order. A small batch is just stamped the 2D way
import {
  createSpriteTexture,
  drawSpriteGroups,
  SPRITE_FLOATS,
  type SpriteTexture,
} from "../spriteBatch";

// compositing the WebGL pass costs about as much as this many stamps (6x
// throttled: ~1ms a pass, ~6µs a stamp)
const MIN_BATCH = 160;
// at most this many source canvases per batch; another flushes it first
const MAX_SOURCES = 16;
// stamp fields: sx, sy, sw, sh, dx, dy, dw, dh, alpha
const FIELDS = 9;
const MAX_QUEUED = 1 << 16;

let batchCtx: CanvasRenderingContext2D | null = null;
let depth = 0;
let matrix: DOMMatrix | null = null;
let stamps = new Float64Array(FIELDS * 1024);
let stampSource = new Uint8Array(1024);
let queued = 0;
const sources: HTMLCanvasElement[] = [];
let lastSource: HTMLCanvasElement | null = null;
let lastIndex = 0;
const sheets: SpriteTexture[] = [];
const counts = new Int32Array(MAX_SOURCES);
const starts = new Int32Array(MAX_SOURCES);
let data = new Float32Array(SPRITE_FLOATS * 1024);
const textures = new WeakMap<HTMLCanvasElement, SpriteTexture | null>();

// stamps on ctx are queued until the matching endLightBatch; ctx must stay
// "lighter", under the same transform and clip, until then
export function beginLightBatch(ctx: CanvasRenderingContext2D): void {
  if (batchCtx) {
    if (batchCtx === ctx) depth++;
    return;
  }
  batchCtx = ctx;
  depth = 1;
  matrix = ctx.getTransform();
}

export function endLightBatch(ctx: CanvasRenderingContext2D): void {
  if (batchCtx !== ctx || --depth > 0) return;
  flush(ctx);
  batchCtx = null;
  matrix = null;
}

// ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh) at ctx's alpha, queued
// if a light batch is open on ctx; false (draw it yourself) if not
export function queueLight(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): boolean {
  if (batchCtx !== ctx) return false;
  let s = source === lastSource ? lastIndex : sources.indexOf(source);
  if (s < 0) {
    if (sources.length === MAX_SOURCES) flush(ctx);
    s = sources.length;
    sources.push(source);
  }
  lastSource = source;
  lastIndex = s;
  if (queued === stampSource.length) grow();
  const o = queued * FIELDS;
  stamps[o] = sx;
  stamps[o + 1] = sy;
  stamps[o + 2] = sw;
  stamps[o + 3] = sh;
  stamps[o + 4] = dx;
  stamps[o + 5] = dy;
  stamps[o + 6] = dw;
  stamps[o + 7] = dh;
  stamps[o + 8] = ctx.globalAlpha;
  stampSource[queued++] = s;
  if (queued === MAX_QUEUED) flush(ctx);
  return true;
}

function grow(): void {
  const more = new Float64Array(stamps.length * 2);
  more.set(stamps);
  stamps = more;
  const moreSources = new Uint8Array(stampSource.length * 2);
  moreSources.set(stampSource);
  stampSource = moreSources;
}

function flush(ctx: CanvasRenderingContext2D): void {
  if (queued > 0 && (queued < MIN_BATCH || !drawOnGpu(ctx))) stampAll(ctx);
  queued = 0;
  sources.length = 0;
  lastSource = null;
}

function stampAll(ctx: CanvasRenderingContext2D): void {
  const alpha = ctx.globalAlpha;
  for (let i = 0; i < queued; i++) {
    const o = i * FIELDS;
    ctx.globalAlpha = stamps[o + 8];
    ctx.drawImage(
      sources[stampSource[i]],
      stamps[o],
      stamps[o + 1],
      stamps[o + 2],
      stamps[o + 3],
      stamps[o + 4],
      stamps[o + 5],
      stamps[o + 6],
      stamps[o + 7],
    );
  }
  ctx.globalAlpha = alpha;
}

function textureOf(source: HTMLCanvasElement): SpriteTexture | null {
  let texture = textures.get(source);
  if (texture === undefined) {
    // sampled like drawImage samples it: no mipmaps
    texture = createSpriteTexture(source, false);
    textures.set(source, texture);
  }
  return texture;
}

function drawOnGpu(ctx: CanvasRenderingContext2D): boolean {
  const groups = sources.length;
  for (let s = 0; s < groups; s++) {
    const texture = textureOf(sources[s]);
    if (!texture) return false;
    sheets[s] = texture;
    counts[s] = 0;
  }
  for (let i = 0; i < queued; i++) counts[stampSource[i]]++;
  let start = 0;
  for (let s = 0; s < groups; s++) {
    starts[s] = start;
    start += counts[s];
  }
  if (data.length < queued * SPRITE_FLOATS)
    data = new Float32Array(queued * SPRITE_FLOATS * 2);
  const { a, b, c, d, e, f } = matrix!;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let i = 0; i < queued; i++) {
    const o = i * FIELDS;
    const s = stampSource[i];
    const sheet = sheets[s];
    const hw = stamps[o + 6] / 2;
    const hh = stamps[o + 7] / 2;
    const cx = stamps[o + 4] + hw;
    const cy = stamps[o + 5] + hh;
    const x = a * cx + c * cy + e;
    const y = b * cx + d * cy + f;
    const ax = a * hw;
    const ay = b * hw;
    const bx = c * hh;
    const by = d * hh;
    const q = starts[s]++ * SPRITE_FLOATS;
    data[q] = x;
    data[q + 1] = y;
    data[q + 2] = ax;
    data[q + 3] = ay;
    data[q + 4] = bx;
    data[q + 5] = by;
    data[q + 6] = stamps[o] / sheet.width;
    data[q + 7] = stamps[o + 1] / sheet.height;
    data[q + 8] = (stamps[o] + stamps[o + 2]) / sheet.width;
    data[q + 9] = (stamps[o + 1] + stamps[o + 3]) / sheet.height;
    data[q + 10] = stamps[o + 8];
    const ex = Math.abs(ax) + Math.abs(bx);
    const ey = Math.abs(ay) + Math.abs(by);
    if (x - ex < left) left = x - ex;
    if (x + ex > right) right = x + ex;
    if (y - ey < top) top = y - ey;
    if (y + ey > bottom) bottom = y + ey;
  }
  return drawSpriteGroups(
    ctx,
    sheets,
    counts,
    groups,
    data,
    left,
    top,
    right,
    bottom,
    true,
  );
}
