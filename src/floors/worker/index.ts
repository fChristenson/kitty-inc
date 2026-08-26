import { FLOOR_X_MIN, FLOOR_X_MAX } from "../constants";
import { isBoosted, getWorkerSpriteIndexes, type Floor } from "../../gameState";
import { loadImage, randomInt } from "../../utils";

// every processed worker skin (see scripts/process-cat-sprites.mjs, which writes
// here), in a stable sorted-filename order — each is a single row of 5 equal-size
// cells, feet aligned to the same bottom row in every cell. Cell size can differ
// slightly between skins (it's fit to that skin's own art), so it's read from each
// loaded image's natural size rather than hardcoded
const spriteModules = import.meta.glob<string>(
  "../../assets/sprites/*Walk.png",
  { eager: true, import: "default" },
);
const spriteUrls = Object.keys(spriteModules)
  .sort()
  .map((key) => spriteModules[key]);
const FRAME_COUNT = 5;
// frames 2/3 are the two mirrored mid-stride poses (left-leg-forward / right-leg-
// forward) and alternate forever as the walk loop; frames 0/1 play once, in order,
// as a brief turn-around transition right after a direction reversal (see
// TURN_FRAME_MS below) before the walk loop resumes; frame 4 (arms-up happy pose) is
// reserved for the click reaction.
const WALK_FRAMES = [2, 3];
const TURN_FRAMES = [0, 1];
const CLICK_FRAME = 4;
const WALK_FRAME_MS = 260; // how long each walk-cycle frame is held on screen
// every pose in the sheet faces the camera head-on rather than in profile, so
// flipping mid-stride whenever direction reverses can momentarily show legs
// "swapping sides" — playing the short TURN_FRAMES sequence (already mirrored to
// the new direction) right after a turn hides that seam, then the walk loop resumes
// cleanly from its own first frame instead of wherever the shared clock lands
const TURN_FRAME_MS = 260;

// on-screen render size of one worker; width is aspect-locked per-skin (see
// drawFigure) since each skin's own cell aspect ratio can differ slightly
const RENDER_H = 480;

let workerSprites: HTMLImageElement[] = [];

// loads every worker skin once; main.ts awaits this alongside loadFloorBackgrounds
// before the first frame ever needs to draw a worker
export async function loadWorkerSprites(): Promise<HTMLImageElement[]> {
  workerSprites = await Promise.all(spriteUrls.map(loadImage));
  return workerSprites;
}

const WALK_SPEED = 50; // px/sec
const BOOSTED_WALK_SPEED = WALK_SPEED * 2;
// feet rest well above the bottom income/upgrade panels (which start at y=577) so the
// worker is always visible walking across the open floor instead of ducking behind them
const WORKER_FEET_Y = 650;
const CLICK_BOUNCE_MS = 300; // how long the little "boing" reaction plays after a click
const CLICK_COOLDOWN_MS = 500; // ignore re-clicks faster than this so coin bursts don't stack up
// generous click-target box around the figure; every skin's cell is close enough to
// the same ~0.48 width/height aspect ratio that a single approximate width works
// fine here (unlike drawFigure's actual render size, this doesn't need to be exact)
const HIT_HALF_WIDTH = RENDER_H * 0.48 * 0.5 + 10;
const HIT_TOP = RENDER_H + 10;
const HIT_BOTTOM = 10;
// workerMenu.ts caps floor.workerCount at this too, so every worker a floor has is
// always one of the little figures actually drawn/walked here
export const MAX_RENDERED_WORKERS = 3;

interface WalkerState {
  x: number;
  direction: 1 | -1;
  lastUpdate: number;
  facingSince: number; // when direction last changed, so a turn briefly shows FACING_FRAME
  clickedAt: number; // Date.now() of this worker's own last click, -Infinity if never clicked
}

interface FloorWorkers {
  walkers: WalkerState[];
}

// each floor gets its own independent set of walkers, keyed by the floor itself
const floorWorkers = new WeakMap<Floor, FloorWorkers>();

