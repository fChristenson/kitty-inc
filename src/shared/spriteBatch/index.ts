// Draws many textured quads in one WebGL call onto a hidden canvas, then
// stamps the result onto a 2D canvas with one drawImage. Hundreds of
// separate drawImage calls cost the main thread ~6µs each on a phone; a batch
// costs about one. Instances are in the 2D canvas's own device pixels, so the
// caller's transform, clip and draw order around the batch all still hold.
// Returns false (draw nothing) when WebGL2 isn't available or was lost: the
// caller then draws the 2D way

// floats per instance: center x/y, half-width axis x/y, half-height axis
// x/y, texture rect u0/v0/u1/v1, alpha
export const SPRITE_FLOATS = 11;

export interface SpriteTexture {
  texture: WebGLTexture;
  width: number;
  height: number;
}

interface Gl {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  gl: WebGL2RenderingContext;
  vao: WebGLVertexArrayObject;
  instances: WebGLBuffer;
  capacity: number;
  resolution: WebGLUniformLocation;
  pointAt: (first: number) => void;
}

let shared: Gl | null = null;
let failed = false;

const VERTEX = `#version 300 es
in vec2 corner;
in vec2 center;
in vec4 axes;
in vec4 rect;
in float alpha;
uniform vec2 resolution;
out vec2 uv;
out float shade;
void main() {
  vec2 k = corner * 2.0 - 1.0;
  vec2 p = center + k.x * axes.xy + k.y * axes.zw;
  uv = mix(rect.xy, rect.zw, corner);
  shade = alpha;
  gl_Position = vec4(p.x / resolution.x * 2.0 - 1.0, 1.0 - p.y / resolution.y * 2.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision mediump float;
in vec2 uv;
in float shade;
uniform sampler2D sheet;
out vec4 color;
void main() {
  color = texture(sheet, uv) * shade;
}`;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function getGl(): Gl | null {
  if (shared || failed) return shared;
  // offscreen, the batch hands its pixels over (transferToImageBitmap)
  // instead of the 2D canvas copying the whole WebGL canvas every stamp
  const canvas =
    typeof OffscreenCanvas === "undefined"
      ? document.createElement("canvas")
      : new OffscreenCanvas(1, 1);
  shared = createGl(canvas, () => {
    shared = null;
    failed = true;
  });
  if (!shared) failed = true;
  return shared;
}

function createGl(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  onLost: () => void,
): Gl | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  }) as WebGL2RenderingContext | null;
  if (!gl) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const quad = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const corner = gl.getAttribLocation(program, "corner");
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
  const instances = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);
  const stride = SPRITE_FLOATS * 4;
  const layout: [number, number, number][] = [
    [gl.getAttribLocation(program, "center"), 2, 0],
    [gl.getAttribLocation(program, "axes"), 4, 2],
    [gl.getAttribLocation(program, "rect"), 4, 6],
    [gl.getAttribLocation(program, "alpha"), 1, 10],
  ];
  for (const [at] of layout) {
    gl.enableVertexAttribArray(at);
    gl.vertexAttribDivisor(at, 1);
  }
  // the instance attributes read from `first` instance on
  const pointAt = (first: number) => {
    for (const [at, size, offset] of layout)
      gl.vertexAttribPointer(
        at,
        size,
        gl.FLOAT,
        false,
        stride,
        (first * SPRITE_FLOATS + offset) * 4,
      );
  };
  pointAt(0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.SCISSOR_TEST);
  gl.clearColor(0, 0, 0, 0);
  canvas.addEventListener("webglcontextlost", onLost);
  return {
    canvas,
    gl,
    vao,
    instances,
    capacity: 0,
    resolution: gl.getUniformLocation(program, "resolution")!,
    pointAt,
  };
}

