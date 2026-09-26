import {
  FLOOR_X_MIN,
  FLOOR_X_MAX,
  ROOM_CONTENT_SCALE,
  WALK_SPEED,
  WORKER_FEET_Y_NUDGE_PX,
  spawnCoinBurst,
  triggerJumpAll,
} from "../floors";
import { randomInt } from "../utils";
import { applyBoostAll } from "../hud";
import { playBloop } from "../sound";
import type { Floor } from "../gameState";
import { loadImageByName } from "../loadAssets";
import { COLOR } from "../palette";
import { registerHuntTarget } from "../shared/huntTarget";
import { whitenImage } from "../shared/mergeFlash";
import { pickCritTierByOdds } from "../shared/critTypes";
import {
  applyBonusTierIncome,
  celebrateBonusTier,
} from "../shared/bonusTierReward";

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
// squash/stretch + a tiny full-body wiggle while actively scurrying (skipped while
// paused, so it isn't still jittering while standing still) — the sprite is a
// single static pose with no walk-cycle frames of its own, so without this it just
// slides across the floor unchanged, reading as a flat image instead of a running
// critter
const RUN_CYCLE_MS = 150; // quicker cadence than the cats' own walk bounce — little legs
const RUN_SQUASH_AMOUNT = 0.07;
const RUN_BOB_HEIGHT = 2.5;
const RUN_WIGGLE_RAD = 0.03; // small full-body shear, alternating each half-cycle
// on top of the continuous run wiggle above, a bigger one-off squash-then-release
// pulse plays for this long right as a dart actually starts moving (either the very
// first dart, or resuming after any pause) — an anticipation "push off" that reads
// as a deliberate launch instead of just sliding from a standstill into a run
const LAUNCH_SQUASH_MS = 150;
const LAUNCH_SQUASH_AMOUNT = 0.14;
// the exact same feet line worker/index.ts's WORKER_FEET_Y draws the cats on (both
// 650 * ROOM_CONTENT_SCALE, and both bottom-anchored — see drawMouse below),
// nudged down by that same WORKER_FEET_Y_NUDGE_PX so it stays in sync with the cats
const MOUSE_Y = 676 * ROOM_CONTENT_SCALE + WORKER_FEET_Y_NUDGE_PX;
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
  moveStartedAt: number; // Date.now() this dart's movement actually began, once any pause elapses
  huntedAt: number | null; // Date.now() a Hunt event (floors/huntEvent) marked it
}

const HUNTED_TINT_ALPHA = 0.5;
const HUNTED_GROW_SCALE = 1.25;
// the grow-in lands right as the Hunt event's arcadeSlotWin stream ends
const HUNTED_GROW_MS = 250;

let mouseImage: HTMLImageElement | null = null;
let huntedImage: HTMLCanvasElement | null = null;
let active: MouseState | null = null;
let lastUpdate = 0;
let nextSpawnAt = Date.now() + randomInt(MIN_SPAWN_GAP_MS, MAX_SPAWN_GAP_MS);

