import { randomInt } from "../utils";
import { loadSprite } from "../loadAssets";
import { createParticlePool, clampedDtSince } from "../shared/particlePool";
import { prepareSoon } from "../shared/idle";
import {
  createSpriteTexture,
  drawSprites,
  SPRITE_FLOATS,
  type SpriteTexture,
} from "../shared/spriteBatch";

// shared coin/bill flipbook sprites + the actual particle physics/draw math —
// floors/coins (particles glued to a specific Floor's own on-screen rect) and
// background/cityMap (its own flat canvas, no Floor at all) each own
// their own particle array (and, for floors/coins, its own extra `floor`
// field per particle), but both spawn/update/draw through the functions
// below, so the actual animation itself only exists in one place
export const COIN_SPIN_FRAME_COUNT = 6;
export const BILL_SPIN_FRAME_COUNT = 6;
// fraction of a burst's particles that are fluttering bills instead of coins
export const COIN_BILL_CHANCE = 0.3;
const MIN_SPIN_RATE = 0.04; // flipbook frames advanced per physics tick (~16.67ms)
const MAX_SPIN_RATE = 0.12;

// each flipbook frame pre-scaled ONCE onto its own small offscreen canvas, so
// drawCoinBurstFrame's own per-particle drawImage() call resamples from an
// already-small source every frame instead of the full-resolution spritesheet
// (coinSpin.png/cashBill.png are ~460px tall native) — the same "pre-downscale
// once at load time" fix already used for coinFloat's single bubble icon,
// generalized to every frame of a flipbook. This is what actually cut the
// per-frame draw cost; the particle COUNT/cap is untouched on purpose — see
// cash-clicker-rendering.md's own notes on why lowering the cap instead was
// the wrong fix (kills the "money rain" look without fixing the real cost).
const PRESCALE_CELL_H = 200; // comfortably above any real on-screen particle size
let coinFrameCanvases: HTMLCanvasElement[] | null = null;
let billFrameCanvases: HTMLCanvasElement[] | null = null;

function buildFrameCanvases(
  image: HTMLImageElement,
  frameCount: number,
): HTMLCanvasElement[] {
  const frameW = image.naturalWidth / frameCount;
  const frameH = image.naturalHeight;
  const cellW = Math.round(PRESCALE_CELL_H * (frameW / frameH));
  const canvases: HTMLCanvasElement[] = [];
  for (let i = 0; i < frameCount; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = cellW;
    canvas.height = PRESCALE_CELL_H;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      i * frameW,
      0,
      frameW,
      frameH,
      0,
      0,
      cellW,
      PRESCALE_CELL_H,
    );
    canvases.push(canvas);
  }
  return canvases;
}

export async function loadCoinBurstImages(): Promise<HTMLImageElement> {
  const [coin, bill] = await Promise.all([
    loadSprite("coinSpin"),
    loadSprite("cashBill"),
  ]);
  coinFrameCanvases = buildFrameCanvases(coin, COIN_SPIN_FRAME_COUNT);
  billFrameCanvases = buildFrameCanvases(bill, BILL_SPIN_FRAME_COUNT);
  // off the startup path, each in its own slice: until then coins draw from
  // the full-size frames
  const coinFrames = coinFrameCanvases;
  const billFrames = billFrameCanvases;
  prepareSoon(() => (coinAtlas = buildAtlas(coinFrames)));
  prepareSoon(() => (billAtlas = buildAtlas(billFrames)));
  prepareSoon(() => buildSheet(coinFrames, billFrames));
  return coin;
}

// every coin and bill frame on one WebGL texture, for batches (see
// beginCoinBatch); each frame's texture rect, coins first, then bills
const SHEET_PAD = 4;
let sheet: SpriteTexture | null = null;
const sheetRects = new Float32Array(
  (COIN_SPIN_FRAME_COUNT + BILL_SPIN_FRAME_COUNT) * 4,
);