// a texture of image, with mipmaps so sprites drawn small stay smooth (or
// without, sampled like a 2D drawImage); null without WebGL2. on: "lights"
// for drawOverlaySprites, "coins" for drawCoinLayerSprites (each has its own
// context)
export function createSpriteTexture(
  image: TexImageSource & { width: number; height: number },
  mipmaps = true,
  on: boolean | "coins" = false,
): SpriteTexture | null {
  const g =
    on === "coins"
      ? (coinLayer?.gl ?? null)
      : on
        ? (overlay?.gl ?? null)
        : getGl();
  if (!g) return null;
  const { gl } = g;
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { texture, width: image.width, height: image.height };
}

// draws count instances from data onto ctx's canvas, inside the device-pixel
// box (left, top, right, bottom) they cover, with ctx's clip and composite.
// False if WebGL isn't there to do it
export function drawSprites(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteTexture,
  data: Float32Array,
  count: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): boolean {
  oneSheet[0] = sheet;
  oneCount[0] = count;
  return drawSpriteGroups(
    ctx,
    oneSheet,
    oneCount,
    1,
    data,
    left,
    top,
    right,
    bottom,
    false,
  );
}

const oneSheet: SpriteTexture[] = [];
const oneCount = new Int32Array(1);

// drawSprites for instances from several sheets: counts[i] of sheets[i]'s,
// one group after another in data. additive sums overlapping sprites, as a
// "lighter" ctx would, instead of laying each over the last
export function drawSpriteGroups(
  ctx: CanvasRenderingContext2D,
  sheets: readonly SpriteTexture[],
  counts: ArrayLike<number>,
  groups: number,
  data: Float32Array,
  left: number,
  top: number,
  right: number,
  bottom: number,
  additive: boolean,
): boolean {
  const g = shared;
  if (!g || g.gl.isContextLost()) return false;
  const { gl, canvas } = g;
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const x = Math.max(0, Math.floor(left));
  const y = Math.max(0, Math.floor(top));
  const w = Math.min(width, Math.ceil(right)) - x;
  const h = Math.min(height, Math.ceil(bottom)) - y;
  let count = 0;
  for (let i = 0; i < groups; i++) count += counts[i];
  if (count === 0 || w <= 0 || h <= 0) return true;
  // soft additive light on a dense screen loses nothing at half the pixels;
  // drawn into the canvas's bottom-left corner, never resizing it
  const res = additive && width >= HALF_RES_FROM ? 0.5 : 1;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const glW = Math.ceil(width * res);
  const glH = Math.ceil(height * res);
  const sx = Math.floor(x * res);
  const sy = Math.floor(y * res);
  const sw = Math.min(glW, Math.ceil((x + w) * res)) - sx;
  const sh = Math.min(glH, Math.ceil((y + h) * res)) - sy;
  gl.viewport(0, 0, glW, glH);
  gl.uniform2f(g.resolution, width, height);
  // GL counts rows from the bottom
  gl.scissor(sx, glH - sy - sh, sw, sh);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.blendFunc(gl.ONE, additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(g.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, g.instances);
  const floats = count * SPRITE_FLOATS;
  if (g.capacity < floats) {
    g.capacity = Math.max(floats, g.capacity * 2);
    gl.bufferData(gl.ARRAY_BUFFER, g.capacity * 4, gl.DYNAMIC_DRAW);
  }
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, floats);
  let first = 0;
  for (let i = 0; i < groups; i++) {
    const n = counts[i];
    if (n === 0) continue;
    g.pointAt(first);
    gl.bindTexture(gl.TEXTURE_2D, sheets[i].texture);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    first += n;
  }
  const m = ctx.getTransform();
  const alpha = ctx.globalAlpha;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  const top2d = height - glH + sy;
  if (canvas instanceof HTMLCanvasElement)
    ctx.drawImage(
      canvas,
      sx,
      top2d,
      sw,
      sh,
      sx / res,
      sy / res,
      sw / res,
      sh / res,
    );
  else {
    const bitmap = canvas.transferToImageBitmap();
    ctx.drawImage(
      bitmap,
      sx,
      top2d,
      sw,
      sh,
      sx / res,
      sy / res,
      sw / res,
      sh / res,
    );
    // closed once the frame has used it: closing it straight away forces the
    // canvas to finish drawing it there and then
    spentBitmaps.push(bitmap);
    if (!closeQueued) {
      closeQueued = true;
      requestAnimationFrame(closeSpentBitmaps);
    }
  }
  ctx.setTransform(m);
  ctx.globalAlpha = alpha;
  return true;
}

