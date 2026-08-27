import {
  FLOOR_X_MIN,
  FLOOR_X_MAX,
  ROOM_CONTENT_SCALE,
  WALK_SPEED,
  spawnCoinBurst,
} from "../floors";
import { loadImage, randomInt } from "../utils";
import { applyBoostAll } from "../hud";
import type { Floor } from "../gameState";
import mouseImageUrl from "../assets/mouse.png";

// a free bonus critter: spawns at random on a random unlocked floor of whichever
// building is currently active, runs back and forth for a few seconds, and — if
// clicked before it scurries off — boosts every worker in the building for free,
// same effect as hud/boostMenu's paid "speed up workers" but with no $ cost
const VISIBLE_MS = 5000;
const MIN_SPAWN_GAP_MS = 15000;
const MAX_SPAWN_GAP_MS = 40000;
// 8x a cat's own walk speed (WALK_SPEED, worker/index.ts), with a little spread per
// dart so every run doesn't look identically fast
const BASE_RUN_SPEED = WALK_SPEED * 8;
const MIN_RUN_SPEED = BASE_RUN_SPEED * 0.85;
const MAX_RUN_SPEED = BASE_RUN_SPEED * 1.15;
const MIN_PAUSE_MS = 150; // brief hesitation/"sniffing" pause between darts
const MAX_PAUSE_MS = 700;
const PAUSE_CHANCE = 0.4; // how often it pauses instead of immediately darting again
// on top of that, it can also randomly freeze mid-dart (not just once it arrives),
// so a single run doesn't always read as one clean straight-line dash
const MID_DART_PAUSE_CHANCE_PER_SEC = 0.5;

// native mouse.png is 603x524 (see scripts/process-mouse.mjs); rendered small and
// scaled down to that same aspect ratio
const RENDER_W = 110;
const RENDER_H = Math.round(RENDER_W * (524 / 603));
// hitTestMouse pads the actual sprite bounds out by this much on every side — the
// mouse darts around fast and small, so a click landing just outside its rendered
// fur should still count rather than requiring pixel-perfect precision
const HIT_PADDING = 24;
// the exact same feet line worker/index.ts's WORKER_FEET_Y draws the cats on (both
// 650 * ROOM_CONTENT_SCALE, and both bottom-anchored — see drawMouse below)
const MOUSE_Y = 650 * ROOM_CONTENT_SCALE;
// the source art faces left; only needs a horizontal flip when running the other way
const ART_FACES: 1 | -1 = -1;

interface MouseState {
  floor: Floor;
  x: number;
  targetX: number;
  speed: number; // px/sec, re-rolled per dart for natural-looking variance
  direction: 1 | -1;
  spawnedAt: number;
  pausedUntil: number; // Date.now() timestamp; holds still until then
}

let mouseImage: HTMLImageElement | null = null;
let active: MouseState | null = null;
let lastUpdate = 0;
let nextSpawnAt = Date.now() + randomInt(MIN_SPAWN_GAP_MS, MAX_SPAWN_GAP_MS);

// loads the mouse sprite once; main.ts awaits this alongside the other image loads
// before the first redraw ever needs it
export async function loadMouseImage(): Promise<HTMLImageElement> {
  mouseImage = await loadImage(mouseImageUrl);
  return mouseImage;
}

function despawn(now: number): void {
  active = null;
  nextSpawnAt = now + randomInt(MIN_SPAWN_GAP_MS, MAX_SPAWN_GAP_MS);
}

// picks a new random spot to dart toward (always at least a quarter of the room
// away, so it never rolls a target basically where it's already standing) and,
// often, a short pause before setting off — real mice dart in short random bursts,
// not one continuous straight-line sweep
function rollNextDart(state: MouseState, now: number): void {
  const roomWidth = FLOOR_X_MAX - FLOOR_X_MIN;
  let target: number;
  do {
    target = randomInt(FLOOR_X_MIN, FLOOR_X_MAX);
  } while (Math.abs(target - state.x) < roomWidth * 0.25);
  state.targetX = target;
  state.direction = target >= state.x ? 1 : -1;
  state.speed = randomInt(MIN_RUN_SPEED, MAX_RUN_SPEED);
  state.pausedUntil =
    Math.random() < PAUSE_CHANCE
      ? now + randomInt(MIN_PAUSE_MS, MAX_PAUSE_MS)
      : 0;
}