function buildSheet(
  coinFrames: HTMLCanvasElement[],
  billFrames: HTMLCanvasElement[],
): void {
  const rows = [coinFrames, billFrames];
  const cellW = Math.max(coinFrames[0].width, billFrames[0].width);
  const cellH = PRESCALE_CELL_H;
  const canvas = document.createElement("canvas");
  canvas.width = (cellW + SHEET_PAD) * COIN_SPIN_FRAME_COUNT;
  canvas.height = (cellH + SHEET_PAD) * rows.length;
  const ctx = canvas.getContext("2d")!;
  let id = 0;
  rows.forEach((frames, row) => {
    frames.forEach((frame, i) => {
      const x = i * (cellW + SHEET_PAD);
      const y = row * (cellH + SHEET_PAD);
      ctx.drawImage(frame, x, y);
      sheetRects[id * 4] = x / canvas.width;
      sheetRects[id * 4 + 1] = y / canvas.height;
      sheetRects[id * 4 + 2] = (x + frame.width) / canvas.width;
      sheetRects[id * 4 + 3] = (y + frame.height) / canvas.height;
      id++;
    });
  });
  sheet = createSpriteTexture(canvas);
}

// every frame at every tilt, pre-rotated onto one atlas per sprite, so a
// coin is one upright blit from one texture: no per-coin transforms, which
// cost phones dearly with hundreds of coins in the air during a long press
const ATLAS_FRAME_H = 128;
// tilts across [-π/2, π/2], both ends included
const AXIS_STEPS = 8;
const AXIS_STEP = Math.PI / AXIS_STEPS;
// coins drawn bigger than this share over the atlas's own frame height take
// the full-size frames instead, so they stay sharp
const ATLAS_MAX_UPSCALE = 1.25;
interface Atlas {
  image: HTMLCanvasElement | ImageBitmap;
  cell: number;
}
let coinAtlas: Atlas | null = null;
let billAtlas: Atlas | null = null;

function buildAtlas(frames: HTMLCanvasElement[]): Atlas {
  const frameW = ATLAS_FRAME_H * (frames[0].width / frames[0].height);
  const cell = Math.ceil(Math.hypot(frameW, ATLAS_FRAME_H)) + 4;
  const canvas = document.createElement("canvas");
  canvas.width = cell * (AXIS_STEPS + 1);
  canvas.height = cell * frames.length;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  frames.forEach((frame, row) => {
    for (let step = 0; step <= AXIS_STEPS; step++) {
      ctx.setTransform(1, 0, 0, 1, (step + 0.5) * cell, (row + 0.5) * cell);
      ctx.rotate(-Math.PI / 2 + step * AXIS_STEP);
      ctx.drawImage(
        frame,
        -frameW / 2,
        -ATLAS_FRAME_H / 2,
        frameW,
        ATLAS_FRAME_H,
      );
    }
  });
  const atlas: Atlas = { image: canvas, cell };
  // a canvas's first draw costs a snapshot of it; a bitmap's doesn't
  void createImageBitmap(canvas).then(
    (bitmap) => {
      atlas.image = bitmap;
    },
    () => {},
  );
  return atlas;
}

export interface CoinBurstSprite {
  kind: "coin" | "bill";
  spinFrame: number; // fractional flipbook position, floored when drawing
  axisAngle: number; // screen-space tilt of the spin's squish axis; 0 if the caller doesn't care
}

// per sprite: how far from its center it reaches when drawn at radius 1, at
// any spin frame and tilt (its farthest opaque pixel), and its fullest frame
// (face-on, covering the most area). Measured once from coinSpin.webp and
// cashBillFlutter.webp (alpha > 40, frames scaled to radius 1) and kept as
// constants: reading the pixels back at startup stalled phones. Re-measure
// if either sheet changes
const spriteShape = {
  coin: { reach: 0.55, fullestFrame: 0 },
  bill: { reach: 0.98, fullestFrame: 0 },
};

export function getSpriteReach(kind: CoinBurstSprite["kind"]): number {
  return spriteShape[kind].reach;
}

export function getFullestFrame(kind: CoinBurstSprite["kind"]): number {
  return spriteShape[kind].fullestFrame;
}

export interface CoinBurstParticle extends CoinBurstSprite {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  gravityRamp: number; // how fast gravity ramps up with age; lower for bills (paper) than coins (metal)
  spinRate: number; // this particle's own frames/tick speed
  spinDir: 1 | -1; // picked once per coin so a burst doesn't spin in lockstep
}

// one burst piece's radius (drawCoinBurstFrame's size)
export function randomCoinBurstSize(): number {
  return (22 + Math.random() * 46) * 1.15 * 1.25;
}