const spentBitmaps: ImageBitmap[] = [];
let closeQueued = false;
function closeSpentBitmaps(): void {
  closeQueued = false;
  for (const bitmap of spentBitmaps) bitmap.close();
  spentBitmaps.length = 0;
}

// a canvas this many device px wide or more draws its light at half resolution
const HALF_RES_FROM = 960;

// Additive light can skip the composite entirely: drawn on a canvas laid over
// the game's, which the browser adds on top (mix-blend-mode: plus-lighter)
// for free. Copying a WebGL frame into a 2D canvas costs the main thread
// ~0.5ms a pass; this costs nothing but the draw. The light lands over
// everything the frame draws, so only unclipped light goes here (never
// coins or anything else that has to stay under the HUD)
interface Overlay {
  gl: Gl;
  element: HTMLCanvasElement;
  // the canvas it lies over, in whose device px its instances are
  target: HTMLCanvasElement;
  drawn: boolean;
  // it shows something drawn on an earlier frame
  dirty: boolean;
}
let overlay: Overlay | null = null;
let overlayTarget: HTMLCanvasElement | null = null;
let overlayLive = false;
// Coins (normal blending) get their own WebGL canvas between the game's
// canvas and the top canvas (HUD, flash, spawns), so the browser stacks them
// instead of the game copying a WebGL frame into its 2D canvas every frame
let coinLayer: Overlay | null = null;
let coinLayerLive = false;
let coinLayerOpen = false;

// each tracked canvas's save depth, and the depth its outermost live clip was
// set at
interface ClipState {
  save: number;
  clip: number;
  // bumped by every transform change, so a reader can tell it's unchanged
  // without getTransform (a fresh DOMMatrix each call)
  transform: number;
  // the composite mode last set, null once a restore may have changed it
  composite: string | null;
}
const clipStates = new Map<HTMLCanvasElement, ClipState>();

// ctx.globalCompositeOperation without a native read (a fresh string) on the
// game's canvases
export function compositeOf(ctx: CanvasRenderingContext2D): string {
  const state = clipStates.get(ctx.canvas);
  if (!state) return ctx.globalCompositeOperation;
  return (state.composite ??= ctx.globalCompositeOperation);
}

// a number that changes whenever ctx's transform may have, or -1 when ctx
// isn't tracked
export function transformVersion(ctx: CanvasRenderingContext2D): number {
  return clipStates.get(ctx.canvas)?.transform ?? -1;
}

// whether ctx has a clip set (true when it isn't tracked, to be safe)
export function isClipped(ctx: CanvasRenderingContext2D): boolean {
  const state = clipStates.get(ctx.canvas);
  return !state || state.clip !== Infinity;
}

