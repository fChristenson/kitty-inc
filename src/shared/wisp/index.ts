// the wisp: a will-o'-the-wisp of spirit light — one small white-hot head
// trailing a long stream of tiny twinkling sparkles that starts tight behind
// it and scatters wider and sinks a little as it dims. Shared by every event
// that sends one flitting about, with the playful swoop it flies along
import { COLOR } from "../../palette";
import { radialFade } from "../goldShimmer";
import { hash01, paintTwinkleAt, stampTwinkle } from "../twinkle";

export type Point = { x: number; y: number };

// every wisp's size, passed as drawWisp's `size` (times any grow-in)
export const WISP_SIZE = 40;

// the head: a white-hot core, smeared back along its last few ms of flight,
// in a soft gold halo, with a few sparkles packed tight round it
const CORE = 0.7; // its glow radius, of the wisp's size
const SMEAR = 6;
const SMEAR_MS = 12;
const HALO = 2.6;
const HALO_ALPHA = 0.3;
const HUDDLE = 10;
const HUDDLE_REACH = 0.5;
// the trail: a sparkle shed every TAIL_MS living TAIL_LIFE_MS, scattering out
// to SPREAD of the wisp's size and sinking SINK of it by the end
const TAIL_MS = 4;
const TAIL_LIFE_MS = 1_200;
// how long a wisp's trail lingers after it's gone
export const WISP_TRAIL_MS = TAIL_LIFE_MS;
const SPREAD = 2.4;
const SINK = 0.8;
// a sparkle's glow radius, of the wisp's size; GLINTS of them are tiny crosses
const SPARKLE: [number, number] = [0.08, 0.3];
const GLINTS = 0.3;
const GLINT_SIZE = 2.4; // of its glow radius
// each flickers between TWINKLE_MIN and full brightness
const TWINKLE_MIN = 0.2;
const TWINKLE_MS: [number, number] = [90, 260];
const SPARKLE_COLORS = [
  COLOR.white,
  COLOR.wispGlitter,
  COLOR.white,
  COLOR.heavenlyGold,
  COLOR.wispGlitter,
] as const;

// every sparkle the wisp stamps, all on one canvas so the GPU can draw a
// whole trail from one texture: per color a soft glowing dot with a tiny
// white-hot middle, and its twinkle at a few sizes and turns
const ATLAS_COLORS = [COLOR.white, COLOR.wispGlitter, COLOR.heavenlyGold];
const SPARKLE_COLOR_INDEX = SPARKLE_COLORS.map((c) => ATLAS_COLORS.indexOf(c));
const GLOW_HALF = 32;
const GLINT_HALVES = [8, 16, 32, 64];
// a twinkle looks the same turned a quarter turn; trail sparkles never spin,
// so a few turns are plenty
const GLINT_TURNS = 8;
const QUARTER = Math.PI / 2;
// kept clear round each cell so neighbours never bleed in when scaled
const PAD = 2;
// atlas px to spare per world unit, for canvases scaled up a little
const GLINT_SHARPNESS = 1.25;

interface Cell {
  x: number;
  y: number;
  half: number;
}

let atlas: HTMLCanvasElement | null = null;
const glowCells: Cell[] = [];
// [color][size][turn]
const glintCells: Cell[][][] = [];

function buildAtlas(): HTMLCanvasElement {
  const rowWidth =
    GLINT_TURNS * (GLINT_HALVES[GLINT_HALVES.length - 1] * 2 + PAD * 2);
  const blockHeight =
    GLOW_HALF * 2 +
    PAD * 2 +
    GLINT_HALVES.reduce((sum, half) => sum + half * 2 + PAD * 2, 0);
  const canvas = document.createElement("canvas");
  canvas.width = rowWidth;
  canvas.height = blockHeight * ATLAS_COLORS.length;
  const ctx = canvas.getContext("2d")!;
  ATLAS_COLORS.forEach((color, c) => {
    let top = c * blockHeight;
    const glow: Cell = {
      x: PAD + GLOW_HALF,
      y: top + PAD + GLOW_HALF,
      half: GLOW_HALF,
    };
    const g = ctx.createRadialGradient(
      glow.x,
      glow.y,
      0,
      glow.x,
      glow.y,
      GLOW_HALF,
    );
    g.addColorStop(0, COLOR.white);
    g.addColorStop(0.15, COLOR.white);
    g.addColorStop(0.3, `${color}AA`);
    g.addColorStop(0.6, `${color}22`);
    g.addColorStop(1, `${color}00`);
    ctx.fillStyle = g;
    ctx.fillRect(
      glow.x - GLOW_HALF,
      glow.y - GLOW_HALF,
      GLOW_HALF * 2,
      GLOW_HALF * 2,
    );
    glowCells[c] = glow;
    top += GLOW_HALF * 2 + PAD * 2;
    glintCells[c] = GLINT_HALVES.map((half) => {
      const row = Array.from({ length: GLINT_TURNS }, (_, step) => {
        const cell: Cell = {
          x: step * (half * 2 + PAD * 2) + PAD + half,
          y: top + PAD + half,
          half,
        };
        paintTwinkleAt(
          ctx,
          cell.x,
          cell.y,
          half,
          (step / GLINT_TURNS) * QUARTER,
          color,
        );
        return cell;
      });
      top += half * 2 + PAD * 2;
      return row;
    });
  });
  return canvas;
}