// one burst's worth of particles at (x, y) — same random ranges regardless of
// caller, so a burst looks identical whether it's floors/coins's own
// Floor-anchored version or background/cityMap's flat-canvas one
export function createCoinBurstParticles(
  x: number,
  y: number,
): CoinBurstParticle[] {
  const count = randomInt(40, 85);
  const out: CoinBurstParticle[] = [];
  for (let i = 0; i < count; i++) {
    // upward/outward hemisphere only (not fully random) so coins pop up and out
    // first, then arc back down under gravity instead of scattering downward too
    const angle = -Math.random() * Math.PI;
    const speed = 3 + Math.random() * 16;
    const kind: "coin" | "bill" =
      Math.random() < COIN_BILL_CHANCE ? "bill" : "coin";
    out.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 45 + Math.random() * 75,
      size: randomCoinBurstSize(),
      // bills are paper — they fall a flat 0.2 slower than coins, and ramp up to
      // full fall speed more gradually
      gravity: Math.max(
        0,
        0.2 + Math.random() * 0.35 - (kind === "bill" ? 0.2 : 0),
      ),
      gravityRamp: kind === "bill" ? 0.05 : 0.08,
      kind,
      spinFrame:
        Math.random() *
        (kind === "bill" ? BILL_SPIN_FRAME_COUNT : COIN_SPIN_FRAME_COUNT),
      spinRate: MIN_SPIN_RATE + Math.random() * (MAX_SPIN_RATE - MIN_SPIN_RATE),
      spinDir: Math.random() < 0.5 ? 1 : -1,
      axisAngle: (Math.random() * 2 - 1) * (Math.PI / 2),
    });
  }
  return out;
}

// per-particle physics for one dt (in ~16.67ms "ticks", not seconds — same
// unit spawnCoinBurst's own random ranges above are tuned against); pruning
// expired particles is the pool's own job (see shared/particlePool), not this
// function's
function advanceCoinBurstParticle(p: CoinBurstParticle, dt: number): void {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  // gravity ramps up with age so coins pop up, then drop heavily rather than
  // floating — bills use a much gentler ramp (see gravityRamp's own comment)
  // since paper flutters down instead of dropping like metal
  p.vy += (p.gravity + p.life * p.gravityRamp) * dt;
  p.vx *= Math.pow(0.96, dt);
  p.life += dt;
  p.spinFrame += p.spinDir * p.spinRate * dt;
}

let batchBase: DOMMatrix | null = null;
let batchScale = 1;
let batchWidth = 0;
let batchHeight = 0;
let batchA = 1;
let batchB = 0;
let batchC = 0;
let batchD = 1;
let batchE = 0;
let batchF = 0;
let batchUpright = true;

// between beginCoinBatch and endCoinBatch, drawCoinBurstFrame queues its
// coins in the canvas's device pixels and endCoinBatch draws them all at once
// on WebGL. A batch smaller than SMALL_BATCH is drawn the 2D way: stamping
// the WebGL canvas costs about as much as that many coins
const SMALL_BATCH = 64;
let batchCtx: CanvasRenderingContext2D | null = null;
let queue = new Float32Array(SPRITE_FLOATS * 1024);
let queueFrames = new Uint8Array(1024);
let queued = 0;
// the batch's bounds (left, top, right, bottom): a typed array, since writing
// a fractional number into a module variable boxes a fresh heap number per coin
const box = new Float64Array(4);

// no-op until the coin sheet is ready (or without WebGL): coins then draw
// one by one as they're called
export function beginCoinBatch(ctx: CanvasRenderingContext2D): void {
  if (!sheet) return;
  batchCtx = ctx;
  queued = 0;
  box[0] = box[1] = Infinity;
  box[2] = box[3] = -Infinity;
}

// whether coins drawn on ctx now are queued into an open batch
export function isCoinBatchOpen(ctx: CanvasRenderingContext2D): boolean {
  return batchCtx === ctx;
}

export function endCoinBatch(ctx: CanvasRenderingContext2D): void {
  if (batchCtx !== ctx) return;
  batchCtx = null;
  if (queued === 0) return;
  if (
    queued >= SMALL_BATCH &&
    drawSprites(ctx, sheet!, queue, queued, box[0], box[1], box[2], box[3])
  )
    return;
  // each queued coin's own device-pixel transform, on a unit square
  ctx.save();
  for (let i = 0; i < queued; i++) {
    const o = i * SPRITE_FLOATS;
    const id = queueFrames[i];
    const frame =
      id < COIN_SPIN_FRAME_COUNT
        ? coinFrameCanvases![id]
        : billFrameCanvases![id - COIN_SPIN_FRAME_COUNT];
    ctx.globalAlpha = queue[o + 10];
    ctx.setTransform(
      queue[o + 2],
      queue[o + 3],
      queue[o + 4],
      queue[o + 5],
      queue[o],
      queue[o + 1],
    );
    ctx.drawImage(frame, -1, -1, 2, 2);
  }
  ctx.restore();
}