// picks a random unlocked floor and spawns the mouse on it right now, unconditionally
// (no cooldown/existing-mouse check — callers decide when that's appropriate)
function spawnOn(floors: Floor[], now: number): void {
  const unlocked = floors.filter((f) => f.unlocked);
  if (unlocked.length === 0) return; // nothing to boost yet
  const spawnX = randomInt(FLOOR_X_MIN, FLOOR_X_MAX);
  active = {
    floor: unlocked[randomInt(0, unlocked.length - 1)],
    x: spawnX,
    targetX: spawnX,
    speed: randomInt(MIN_RUN_SPEED, MAX_RUN_SPEED),
    direction: Math.random() < 0.5 ? 1 : -1,
    spawnedAt: now,
    pausedUntil: 0,
  };
  rollNextDart(active, now);
}

// advances the current run cycle — darting toward a random point, occasionally
// pausing briefly, then picking a new random point once it arrives — and expires it
// after VISIBLE_MS, or rolls a fresh spawn on a random unlocked floor once the
// cooldown since the last one elapses. Call this once per frame — not per floor —
// with the active building's own floors; there's only ever one mouse building-wide,
// never one per floor
export function updateMouse(floors: Floor[], now: number): void {
  const dtSeconds = lastUpdate ? Math.max((now - lastUpdate) / 1000, 0) : 0;
  lastUpdate = now;

  if (active) {
    if (now - active.spawnedAt >= VISIBLE_MS) {
      despawn(now);
      return;
    }
    if (now < active.pausedUntil) return; // holding still mid-dart
    // random chance to freeze for a moment even mid-run, independent of reaching
    // the target — real mice stop-and-go constantly, not just at the end of a dash
    if (
      dtSeconds > 0 &&
      Math.random() < MID_DART_PAUSE_CHANCE_PER_SEC * dtSeconds
    ) {
      active.pausedUntil = now + randomInt(MIN_PAUSE_MS, MAX_PAUSE_MS);
      return;
    }
    active.x += active.direction * active.speed * dtSeconds;
    const reachedTarget =
      (active.direction === 1 && active.x >= active.targetX) ||
      (active.direction === -1 && active.x <= active.targetX);
    active.x = Math.min(FLOOR_X_MAX, Math.max(FLOOR_X_MIN, active.x));
    if (reachedTarget) rollNextDart(active, now);
    return;
  }

  if (now < nextSpawnAt) return;
  spawnOn(floors, now);
}

// dev/test-only: force a spawn right now regardless of the cooldown, replacing
// whatever mouse (if any) is already active — used by the testing actions bar's
// "Spawn Mouse" button
export function forceSpawnMouse(floors: Floor[]): void {
  spawnOn(floors, Date.now());
}

// draws the mouse into this floor's own canvas, a no-op unless it's the one floor
// currently hosting it. Bottom-anchored at MOUSE_Y (feet/paws touch the same line
// the cats stand on), not centered on it
export function drawMouse(ctx: CanvasRenderingContext2D, floor: Floor): void {
  if (!active || !mouseImage || active.floor !== floor) return;
  const { x } = active;
  ctx.save();
  if (active.direction !== ART_FACES) {
    ctx.translate(x, MOUSE_Y);
    ctx.scale(-1, 1);
    ctx.drawImage(mouseImage, -RENDER_W / 2, -RENDER_H, RENDER_W, RENDER_H);
  } else {
    ctx.drawImage(
      mouseImage,
      x - RENDER_W / 2,
      MOUSE_Y - RENDER_H,
      RENDER_W,
      RENDER_H,
    );
  }
  ctx.restore();
}

// whether a floor-local point lands on the currently-visible mouse on this floor
export function hitTestMouse(x: number, y: number, floor: Floor): boolean {
  if (!active || active.floor !== floor) return false;
  return (
    x >= active.x - RENDER_W / 2 - HIT_PADDING &&
    x <= active.x + RENDER_W / 2 + HIT_PADDING &&
    y >= MOUSE_Y - RENDER_H - HIT_PADDING &&
    y <= MOUSE_Y + HIT_PADDING
  );
}

// if the click actually landed on the mouse, it disappears (with the same coin-burst
// pop every other click reward gets) and every worker in the (whole) building gets a
// free boost. This never blocks the caller's own click handling for anything else
// under the same point (e.g. an overlapping cat) — a click hitting both the mouse
// and a worker triggers both, same as clicking overlapping cats already hits every
// one of them
export function handleMouseClick(
  x: number,
  y: number,
  floor: Floor,
  floors: Floor[],
): void {
  if (!hitTestMouse(x, y, floor)) return;
  const burstX = active!.x;
  despawn(Date.now());
  applyBoostAll(floors);
  spawnCoinBurst(floor, burstX, MOUSE_Y - RENDER_H / 2, () => {});
}