function stampCell(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number,
  r: number,
): void {
  ctx.drawImage(
    atlas!,
    cell.x - cell.half,
    cell.y - cell.half,
    cell.half * 2,
    cell.half * 2,
    x - r,
    y - r,
    r * 2,
    r * 2,
  );
}

// colorIndex into ATLAS_COLORS
function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  colorIndex: number,
): void {
  atlas ??= buildAtlas();
  stampCell(ctx, glowCells[colorIndex], x, y, r);
}

function drawGlint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  turn: number,
  colorIndex: number,
): void {
  atlas ??= buildAtlas();
  const need = size * GLINT_SHARPNESS;
  let level = 0;
  while (level < GLINT_HALVES.length && GLINT_HALVES[level] < need) level++;
  if (level === GLINT_HALVES.length) {
    stampTwinkle(ctx, x, y, size, turn, ATLAS_COLORS[colorIndex]);
    return;
  }
  const quarterTurn = ((turn % QUARTER) + QUARTER) % QUARTER;
  const step = Math.round((quarterTurn / QUARTER) * GLINT_TURNS) % GLINT_TURNS;
  stampCell(ctx, glintCells[colorIndex][level][step], x, y, size);
}

// the head's soft gold halo, fading out to its edge
const HALO_SPRITE_HALF = 64;
let haloCanvas: HTMLCanvasElement | null = null;

function haloSprite(): HTMLCanvasElement {
  if (haloCanvas) return haloCanvas;
  haloCanvas = document.createElement("canvas");
  haloCanvas.width = haloCanvas.height = HALO_SPRITE_HALF * 2;
  const ctx = haloCanvas.getContext("2d")!;
  ctx.fillStyle = radialFade(
    ctx,
    HALO_SPRITE_HALF,
    HALO_SPRITE_HALF,
    HALO_SPRITE_HALF,
    COLOR.heavenlyGold,
  );
  ctx.fillRect(0, 0, HALO_SPRITE_HALF * 2, HALO_SPRITE_HALF * 2);
  return haloCanvas;
}

// a sparkle dimmer than this isn't worth a draw
const MIN_ALPHA = 0.02;

// every trail drawn in one frame shares this many sparkles: a lone wisp gets
// its full trail, a swarm thins each one (keeping the same sparkles each frame).
// The budget shrinks toward TRAIL_BUDGET_MIN while frames run slow
const TRAIL_BUDGET = 900;
const TRAIL_BUDGET_MIN = 350;
const SLOW_FRAME_MS = 21;
const FULL_TRAIL = TAIL_LIFE_MS / TAIL_MS;
// a trail drawn this long after the last one starts a new frame
const FRAME_GAP_MS = 4;
let lastTrailAt = -Infinity;
let frameStartedAt = -Infinity;
let frameGapMs = 16;
let trailBudget = TRAIL_BUDGET;
// trails that shed a sparkle: a wisp long gone doesn't thin the live ones
let trailsThisFrame = 0;
let trailsLastFrame = 0;
// heads drawn: past HEAD_FULL in a frame each gets a lighter smear and huddle
const HEAD_FULL = 10;
let headsThisFrame = 0;
let headsLastFrame = 0;
let lastHeadAt = -Infinity;