// picks a skin for a new walker: prefers one none of this floor's other current
// walkers are already wearing (randomly among whichever qualify), falling back to
// any random skin once every skin is already in use
function pickSpriteIndex(existingIndexes: number[]): number {
  const count = workerSprites.length;
  if (count <= 1) return 0;
  const used = new Set(existingIndexes);
  const unused: number[] = [];
  for (let i = 0; i < count; i++) if (!used.has(i)) unused.push(i);
  const pool =
    unused.length > 0 ? unused : Array.from({ length: count }, (_, i) => i);
  return pool[randomInt(0, pool.length - 1)];
}

function makeWalker(index: number, total: number, now: number): WalkerState {
  // spreads walkers into evenly-spaced starting bands instead of piling them on
  // top of each other when a floor has more than one
  const bandWidth = (FLOOR_X_MAX - FLOOR_X_MIN) / total;
  const bandStart = FLOOR_X_MIN + bandWidth * index;
  return {
    x: bandStart + Math.random() * bandWidth,
    direction: Math.random() < 0.5 ? 1 : -1,
    lastUpdate: now,
    facingSince: now,
    clickedAt: -Infinity,
  };
}

function getFloorWorkers(floor: Floor, now: number): FloorWorkers {
  let state = floorWorkers.get(floor);
  if (!state) {
    state = { walkers: [] };
    floorWorkers.set(floor, state);
  }
  const targetCount = Math.min(
    Math.max(floor.workerCount, 1),
    MAX_RENDERED_WORKERS,
  );
  while (state.walkers.length < targetCount) {
    state.walkers.push(makeWalker(state.walkers.length, targetCount, now));
  }
  if (state.walkers.length > targetCount) state.walkers.length = targetCount;

  // a persisted skin pick (survives reload) exists per worker index once assigned;
  // grow it here (never shrink — a restored floor may briefly have more picks than
  // currently-rendered workers if MAX_RENDERED_WORKERS changes) the first time each
  // index is actually drawn, avoiding duplicates among this floor's other workers
  const spriteIndexes = getWorkerSpriteIndexes(floor);
  while (spriteIndexes.length < state.walkers.length) {
    spriteIndexes.push(pickSpriteIndex(spriteIndexes));
  }
  return state;
}

// which of a floor's rendered workers a floor-local canvas point falls on, if any
export function hitTestWorker(
  x: number,
  y: number,
  floor: Floor,
): number | null {
  if (!floor.unlocked) return null;
  const state = floorWorkers.get(floor);
  if (!state) return null;

  const withinY =
    y >= WORKER_FEET_Y - HIT_TOP && y <= WORKER_FEET_Y + HIT_BOTTOM;
  if (!withinY) return null;
  const index = state.walkers.findIndex(
    (w) => x >= w.x - HIT_HALF_WIDTH && x <= w.x + HIT_HALF_WIDTH,
  );
  return index === -1 ? null : index;
}

// starts the clicked worker's own click-bounce animation and reports whether the click
// should spawn a coin burst; returns false while that specific worker is still on
// cooldown, so rapid clicks on it can't pile up coins (clicking a different worker on
// the same floor is unaffected)
export function clickWorker(
  floor: Floor,
  workerIndex: number,
  now: number,
): boolean {
  const walker = getFloorWorkers(floor, now).walkers[workerIndex];
  if (!walker) return false;
  if (now - walker.clickedAt < CLICK_COOLDOWN_MS) return false;
  walker.clickedAt = now;
  return true;
}

// on-screen (floor-local) center of one of a floor's workers, for aiming a coin burst
// at it; null if it hasn't been drawn yet (shouldn't happen once unlocked)
export function getWorkerCenter(
  floor: Floor,
  workerIndex: number,
): { x: number; y: number } | null {
  const walker = floorWorkers.get(floor)?.walkers[workerIndex];
  if (!walker) return null;
  return { x: walker.x, y: WORKER_FEET_Y - RENDER_H / 2 };
}

// on-screen (floor-local) center of every currently-boosted worker on the floor, so
// the floating-coin animation only plays at the ones actually boosted
export function getBoostedWorkerCenters(
  floor: Floor,
  now: number,
): { x: number; y: number }[] {
  const state = floorWorkers.get(floor);
  if (!state) return [];
  const y = WORKER_FEET_Y - RENDER_H / 2;
  return state.walkers
    .map((w, i) => ({ x: w.x, y, boosted: isBoosted(floor, i, now) }))
    .filter((w) => w.boosted)
    .map(({ x, y }) => ({ x, y }));
}