function growQueue(): void {
  const grown = new Float32Array(queue.length * 2);
  grown.set(queue);
  queue = grown;
  const grownFrames = new Uint8Array(queueFrames.length * 2);
  grownFrames.set(queueFrames);
  queueFrames = grownFrames;
}

// the batch's matrix, scale and canvas size, read once per batch (base is
// fresh per batch): DOMMatrix getters and DOM reads per coin add up
function readBatchMatrix(ctx: CanvasRenderingContext2D, base: DOMMatrix): void {
  batchBase = base;
  batchA = base.a;
  batchB = base.b;
  batchC = base.c;
  batchD = base.d;
  batchE = base.e;
  batchF = base.f;
  batchUpright = batchB === 0 && batchC === 0;
  batchScale = Math.max(Math.hypot(batchA, batchB), Math.hypot(batchC, batchD));
  batchWidth = ctx.canvas.width;
  batchHeight = ctx.canvas.height;
}

// drawCoinBurstFrame's batched path for a caller that already knows the batch
// is open on ctx (see isCoinBatchOpen), its coin's x, y, radius and alpha
// written into coinSpot first: fractional numbers passed as arguments get
// boxed into a fresh heap number each, per coin per frame
export const coinSpot = new Float64Array(4);
export function queueCoinSprite(
  ctx: CanvasRenderingContext2D,
  sprite: CoinBurstSprite,
  base: DOMMatrix,
): void {
  const x = coinSpot[0];
  const y = coinSpot[1];
  const radius = coinSpot[2];
  const alpha = coinSpot[3];
  const bill = sprite.kind === "bill";
  const frameCanvases = bill ? billFrameCanvases : coinFrameCanvases;
  if (!frameCanvases || alpha <= 0) return;
  const frameCount = bill ? BILL_SPIN_FRAME_COUNT : COIN_SPIN_FRAME_COUNT;
  const frame =
    ((Math.floor(sprite.spinFrame) % frameCount) + frameCount) % frameCount;
  if (base !== batchBase) readBatchMatrix(ctx, base);
  const a = batchA;
  const b = batchB;
  const c = batchC;
  const d = batchD;
  const px = a * x + c * y + batchE;
  const py = b * x + d * y + batchF;
  const frameCanvas = frameCanvases[frame];
  const halfW = radius * (frameCanvas.width / frameCanvas.height);
  const cos = Math.cos(sprite.axisAngle);
  const sin = Math.sin(sprite.axisAngle);
  const ux = (a * cos + c * sin) * halfW;
  const uy = (b * cos + d * sin) * halfW;
  const vx = (c * cos - a * sin) * radius;
  const vy = (d * cos - b * sin) * radius;
  const reachX = Math.abs(ux) + Math.abs(vx);
  const reachY = Math.abs(uy) + Math.abs(vy);
  if (
    px + reachX < 0 ||
    py + reachY < 0 ||
    px - reachX > batchWidth ||
    py - reachY > batchHeight
  )
    return;
  if ((queued + 1) * SPRITE_FLOATS > queue.length) growQueue();
  const frameId = (bill ? COIN_SPIN_FRAME_COUNT : 0) + frame;
  const o = queued * SPRITE_FLOATS;
  const r = frameId * 4;
  queue[o] = px;
  queue[o + 1] = py;
  queue[o + 2] = ux;
  queue[o + 3] = uy;
  queue[o + 4] = vx;
  queue[o + 5] = vy;
  queue[o + 6] = sheetRects[r];
  queue[o + 7] = sheetRects[r + 1];
  queue[o + 8] = sheetRects[r + 2];
  queue[o + 9] = sheetRects[r + 3];
  queue[o + 10] = alpha;
  queueFrames[queued++] = frameId;
  if (px - reachX < box[0]) box[0] = px - reachX;
  if (py - reachY < box[1]) box[1] = py - reachY;
  if (px + reachX > box[2]) box[2] = px + reachX;
  if (py + reachY > box[3]) box[3] = py + reachY;
}