function startFrameIfNew(t: number): void {
  if (t - Math.max(lastTrailAt, lastHeadAt) <= FRAME_GAP_MS) return;
  if (frameStartedAt > -Infinity) {
    frameGapMs = frameGapMs * 0.8 + Math.min(100, t - frameStartedAt) * 0.2;
    trailBudget =
      frameGapMs > SLOW_FRAME_MS
        ? Math.max(TRAIL_BUDGET_MIN, trailBudget * 0.9)
        : Math.min(TRAIL_BUDGET, trailBudget * 1.02);
  }
  frameStartedAt = t;
  trailsLastFrame = trailsThisFrame;
  trailsThisFrame = 0;
  headsLastFrame = headsThisFrame;
  headsThisFrame = 0;
}

function trailStride(): number {
  const t = performance.now();
  startFrameIfNew(t);
  lastTrailAt = t;
  const trails = Math.max(trailsThisFrame + 1, trailsLastFrame);
  return Math.max(1, Math.ceil((trails * FULL_TRAIL) / trailBudget));
}

// 1 for the first HEAD_FULL heads in a frame, falling as more crowd in
function headDetail(): number {
  const t = performance.now();
  startFrameIfNew(t);
  lastHeadAt = t;
  headsThisFrame++;
  const heads = Math.max(headsThisFrame, headsLastFrame);
  return heads <= HEAD_FULL ? 1 : Math.max(0.2, HEAD_FULL / heads);
}

// each trail sparkle's looks, hashed once per slot rather than every frame
// (slots repeat every SLOTS sparkles, many seconds of trail apart)
const SLOTS = 4096;
const slotCos = new Float32Array(SLOTS);
const slotSin = new Float32Array(SLOTS);
const slotSpread = new Float32Array(SLOTS);
const slotSize = new Float32Array(SLOTS);
const slotRate = new Float32Array(SLOTS);
const slotTurn = new Float32Array(SLOTS);
const slotGlint = new Uint8Array(SLOTS);
for (let i = 0; i < SLOTS; i++) {
  const angle = hash01(i, 31) * Math.PI * 2;
  slotCos[i] = Math.cos(angle);
  slotSin[i] = Math.sin(angle);
  slotSpread[i] = Math.abs(hash01(i, 32) + hash01(i, 33) - 1);
  slotSize[i] = SPARKLE[0] + (SPARKLE[1] - SPARKLE[0]) * hash01(i, 34) ** 2;
  slotRate[i] = sparkleRate(i);
  slotTurn[i] = hash01(i, 73);
  slotGlint[i] = hash01(i, 72) < GLINTS ? 1 : 0;
}

// radians of flicker per ms
function sparkleRate(seed: number): number {
  return (
    (Math.PI * 2) /
    (TWINKLE_MS[0] + (TWINKLE_MS[1] - TWINKLE_MS[0]) * hash01(seed, 71))
  );
}

// one sparkle, in the "lighter" composite the caller already set
function stampSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  rate: number,
  glint: boolean,
  turn: number,
  alpha: number,
  now: number,
): void {
  if (r <= 0) return;
  const wave = 0.5 + 0.5 * Math.sin(now * rate + seed);
  const wave2 = wave * wave;
  const shown = Math.min(
    1,
    alpha * (TWINKLE_MIN + (1 - TWINKLE_MIN) * wave2 * wave2),
  );
  if (shown < MIN_ALPHA) return;
  const colorIndex =
    SPARKLE_COLOR_INDEX[Math.abs(seed) % SPARKLE_COLOR_INDEX.length];
  ctx.globalAlpha = shown;
  if (glint) drawGlint(ctx, x, y, r * GLINT_SIZE, turn, colorIndex);
  else drawGlow(ctx, x, y, r, colorIndex);
}