// draws one worker's current walk-cycle/click-reaction frame at (cx, groundY), facing
// per direction; groundY is where its feet touch down
function drawFigure(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  cx: number,
  groundY: number,
  direction: 1 | -1,
  frame: number,
): void {
  const frameW = sprite.naturalWidth / FRAME_COUNT;
  const frameH = sprite.naturalHeight;
  const renderW = (RENDER_H * frameW) / frameH;

  ctx.save();
  ctx.translate(cx, groundY);
  // the jump/click pose (frame 4) is authored mirrored relative to every other
  // frame in the sheet, so it needs the opposite mirror rule to still face the
  // walker's actual direction
  const mirrored = frame === CLICK_FRAME ? direction === 1 : direction === -1;
  ctx.scale(mirrored ? -1 : 1, 1);
  ctx.drawImage(
    sprite,
    frame * frameW,
    0,
    frameW,
    frameH,
    -renderW / 2,
    -RENDER_H,
    renderW,
    RENDER_H,
  );
  ctx.restore();
}

// this walker's current frame: TURN_FRAMES played once right after its last
// direction turn, then the walk loop cycling cleanly from its own first frame
function walkFrameFor(walker: WalkerState, now: number): number {
  const sinceTurn = now - walker.facingSince;
  const turnDuration = TURN_FRAMES.length * TURN_FRAME_MS;
  if (sinceTurn < turnDuration) {
    return TURN_FRAMES[Math.floor(sinceTurn / TURN_FRAME_MS)];
  }
  const step =
    Math.floor((sinceTurn - turnDuration) / WALK_FRAME_MS) % WALK_FRAMES.length;
  return WALK_FRAMES[step];
}

// up to MAX_RENDERED_WORKERS little cats (walk-cycle sprite flipbook) that pace back
// and forth across the floor's walkable band; no-ops on locked floors (nothing to
// animate behind the grey overlay) or before the sprite sheet has finished loading
export function drawWorker(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  now: number,
): void {
  if (!floor.unlocked || workerSprites.length === 0) return;

  const state = getFloorWorkers(floor, now);
  const spriteIndexes = getWorkerSpriteIndexes(floor);

  state.walkers.forEach((walker, i) => {
    const speed = isBoosted(floor, i, now) ? BOOSTED_WALK_SPEED : WALK_SPEED;
    // exact position never needs to be preserved (it's not persisted, and nobody
    // notices where a worker "was" after a gap) so there's no reason to cap this at
    // 0.1s — that cap was actually the cause of the visible slowdown: any redraw gap
    // over 100ms (common for a boosted/faster worker, or a floor cycling in and out
    // of gameRenderer's IntersectionObserver buffer while scrolling) got truncated to
    // a fixed 0.1s worth of movement instead of the real distance covered, making
    // motion look like it kept stuttering to a crawl. Using the real elapsed time and
    // letting the boundary clamp below catch any overshoot fixes that outright.
    const dtSeconds = Math.max((now - walker.lastUpdate) / 1000, 0);
    walker.lastUpdate = now;
    walker.x += walker.direction * speed * dtSeconds;
    if (walker.x >= FLOOR_X_MAX) {
      walker.x = FLOOR_X_MAX;
      if (walker.direction !== -1) walker.facingSince = now;
      walker.direction = -1;
    } else if (walker.x <= FLOOR_X_MIN) {
      walker.x = FLOOR_X_MIN;
      if (walker.direction !== 1) walker.facingSince = now;
      walker.direction = 1;
    }

    const clickT = Math.min((now - walker.clickedAt) / CLICK_BOUNCE_MS, 1);
    const bounce = clickT < 1 ? Math.sin(clickT * Math.PI) * 14 : 0;
    const frame = clickT < 1 ? CLICK_FRAME : walkFrameFor(walker, now);
    const sprite = workerSprites[spriteIndexes[i]] ?? workerSprites[0];
    drawFigure(
      ctx,
      sprite,
      walker.x,
      WORKER_FEET_Y - bounce,
      walker.direction,
      frame,
    );
  });
}