// loads the mouse sprite once; main.ts awaits this alongside the other image loads
// before the first redraw ever needs it
export async function loadMouseImage(): Promise<HTMLImageElement> {
  mouseImage = await loadImageByName("mouse");
  return mouseImage!;
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
  // if this dart starts with a pause, movement (and its launch squish) actually
  // begins once that pause elapses, not at this roll — drawMouse resolves which of
  // the two actually applies
  state.moveStartedAt = now;
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
    moveStartedAt: now, // overwritten by rollNextDart below, just satisfying the type here
    huntedAt: null,
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

// the red-tinted sprite a hunted mouse draws with, built once on first use
function getHuntedImage(image: HTMLImageElement): HTMLCanvasElement {
  if (huntedImage) return huntedImage;
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const c = canvas.getContext("2d")!;
  c.drawImage(image, 0, 0);
  c.globalCompositeOperation = "source-atop";
  c.globalAlpha = HUNTED_TINT_ALPHA;
  c.fillStyle = COLOR.red;
  c.fillRect(0, 0, canvas.width, canvas.height);
  huntedImage = canvas;
  return canvas;
}

function getScale(state: MouseState, now: number): number {
  if (state.huntedAt === null) return 1;
  const t = Math.min(1, Math.max(0, (now - state.huntedAt) / HUNTED_GROW_MS));
  return 1 + (HUNTED_GROW_SCALE - 1) * t * t * (3 - 2 * t);
}

// draws the mouse into this floor's own canvas, a no-op unless it's the one floor
// currently hosting it. Bottom-anchored at MOUSE_Y (feet/paws touch the same line
// the cats stand on), not centered on it
export function drawMouse(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  now: number,
): void {
  drawMouseSprite(ctx, floor, now, true, 0, 0);
}

function drawMouseSprite(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  now: number,
  animate: boolean,
  whiteAlpha: number,
  rotation: number,
): void {
  if (!active || !mouseImage || active.floor !== floor) return;
  const { x } = active;

  // only wiggle while actually running — standing still mid-pause should read as
  // a genuine pause, not a critter vibrating in place
  let bob = 0;
  let stretchX = 1;
  let stretchY = 1;
  let shear = 0;
  if (animate && now >= active.pausedUntil) {
    const phase = (now % RUN_CYCLE_MS) / RUN_CYCLE_MS;
    const lift = Math.sin(phase * Math.PI * 2); // full cycle: down, up, down, up
    bob = -Math.abs(lift) * RUN_BOB_HEIGHT;
    stretchX = 1 + Math.abs(lift) * RUN_SQUASH_AMOUNT;
    stretchY = 1 - Math.abs(lift) * RUN_SQUASH_AMOUNT;
    shear = lift * RUN_WIGGLE_RAD;

    // a bigger one-off squash pulse right as this dart's movement actually began
    // (see moveStartedAt's own comment) — a "push off" on top of the steady
    // per-step wiggle above, not a replacement for it
    const launchRef =
      active.pausedUntil > 0 ? active.pausedUntil : active.moveStartedAt;
    const launchT = Math.min(
      Math.max((now - launchRef) / LAUNCH_SQUASH_MS, 0),
      1,
    );
    if (launchT < 1) {
      const launchSquash = Math.sin(launchT * Math.PI) * LAUNCH_SQUASH_AMOUNT;
      stretchX += launchSquash;
      stretchY -= launchSquash;
    }
  }

  ctx.save();
  ctx.translate(x, MOUSE_Y + bob);
  if (rotation !== 0) ctx.rotate(rotation);
  const scale = getScale(active, now);
  ctx.scale(scale, scale);
  ctx.transform(
    active.direction !== ART_FACES ? -stretchX : stretchX,
    0,
    shear,
    stretchY,
    0,
    0,
  );
  const sprite =
    active.huntedAt === null ? mouseImage : getHuntedImage(mouseImage);
  ctx.drawImage(
    whiteAlpha > 0
      ? whitenImage(
          sprite,
          mouseImage.naturalWidth,
          mouseImage.naturalHeight,
          whiteAlpha,
        )
      : sprite,
    -RENDER_W / 2,
    -RENDER_H,
    RENDER_W,
    RENDER_H,
  );
  ctx.restore();
}

// whether a floor-local point lands on the currently-visible mouse on this floor
export function hitTestMouse(x: number, y: number, floor: Floor): boolean {
  if (!active || active.floor !== floor) return false;
  const scale = getScale(active, Date.now());
  const halfW = (RENDER_W * scale) / 2;
  return (
    x >= active.x - halfW - HIT_PADDING &&
    x <= active.x + halfW + HIT_PADDING &&
    y >= MOUSE_Y - RENDER_H * scale - HIT_PADDING &&
    y <= MOUSE_Y + HIT_PADDING
  );
}

// if the click actually landed on the mouse, it disappears (with the same coin-burst
// pop every other click reward gets), every worker in the (whole) building gets a
// free boost, and every one of those workers also plays its click-bounce/jump
// animation right away (a building-wide "yay!" instead of just the boost itself).
// This never blocks the caller's own click handling for anything else under the
// same point (e.g. an overlapping cat) — a click hitting both the mouse and a
// worker triggers both, same as clicking overlapping cats already hits every one of
// them
export function handleMouseClick(
  x: number,
  y: number,
  floor: Floor,
  floors: Floor[],
): void {
  if (!hitTestMouse(x, y, floor)) return;
  const burstX = active!.x;
  const hunted = active!.huntedAt !== null;
  const now = Date.now();
  despawn(now);
  applyBoostAll(floors);
  triggerJumpAll(floors, now);
  playBloop();
  spawnCoinBurst(floor, burstX, MOUSE_Y - RENDER_H / 2, () => {});
  if (!hunted) return;
  const origin = { floor, x: burstX, y: MOUSE_Y - RENDER_H / 2 };
  const tier = pickCritTierByOdds();
  applyBonusTierIncome(tier);
  celebrateBonusTier(
    tier,
    (offsetX, offsetY) =>
      spawnCoinBurst(floor, origin.x + offsetX, origin.y + offsetY, () => {}),
    origin,
  );
}

registerHuntTarget({
  get: () =>
    active && active.huntedAt === null
      ? {
          floor: active.floor,
          x: active.x,
          y: MOUSE_Y - RENDER_H / 2,
        }
      : null,
  markHunted: () => {
    if (!active) return;
    const now = Date.now();
    active.huntedAt = now;
    active.spawnedAt = now;
    // the freeze paused updateMouse; don't replay that time as one big step
    lastUpdate = now;
  },
  drawStill: (ctx, floor, whiteAlpha, rotation) =>
    drawMouseSprite(ctx, floor, Date.now(), false, whiteAlpha, rotation),
});