// one tiny twinkling sparkle of glow radius r at (x, y); seed picks its
// color, its rhythm and whether it glints as a cross. Brightens what's behind it
export function drawGlitterLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  alpha: number,
  now: number,
): void {
  if (r <= 0 || alpha <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  stampSparkle(
    ctx,
    x,
    y,
    r,
    seed,
    sparkleRate(seed),
    hash01(seed, 72) < GLINTS,
    hash01(seed, 73),
    alpha,
    now,
  );
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

// the wisp at at(ms) with its sparkle trail through where it just was; at
// returns null while it's off stage (a fixed point makes a hovering wisp
// fizzing in place). size sets its scale; heat 0..1 swells its white core
export function drawWisp(
  ctx: CanvasRenderingContext2D,
  at: (ms: number) => Point | null,
  ms: number,
  now: number,
  size: number,
  heat = 0,
): void {
  drawWispTrail(ctx, at, ms, now, size);
  drawWispHead(ctx, at, ms, now, size, heat);
}

// just the sparkle trail, for a caller drawing the head under its own transform
export function drawWispTrail(
  ctx: CanvasRenderingContext2D,
  at: (ms: number) => Point | null,
  ms: number,
  now: number,
  size: number,
): void {
  if (size <= 0) return;
  const stride = trailStride();
  // a thinned trail's sparkles brighten (and grow a touch) to keep its glow;
  // the look was tuned at one sparkle per 3ms
  const thinned = (stride * TAIL_MS) / 3;
  const grow = thinned ** 0.12;
  const brighten = thinned ** 0.45;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  const first = Math.floor((ms - TAIL_LIFE_MS) / TAIL_MS);
  const start = (Math.floor(first / stride) + 1) * stride;
  let shed = false;
  for (let e = start; e <= Math.floor(ms / TAIL_MS); e += stride) {
    const bornAt = e * TAIL_MS;
    const age = (ms - bornAt) / TAIL_LIFE_MS;
    const alpha = (1 - age) ** 1.2;
    if (alpha < MIN_ALPHA) continue;
    const from = at(bornAt);
    if (!from) continue;
    shed = true;
    // tight behind the head, scattering wider (mostly near the middle) as it ages
    const slot = e & (SLOTS - 1);
    const spread = size * SPREAD * age ** 0.7 * slotSpread[slot];
    stampSparkle(
      ctx,
      from.x + slotCos[slot] * spread,
      from.y + slotSin[slot] * spread + size * SINK * age * age,
      size * slotSize[slot] * (1 - 0.4 * age) * grow,
      e,
      slotRate[slot],
      slotGlint[slot] === 1,
      slotTurn[slot],
      alpha * brighten,
      now,
    );
  }
  if (shed) trailsThisFrame++;
  lastTrailAt = performance.now();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

// just the head, smeared back along at() over its last few ms of flight
export function drawWispHead(
  ctx: CanvasRenderingContext2D,
  at: (ms: number) => Point | null,
  ms: number,
  now: number,
  size: number,
  heat = 0,
): void {
  const head = at(ms);
  if (!head || size <= 0) return;
  const detail = headDetail();
  const smear = Math.max(1, Math.round(SMEAR * detail));
  const huddle = Math.round(HUDDLE * detail);
  const halo = size * HALO * (1 + 0.5 * heat);
  ctx.globalAlpha = Math.min(1, HALO_ALPHA * (1 + heat));
  ctx.drawImage(haloSprite(), head.x - halo, head.y - halo, halo * 2, halo * 2);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  const core = size * CORE * (1 + 0.6 * heat);
  for (let k = smear; k >= 0; k--) {
    const p = at(ms - (k * SMEAR * SMEAR_MS) / smear) ?? head;
    ctx.globalAlpha = 1 - k / (smear + 1);
    drawGlow(ctx, p.x, p.y, core * (1 - (0.6 * k) / smear), 0);
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < huddle; i++) {
    const angle =
      hash01(i, 41) * Math.PI * 2 + now / (300 + 200 * hash01(i, 42));
    const reach = size * HUDDLE_REACH * Math.sqrt(hash01(i, 43));
    const seed = i + 1000;
    stampSparkle(
      ctx,
      head.x + Math.cos(angle) * reach,
      head.y + Math.sin(angle) * reach,
      size * SPARKLE[1],
      seed,
      slotRate[seed],
      slotGlint[seed] === 1,
      slotTurn[seed],
      1,
      now,
    );
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

// a playful swoop from a to b, t 0..1: bowed out to one side by up to `bend`
// of its length (picked by seed) and wiggling `wiggles` times
export function swoop(
  a: Point,
  b: Point,
  t: number,
  seed: number,
  bend: number,
  wiggles: number,
  wiggleAmp: number,
): Point {
  const e = t * t * (3 - 2 * t);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const bow = (hash01(seed, 1) - 0.5) * 2 * bend;
  const wiggle =
    Math.sin(t * wiggles * Math.PI * 2) * wiggleAmp * Math.sin(Math.PI * t);
  const side = bow * length * 4 * e * (1 - e) + wiggle;
  return {
    x: a.x + dx * e - (dy / length) * side,
    y: a.y + dy * e + (dx / length) * side,
  };
}