// the overlays ignore clips, so a batch drawn under one stays on the 2D path:
// the canvas's own save/restore/clip are wrapped once to know when
function trackClips(ctx: CanvasRenderingContext2D): void {
  if (clipStates.has(ctx.canvas)) return;
  const state: ClipState = {
    save: 0,
    clip: Infinity,
    transform: 0,
    composite: null,
  };
  clipStates.set(ctx.canvas, state);
  const composite = Object.getOwnPropertyDescriptor(
    CanvasRenderingContext2D.prototype,
    "globalCompositeOperation",
  );
  if (composite?.set)
    Object.defineProperty(ctx, "globalCompositeOperation", {
      configurable: true,
      get: composite.get,
      set(this: CanvasRenderingContext2D, value: GlobalCompositeOperation) {
        state.composite = null;
        composite.set!.call(this, value);
      },
    });
  const save = ctx.save;
  const restore = ctx.restore;
  const clip = ctx.clip as (...args: unknown[]) => void;
  ctx.save = function (this: CanvasRenderingContext2D) {
    state.save++;
    save.call(this);
  };
  ctx.restore = function (this: CanvasRenderingContext2D) {
    if (state.save > 0) state.save--;
    if (state.save < state.clip) state.clip = Infinity;
    state.transform++;
    state.composite = null;
    restore.call(this);
  };
  ctx.clip = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
    if (state.clip === Infinity) state.clip = state.save;
    clip.apply(this, args);
  } as typeof ctx.clip;
  // fixed arities, no rest arguments: these run hundreds of times a frame
  const { setTransform, resetTransform, transform, translate, scale, rotate } =
    ctx;
  ctx.setTransform = function (
    this: CanvasRenderingContext2D,
    a?: number | DOMMatrix2DInit,
    b?: number,
    c?: number,
    d?: number,
    e?: number,
    f?: number,
  ) {
    state.transform++;
    if (typeof a === "number")
      (
        setTransform as (
          a: number,
          b: number,
          c: number,
          d: number,
          e: number,
          f: number,
        ) => void
      ).call(this, a, b!, c!, d!, e!, f!);
    else setTransform.call(this, a);
  } as typeof ctx.setTransform;
  ctx.resetTransform = function (this: CanvasRenderingContext2D) {
    state.transform++;
    resetTransform.call(this);
  };
  ctx.transform = function (
    this: CanvasRenderingContext2D,
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) {
    state.transform++;
    transform.call(this, a, b, c, d, e, f);
  };
  ctx.translate = function (
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
  ) {
    state.transform++;
    translate.call(this, x, y);
  };
  ctx.scale = function (this: CanvasRenderingContext2D, x: number, y: number) {
    state.transform++;
    scale.call(this, x, y);
  };
  ctx.rotate = function (this: CanvasRenderingContext2D, angle: number) {
    state.transform++;
    rotate.call(this, angle);
  };
}

// keeps element laid exactly over target, hidden while target is
export function layOver(
  target: HTMLCanvasElement,
  element: HTMLCanvasElement,
  onHide?: () => void,
): void {
  const place = () => {
    const shown = !target.hidden && target.clientWidth > 0;
    element.hidden = !shown;
    if (!shown) onHide?.();
    element.style.left = `${target.offsetLeft}px`;
    element.style.top = `${target.offsetTop}px`;
    element.style.width = `${target.clientWidth}px`;
    element.style.height = `${target.clientHeight}px`;
  };
  place();
  new ResizeObserver(place).observe(target);
}

function createLayer(
  target: HTMLCanvasElement,
  className: string,
  onLost: () => void,
): Overlay | null {
  const element = document.createElement("canvas");
  element.className = className;
  element.setAttribute("aria-hidden", "true");
  const gl = createGl(element, () => {
    onLost();
    element.remove();
  });
  if (!gl) return null;
  element.style.visibility = "hidden";
  target.after(element);
  const own: Overlay = { gl, element, target, drawn: false, dirty: false };
  layOver(target, element, () => clearOverlay(own));
  return own;
}

// lays the overlay over target (once), where the browser can add light on
export function attachLightOverlay(target: HTMLCanvasElement): void {
  if (overlayTarget || !target.parentElement) return;
  if (!CSS.supports?.("mix-blend-mode", "plus-lighter")) return;
  overlay = createLayer(target, "game__lights", () => (overlay = null));
  if (!overlay) return;
  overlayTarget = target;
  trackClips(target.getContext("2d")!);
}

// the coin layer, right over target (once)
export function attachCoinLayer(target: HTMLCanvasElement): void {
  if (coinLayer || !target.parentElement) return;
  coinLayer = createLayer(target, "game__coins", () => (coinLayer = null));
}

// light drawn on this canvas (laid over the overlay's target, under the
// overlay) can go on the overlay too
export function trackLightCanvas(ctx: CanvasRenderingContext2D): void {
  trackClips(ctx);
}

function clearOverlay(o: Overlay): void {
  if (!o.dirty) return;
  const { gl } = o.gl;
  gl.disable(gl.SCISSOR_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.SCISSOR_TEST);
  o.dirty = false;
  // an empty layer still costs the compositor a full-screen blend
  o.element.style.visibility = "hidden";
}

