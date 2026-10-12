// Additive light stamps (glitter, sparkles, twinkles) in one WebGL pass:
// between beginLightBatch and endLightBatch, on a ctx already set to
// "lighter", queueLight takes each drawImage instead of drawing it, and the
// end draws them all at once (shared/spriteBatch, summed like "lighter"
// does). The same pixels as stamping them one by one, since added light
// doesn't care about order. A small batch is just stamped the 2D way.
// deferLights/flushLights around a busy draw (a floor crit's frame) holds
// every batch opened inside it for one pass at its end: dozens of blasts'
// sparks and wisps' trails in one go instead of a pass (or 2D stamps) each
import {
  createSpriteTexture,
  drawOverlaySprites,
  drawSpriteGroups,
  isOverlayFor,
  SPRITE_FLOATS,
  compositeOf,
  isClipped,
  transformVersion,
  type SpriteTexture,
} from "../spriteBatch";

// compositing the WebGL pass costs about as much as this many stamps (6x
// throttled: ~1ms a pass, ~6µs a stamp)
const MIN_BATCH = 160;
// at most this many source canvases per batch; another flushes it first
const MAX_SOURCES = 16;
// at most this many transforms (one per batch opened) per pass
const MAX_MATRICES = 255;
// stamp fields: sx, sy, sw, sh, dx, dy, dw, dh, alpha, then the cos and sin
// it's turned by round its middle
const FIELDS = 11;
const MAX_QUEUED = 1 << 16;
// a level held open by deferLights: a stamp straight on it is queued under
// ctx's transform at the time, if ctx is "lighter"
const DEFERRED = -1;

let batchCtx: CanvasRenderingContext2D | null = null;
// per open level, the index of its transform in `matrices` (or DEFERRED)
const levels: number[] = [];
const matrices: DOMMatrix[] = [];
let stamps = new Float64Array(FIELDS * 1024);
let stampSource = new Uint8Array(1024);
let stampMatrix = new Uint8Array(1024);
let queued = 0;
const sources: HTMLCanvasElement[] = [];
let lastSource: HTMLCanvasElement | null = null;
let lastIndex = 0;
const sheets: SpriteTexture[] = [];
const counts = new Int32Array(MAX_SOURCES);
const starts = new Int32Array(MAX_SOURCES);
let data = new Float32Array(SPRITE_FLOATS * 1024);
const textures = new WeakMap<HTMLCanvasElement, SpriteTexture | null>();
const overlayTextures = new WeakMap<HTMLCanvasElement, SpriteTexture | null>();
// the matrix the last stamp straight on a deferred level was queued under
let loose = -1;
// ctx's transformVersion when it was
let looseVersion = -1;

// ctx's transform as a matrix index, reusing the last loose one if unchanged
function looseMatrix(ctx: CanvasRenderingContext2D): number {
  const version = transformVersion(ctx);
  if (loose >= 0 && version >= 0 && version === looseVersion) return loose;
  looseVersion = version;
  const m = ctx.getTransform();
  if (loose >= 0) {
    const l = matrices[loose];
    if (
      l.a === m.a &&
      l.b === m.b &&
      l.c === m.c &&
      l.d === m.d &&
      l.e === m.e &&
      l.f === m.f
    )
      return loose;
  }
  if (matrices.length === MAX_MATRICES) flush(ctx);
  matrices.push(m);
  loose = matrices.length - 1;
  return loose;
}

function open(ctx: CanvasRenderingContext2D, level: number): void {
  batchCtx = ctx;
  levels.push(level);
}

// stamps on ctx are queued until the matching endLightBatch; ctx must stay
// "lighter", under the same transform and clip, until then
export function beginLightBatch(ctx: CanvasRenderingContext2D): void {
  if (batchCtx && batchCtx !== ctx) return;
  if (matrices.length === MAX_MATRICES) flush(ctx);
  matrices.push(ctx.getTransform());
  open(ctx, matrices.length - 1);
}

export function endLightBatch(ctx: CanvasRenderingContext2D): void {
  close(ctx);
}

// every light batch opened on ctx from here to flushLights draws in one
// pass then, over whatever is drawn in between (and outside any clip set in
// between: only for draws that don't clip)
export function deferLights(ctx: CanvasRenderingContext2D): void {
  if (batchCtx && batchCtx !== ctx) return;
  open(ctx, DEFERRED);
}

export function flushLights(ctx: CanvasRenderingContext2D): void {
  close(ctx);
}

function close(ctx: CanvasRenderingContext2D): void {
  if (batchCtx !== ctx) return;
  if (levels.length > 1) {
    levels.pop();
    return;
  }
  // flushed while its level is still open, so it knows whose transform is on ctx
  flush(ctx);
  levels.length = 0;
  matrices.length = 0;
  batchCtx = null;
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
  // the stamp's alpha, if the caller hasn't set it on ctx
  alpha?: number,
): boolean {
  return queueTurnedLight(
    ctx,
    source,
    sx,
    sy,
    sw,
    sh,
    dx,
    dy,
    dw,
    dh,
    1,
    0,
    alpha ?? ctx.globalAlpha,
  );
}

// queueLight for a stamp turned round its middle by the angle whose cos and
// sin are given
export function queueTurnedLight(
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
  cos: number,
  sin: number,
  alpha: number,
): boolean {
  if (batchCtx !== ctx) return false;
  lightArgs[0] = sx;
  lightArgs[1] = sy;
  lightArgs[2] = sw;
  lightArgs[3] = sh;
  lightArgs[4] = dx;
  lightArgs[5] = dy;
  lightArgs[6] = dw;
  lightArgs[7] = dh;
  lightArgs[8] = alpha;
  lightArgs[9] = cos;
  lightArgs[10] = sin;
  return queueLightArgs(ctx, source);
}

