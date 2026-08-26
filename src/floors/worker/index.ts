import { FLOOR_X_MIN, FLOOR_X_MAX } from "../constants";
import { isBoosted, type Floor } from "../../gameState";

const WALK_SPEED = 50; // px/sec
const BOOSTED_WALK_SPEED = WALK_SPEED * 2;
// feet rest well above the bottom income/upgrade panels (which start at y=577) so the
// worker is always visible walking across the open floor instead of ducking behind them
const WORKER_FEET_Y = 650;
const LEG_LENGTH = 68; // vertical distance from the origin (head) down to the feet
const SCALE = 3;
const LEG_SWING_SPEED = 150; // ms per swing cycle
const CLICK_BOUNCE_MS = 300; // how long the little "boing" reaction plays after a click
const CLICK_COOLDOWN_MS = 500; // ignore re-clicks faster than this so coin bursts don't stack up
const HIT_HALF_WIDTH = 20 * SCALE; // generous click-target box around the figure
const HIT_TOP = 20 * SCALE;
const HIT_BOTTOM = 75 * SCALE;
// workerMenu.ts caps floor.workerCount at this too, so every worker a floor has is
// always one of the little figures actually drawn/walked here
export const MAX_RENDERED_WORKERS = 3;

interface WalkerState {
  x: number;
  direction: 1 | -1;
  lastUpdate: number;
  clickedAt: number; // performance.now() of this worker's own last click, -Infinity if never clicked
}

interface FloorWorkers {
  walkers: WalkerState[];
}

// each floor gets its own independent set of walkers, keyed by the floor itself
const floorWorkers = new WeakMap<Floor, FloorWorkers>();

function makeWalker(index: number, total: number, now: number): WalkerState {
  // spreads walkers into evenly-spaced starting bands instead of piling them on
  // top of each other when a floor has more than one
  const bandWidth = (FLOOR_X_MAX - FLOOR_X_MIN) / total;
  const bandStart = FLOOR_X_MIN + bandWidth * index;
  return {
    x: bandStart + Math.random() * bandWidth,
    direction: Math.random() < 0.5 ? 1 : -1,
    lastUpdate: now,
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

  const cyLocal = WORKER_FEET_Y - LEG_LENGTH * SCALE;
  const withinY = y >= cyLocal - HIT_TOP && y <= cyLocal + HIT_BOTTOM;
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
  return { x: walker.x, y: WORKER_FEET_Y - LEG_LENGTH * SCALE };
}

// on-screen (floor-local) center of every currently-boosted worker on the floor, so
// the floating-coin animation only plays at the ones actually boosted
export function getBoostedWorkerCenters(
  floor: Floor,
  now: number,
): { x: number; y: number }[] {
  const state = floorWorkers.get(floor);
  if (!state) return [];
  const y = WORKER_FEET_Y - LEG_LENGTH * SCALE;
  return state.walkers
    .map((w, i) => ({ x: w.x, y, boosted: isBoosted(floor, i, now) }))
    .filter((w) => w.boosted)
    .map(({ x, y }) => ({ x, y }));
}

// draws one little cartoon office worker at (cx, cy), bounced/facing per the given state
function drawFigure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  direction: 1 | -1,
  legSwing: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(direction === -1 ? -SCALE : SCALE, SCALE); // scale + face walking direction

  // legs
  ctx.strokeStyle = "#1E293B";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 42);
  ctx.lineTo(-6 + legSwing, 68);
  ctx.moveTo(6, 42);
  ctx.lineTo(6 - legSwing, 68);
  ctx.stroke();

  // torso (shirt)
  ctx.fillStyle = "#3B82F6";
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-14, 12, 28, 32, 8);
  ctx.fill();
  ctx.stroke();

  // arms
  ctx.strokeStyle = "#3B82F6";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-13, 18);
  ctx.lineTo(-13 - legSwing * 0.6, 40);
  ctx.moveTo(13, 18);
  ctx.lineTo(13 + legSwing * 0.6, 40);
  ctx.stroke();

  // head
  ctx.fillStyle = "#F4C99B";
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// small cartoon office workers (up to MAX_RENDERED_WORKERS) that pace back and forth
// across the floor's walkable band; no-ops on locked floors since there's nothing to
// animate behind the grey overlay
export function drawWorker(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  now: number,
): void {
  if (!floor.unlocked) return;

  const state = getFloorWorkers(floor, now);
  const legSwing = Math.sin(now / LEG_SWING_SPEED) * 7;

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
      walker.direction = -1;
    } else if (walker.x <= FLOOR_X_MIN) {
      walker.x = FLOOR_X_MIN;
      walker.direction = 1;
    }

    const clickT = Math.min((now - walker.clickedAt) / CLICK_BOUNCE_MS, 1);
    const bounce = clickT < 1 ? Math.sin(clickT * Math.PI) * 14 : 0;
    const cy = WORKER_FEET_Y - LEG_LENGTH * SCALE - bounce;
    drawFigure(ctx, walker.x, cy, walker.direction, legSwing);
  });
}