// around every frame drawn on the overlay's target: live false keeps this
// frame's light and coins on the 2D canvas
export function beginLightFrame(live: boolean): void {
  overlayLive = live && overlay !== null;
  coinLayerLive = live && coinLayer !== null;
  if (overlay) overlay.drawn = false;
  if (coinLayer) coinLayer.drawn = false;
  for (const state of clipStates.values()) {
    state.save = 0;
    state.clip = Infinity;
  }
}

export function endLightFrame(): void {
  if (overlay && !overlay.drawn) clearOverlay(overlay);
  if (coinLayer && !coinLayer.drawn) clearOverlay(coinLayer);
  overlayLive = false;
  coinLayerLive = false;
  coinLayerOpen = false;
}

// whether ctx's light goes on the overlay right now
export function isOverlayFor(ctx: CanvasRenderingContext2D): boolean {
  if (!overlayLive) return false;
  const state = clipStates.get(ctx.canvas);
  return state !== undefined && state.clip === Infinity;
}

// between true and false, coin batches go on the coin layer (the game's own
// coins, drawn last over the world, never anything drawn over later)
export function openCoinLayer(open: boolean): void {
  coinLayerOpen = open;
}

export function isCoinLayerOpen(): boolean {
  return coinLayerOpen && coinLayerLive && coinLayer !== null;
}

// drawSprites' instances (in the target's device px) onto the coin layer;
// the sheet from createSpriteTexture(..., "coins")
export function drawCoinLayerSprites(
  sheet: SpriteTexture,
  data: Float32Array,
  count: number,
): boolean {
  const o = coinLayer;
  if (!o || o.gl.gl.isContextLost()) return false;
  oneSheet[0] = sheet;
  oneCount[0] = count;
  return drawOnLayer(o, oneSheet, oneCount, 1, data, false);
}

// drawSpriteGroups' additive instances (in the target's device px), straight
// onto the overlay; textures from createSpriteTexture(..., true)
export function drawOverlaySprites(
  sheets: readonly SpriteTexture[],
  counts: ArrayLike<number>,
  groups: number,
  data: Float32Array,
): boolean {
  const o = overlay;
  if (!o || !overlayTarget || o.gl.gl.isContextLost()) return false;
  return drawOnLayer(o, sheets, counts, groups, data, true);
}

function drawOnLayer(
  o: Overlay,
  sheets: readonly SpriteTexture[],
  counts: ArrayLike<number>,
  groups: number,
  data: Float32Array,
  additive: boolean,
): boolean {
  const g = o.gl;
  const { gl } = g;
  let count = 0;
  for (let i = 0; i < groups; i++) count += counts[i];
  if (count === 0) return true;
  const width = o.target.width;
  const height = o.target.height;
  // soft light on a dense screen: half the pixels, stretched back by the browser
  const res = additive && width >= HALF_RES_FROM ? 0.5 : 1;
  const glW = Math.ceil(width * res);
  const glH = Math.ceil(height * res);
  if (o.element.width !== glW || o.element.height !== glH) {
    o.element.width = glW;
    o.element.height = glH;
  }
  gl.viewport(0, 0, glW, glH);
  gl.scissor(0, 0, glW, glH);
  if (!o.drawn) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    o.drawn = true;
    if (!o.dirty) o.element.style.visibility = "visible";
    o.dirty = true;
  }
  gl.uniform2f(g.resolution, width, height);
  gl.blendFunc(gl.ONE, additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(g.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, g.instances);
  const floats = count * SPRITE_FLOATS;
  if (g.capacity < floats) {
    g.capacity = Math.max(floats, g.capacity * 2);
    gl.bufferData(gl.ARRAY_BUFFER, g.capacity * 4, gl.DYNAMIC_DRAW);
  }
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, floats);
  let first = 0;
  for (let i = 0; i < groups; i++) {
    const n = counts[i];
    if (n === 0) continue;
    g.pointAt(first);
    gl.bindTexture(gl.TEXTURE_2D, sheets[i].texture);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    first += n;
  }
  return true;
}
