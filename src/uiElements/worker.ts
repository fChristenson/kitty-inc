import { FLOOR_H, FLOOR_X_MIN, FLOOR_X_MAX } from "./floors";
import type { Floor } from "../gameState";

const WALK_SPEED = 50; // px/sec
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

export interface WorkerState {
  x: number;
  direction: 1 | -1;
  lastUpdate: number;
  clickedAt: number; // performance.now() of the last click, -Infinity if never clicked
}

// each floor gets its own independent walker, keyed by the floor itself
const workers = new WeakMap<Floor, WorkerState>();

function getState(floor: Floor, now: number): WorkerState {
  let state = workers.get(floor);
  if (!state) {
    state = {
      x: FLOOR_X_MIN + Math.random() * (FLOOR_X_MAX - FLOOR_X_MIN),
      direction: Math.random() < 0.5 ? 1 : -1,
      lastUpdate: now,
      clickedAt: -Infinity,
    };
    workers.set(floor, state);
  }
  return state;
}

// which floor row (top-to-bottom) a canvas point falls on the worker's click target for, if any
export function hitTestWorker(
  x: number,
  y: number,
  floors: Floor[],
): number | null {
  const row = Math.floor(y / FLOOR_H);
  if (row < 0 || row >= floors.length) return null;
  const floor = floors[floors.length - 1 - row];
  if (!floor.unlocked) return null;
  const state = workers.get(floor);
  if (!state) return null;

  const localY = y - row * FLOOR_H;
  const cyLocal = WORKER_FEET_Y - LEG_LENGTH * SCALE;
  const withinX =
    x >= state.x - HIT_HALF_WIDTH && x <= state.x + HIT_HALF_WIDTH;
  const withinY = localY >= cyLocal - HIT_TOP && localY <= cyLocal + HIT_BOTTOM;
  return withinX && withinY ? row : null;
}

// starts this floor's click-bounce animation and reports whether the click should spawn
// a coin burst; returns false while still on cooldown so rapid clicks can't pile up coins
export function clickWorker(floor: Floor, now: number): boolean {
  const state = getState(floor, now);
  if (now - state.clickedAt < CLICK_COOLDOWN_MS) return false;
  state.clickedAt = now;
  return true;
}

// on-screen center of a floor's worker, for aiming a coin burst at it; null if it
// hasn't been drawn yet (shouldn't happen in practice once a floor is unlocked)
export function getWorkerCenter(
  floor: Floor,
  offsetY: number,
): { x: number; y: number } | null {
  const state = workers.get(floor);
  if (!state) return null;
  return { x: state.x, y: WORKER_FEET_Y + offsetY - LEG_LENGTH * SCALE };
}

// a small cartoon office worker that paces back and forth across the floor's walkable
// band; no-op on locked floors since there's nothing to animate behind the grey overlay
export function drawWorker(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  offsetY: number,
  now: number,
): void {
  if (!floor.unlocked) return;

  const state = getState(floor, now);
  const dtSeconds = Math.min((now - state.lastUpdate) / 1000, 0.1);
  state.lastUpdate = now;
  state.x += state.direction * WALK_SPEED * dtSeconds;
  if (state.x >= FLOOR_X_MAX) {
    state.x = FLOOR_X_MAX;
    state.direction = -1;
  } else if (state.x <= FLOOR_X_MIN) {
    state.x = FLOOR_X_MIN;
    state.direction = 1;
  }

  const cx = state.x;
  const clickT = Math.min((now - state.clickedAt) / CLICK_BOUNCE_MS, 1);
  const bounce = clickT < 1 ? Math.sin(clickT * Math.PI) * 14 : 0;
  const cy = WORKER_FEET_Y + offsetY - LEG_LENGTH * SCALE - bounce;
  const legSwing = Math.sin(now / LEG_SWING_SPEED) * 7;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(state.direction === -1 ? -SCALE : SCALE, SCALE); // scale + face walking direction

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