function queueCoin(
  frameId: number,
  px: number,
  py: number,
  ux: number,
  uy: number,
  vx: number,
  vy: number,
  alpha: number,
): void {
  const reachX = Math.abs(ux) + Math.abs(vx);
  const reachY = Math.abs(uy) + Math.abs(vy);
  if (
    px + reachX < 0 ||
    py + reachY < 0 ||
    px - reachX > batchWidth ||
    py - reachY > batchHeight ||
    alpha <= 0
  )
    return;
  if ((queued + 1) * SPRITE_FLOATS > queue.length) growQueue();
  const o = queued * SPRITE_FLOATS;
  const r = frameId * 4;
  queue[o] = px;
  queue[o + 1] = py;
  queue[o + 2] = ux;
  queue[o + 3] = uy;
  queue[o + 4] = vx;
  queue[o + 5] = vy;
  queue[o + 6] = sheetRects[r];
  queue[o + 7] = sheetRects[r + 1];
  queue[o + 8] = sheetRects[r + 2];
  queue[o + 9] = sheetRects[r + 3];
  queue[o + 10] = alpha;
  queueFrames[queued++] = frameId;
  if (px - reachX < box[0]) box[0] = px - reachX;
  if (py - reachY < box[1]) box[1] = py - reachY;
  if (px + reachX > box[2]) box[2] = px + reachX;
  if (py + reachY > box[3]) box[3] = py + reachY;
}

// draws one coin/bill particle centered at (x, y) with the given on-screen
// radius — a no-op (not a fallback circle) for however briefly the sprites
// are still loading, since the caller's own particle keeps ticking either way
// and will simply start being visible once loadCoinBurstImages resolves.
// base is ctx's transform for the whole batch (read once by the caller), left
// in place again afterwards
export function drawCoinBurstFrame(
  ctx: CanvasRenderingContext2D,
  sprite: CoinBurstSprite,
  x: number,
  y: number,
  radius: number,
  base: DOMMatrix,
): void {
  const frameCanvases =
    sprite.kind === "bill" ? billFrameCanvases : coinFrameCanvases;
  if (!frameCanvases) return;
  const frameCount =
    sprite.kind === "bill" ? BILL_SPIN_FRAME_COUNT : COIN_SPIN_FRAME_COUNT;
  const frame =
    ((Math.floor(sprite.spinFrame) % frameCount) + frameCount) % frameCount;
  const destH = radius * 2;
  if (base !== batchBase) readBatchMatrix(ctx, base);
  const a = batchA;
  const b = batchB;
  const c = batchC;
  const d = batchD;
  const e = batchE;
  const f = batchF;
  const px = a * x + c * y + e;
  const py = b * x + d * y + f;
  if (batchCtx === ctx) {
    const frameCanvas = frameCanvases[frame];
    const halfH = destH / 2;
    const halfW = halfH * (frameCanvas.width / frameCanvas.height);
    const cos = Math.cos(sprite.axisAngle);
    const sin = Math.sin(sprite.axisAngle);
    queueCoin(
      (sprite.kind === "bill" ? COIN_SPIN_FRAME_COUNT : 0) + frame,
      px,
      py,
      (a * cos + c * sin) * halfW,
      (b * cos + d * sin) * halfW,
      (c * cos - a * sin) * halfH,
      (d * cos - b * sin) * halfH,
      ctx.globalAlpha,
    );
    return;
  }
  const atlas = sprite.kind === "bill" ? billAtlas : coinAtlas;
  const step = Math.round((sprite.axisAngle + Math.PI / 2) / AXIS_STEP);
  if (
    atlas &&
    batchUpright &&
    step >= 0 &&
    step <= AXIS_STEPS &&
    destH * batchScale <= ATLAS_FRAME_H * ATLAS_MAX_UPSCALE
  ) {
    const side = atlas.cell * (destH / ATLAS_FRAME_H);
    const reach = side * batchScale;
    if (
      px + reach < 0 ||
      py + reach < 0 ||
      px - reach > batchWidth ||
      py - reach > batchHeight
    )
      return;
    ctx.drawImage(
      atlas.image,
      step * atlas.cell,
      frame * atlas.cell,
      atlas.cell,
      atlas.cell,
      x - side / 2,
      y - side / 2,
      side,
      side,
    );
    return;
  }
  const frameCanvas = frameCanvases[frame];
  // frames share one cell size, so the coin's diameter maps to height and width
  // follows the cell's own aspect ratio — that's what makes thinner edge-on
  // frames actually read as the coin thinning, not just shrinking
  const destW = destH * (frameCanvas.width / frameCanvas.height);
  // coins flung past the canvas edge still cost a full draw call each
  const reach = Math.max(destW, destH) * batchScale;
  if (
    px + reach < 0 ||
    py + reach < 0 ||
    px - reach > batchWidth ||
    py - reach > batchHeight
  )
    return;
  // one setTransform instead of translate/rotate and back: hundreds of coins
  // a frame during a big crit
  const cos = Math.cos(sprite.axisAngle);
  const sin = Math.sin(sprite.axisAngle);
  ctx.setTransform(
    a * cos + c * sin,
    b * cos + d * sin,
    c * cos - a * sin,
    d * cos - b * sin,
    px,
    py,
  );
  ctx.drawImage(frameCanvas, -destW / 2, -destH / 2, destW, destH);
  ctx.setTransform(a, b, c, d, e, f);
}