// the stamp queueLightArgs takes: sx, sy, sw, sh, dx, dy, dw, dh, alpha, cos,
// sin. A stamp loop running hundreds a frame fills this and calls
// queueLightArgs: a dozen numbers passed as arguments are each boxed on the
// heap, which piled up garbage collections
export const lightArgs = new Float64Array(FIELDS);

export function queueLightArgs(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
): boolean {
  if (batchCtx !== ctx) return false;
  let matrix = levels[levels.length - 1];
  if (matrix === DEFERRED) {
    // a deferred stamp draws at the end, outside any clip: one under a clip
    // is drawn now instead
    if (compositeOf(ctx) !== "lighter" || isClipped(ctx)) return false;
    matrix = looseMatrix(ctx);
  }
  let s = source === lastSource ? lastIndex : sources.indexOf(source);
  if (s < 0) {
    if (sources.length === MAX_SOURCES) {
      flush(ctx);
      matrix = levels[levels.length - 1];
      if (matrix === DEFERRED) matrix = looseMatrix(ctx);
    }
    s = sources.length;
    sources.push(source);
  }
  lastSource = source;
  lastIndex = s;
  if (queued === stampSource.length) grow();
  stamps.set(lightArgs, queued * FIELDS);
  stampMatrix[queued] = matrix;
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
  const moreMatrices = new Uint8Array(stampMatrix.length * 2);
  moreMatrices.set(stampMatrix);
  stampMatrix = moreMatrices;
}

// draws what's queued, "lighter" under each stamp's own transform, leaving
// ctx as it was; the levels still open keep their transforms
function flush(ctx: CanvasRenderingContext2D): void {
  if (queued > 0) {
    const composite = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    // the overlay draws a batch of any size for free; a 2D composite only
    // pays off past MIN_BATCH stamps
    if ((queued < MIN_BATCH && !isOverlayFor(ctx)) || !drawOnGpu(ctx))
      stampAll(ctx);
    ctx.globalCompositeOperation = composite;
  }
  queued = 0;
  sources.length = 0;
  lastSource = null;
  loose = -1;
  let kept = 0;
  for (let i = 0; i < levels.length; i++) {
    if (levels[i] === DEFERRED) continue;
    matrices[kept] = matrices[levels[i]];
    levels[i] = kept++;
  }
  matrices.length = kept;
}

function stampAll(ctx: CanvasRenderingContext2D): void {
  const alpha = ctx.globalAlpha;
  // a lone batch flushes under its own transform, still on ctx
  const own = matrices.length === 1 && levels[0] !== DEFERRED;
  const transform = own ? null : ctx.getTransform();
  let current = own ? 0 : -1;
  for (let i = 0; i < queued; i++) {
    const o = i * FIELDS;
    if (stampMatrix[i] !== current) {
      current = stampMatrix[i];
      ctx.setTransform(matrices[current]);
    }
    ctx.globalAlpha = stamps[o + 8];
    const sin = stamps[o + 10];
    if (sin !== 0) {
      const cos = stamps[o + 9];
      const hw = stamps[o + 6] / 2;
      const hh = stamps[o + 7] / 2;
      ctx.transform(
        cos,
        sin,
        -sin,
        cos,
        stamps[o + 4] + hw,
        stamps[o + 5] + hh,
      );
      ctx.drawImage(
        sources[stampSource[i]],
        stamps[o],
        stamps[o + 1],
        stamps[o + 2],
        stamps[o + 3],
        -hw,
        -hh,
        stamps[o + 6],
        stamps[o + 7],
      );
      ctx.setTransform(matrices[current]);
      continue;
    }
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
  if (transform) ctx.setTransform(transform);
  ctx.globalAlpha = alpha;
}

function textureOf(
  source: HTMLCanvasElement,
  onOverlay: boolean,
): SpriteTexture | null {
  const cache = onOverlay ? overlayTextures : textures;
  let texture = cache.get(source);
  if (texture === undefined) {
    // sampled like drawImage samples it: no mipmaps
    texture = createSpriteTexture(source, false, onOverlay);
    cache.set(source, texture);
  }
  return texture;
}

function drawOnGpu(ctx: CanvasRenderingContext2D): boolean {
  const onOverlay = isOverlayFor(ctx);
  const groups = sources.length;
  for (let s = 0; s < groups; s++) {
    const texture = textureOf(sources[s], onOverlay);
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
  let current = -1;
  let a = 1;
  let b = 0;
  let c = 0;
  let d = 1;
  let e = 0;
  let f = 0;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let i = 0; i < queued; i++) {
    const o = i * FIELDS;
    const s = stampSource[i];
    const sheet = sheets[s];
    if (stampMatrix[i] !== current) {
      current = stampMatrix[i];
      ({ a, b, c, d, e, f } = matrices[current]);
    }
    const hw = stamps[o + 6] / 2;
    const hh = stamps[o + 7] / 2;
    const cx = stamps[o + 4] + hw;
    const cy = stamps[o + 5] + hh;
    const x = a * cx + c * cy + e;
    const y = b * cx + d * cy + f;
    const cos = stamps[o + 9];
    const sin = stamps[o + 10];
    const ax = (a * cos + c * sin) * hw;
    const ay = (b * cos + d * sin) * hw;
    const bx = (c * cos - a * sin) * hh;
    const by = (d * cos - b * sin) * hh;
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
  return isOverlayFor(ctx)
    ? drawOverlaySprites(sheets, counts, groups, data)
    : drawSpriteGroups(
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