// the point on a coin's rim, as drawCoinBurstFrame draws it right now (its
// spin frame's width and its tilt), at `angle` round its own face (0 = right)
export function getCoinRimPoint(
  sprite: CoinBurstSprite,
  x: number,
  y: number,
  radius: number,
  angle: number,
): { x: number; y: number } {
  const frameCanvases =
    sprite.kind === "bill" ? billFrameCanvases : coinFrameCanvases;
  const frameCount =
    sprite.kind === "bill" ? BILL_SPIN_FRAME_COUNT : COIN_SPIN_FRAME_COUNT;
  const frame =
    ((Math.floor(sprite.spinFrame) % frameCount) + frameCount) % frameCount;
  const frameCanvas = frameCanvases?.[frame];
  const halfH = radius;
  const halfW = frameCanvas
    ? halfH * (frameCanvas.width / frameCanvas.height)
    : halfH;
  const lx = Math.cos(angle) * halfW;
  const ly = Math.sin(angle) * halfH;
  const cos = Math.cos(sprite.axisAngle);
  const sin = Math.sin(sprite.axisAngle);
  return { x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos };
}

// the actually-simple API: no Floor, no ctx, no page dependency — a position
// (and, optionally, a scale — 1 is tuned for a full building-width canvas;
// pass smaller for a smaller one) is all spawning needs. Every active burst
// everywhere lives in this one pool, ticked/drawn by drawActiveCoinBursts
// below — pruning only happens there, which only runs while whichever screen
// spawned a burst (the city map, a Floor-anchored one) is actually
// being redrawn, so the pool's own cap (not just per-particle expiry) is what
// keeps a burst spawned right as that screen closes from accumulating forever
const pool = createParticlePool<CoinBurstParticle>(750);
let lastActiveUpdateAt: number | null = null;

export function hasActiveCoinBursts(): boolean {
  return pool.hasActive();
}

export function spawnCoinBurstAt(x: number, y: number, scale = 1): void {
  for (const p of createCoinBurstParticles(x, y)) {
    // scales position (relative to the spawn point, so the burst still
    // starts exactly at x,y), velocity, size, and gravity together, so a
    // smaller-scale burst is a uniformly shrunk version of the same burst,
    // not just smaller sprites moving at full-size speed
    p.x = x + (p.x - x) * scale;
    p.y = y + (p.y - y) * scale;
    p.vx *= scale;
    p.vy *= scale;
    p.size *= scale;
    p.gravity *= scale;
    p.gravityRamp *= scale;
    pool.spawn(p);
  }
}

// call once per frame from the caller's own render loop, passing whatever
// timestamp it already has (e.g. requestAnimationFrame's own) — advances
// every active burst by however long it's been since the last call, then
// draws them all straight onto ctx. A no-op once nothing's left bursting
export function drawActiveCoinBursts(
  ctx: CanvasRenderingContext2D,
  now: number,
): void {
  if (!pool.hasActive()) {
    lastActiveUpdateAt = null;
    return;
  }
  const dt = clampedDtSince(lastActiveUpdateAt, now);
  lastActiveUpdateAt = now;
  pool.update(dt, advanceCoinBurstParticle);
  const base = ctx.getTransform();
  beginCoinBatch(ctx);
  for (const p of pool.list) {
    const t = p.life / p.maxLife;
    const radius = p.size * (1 - t * 0.3);
    ctx.globalAlpha = Math.max(0, 1 - t);
    drawCoinBurstFrame(ctx, p, p.x, p.y, radius, base);
  }
  ctx.globalAlpha = 1;
  endCoinBatch(ctx);
}
