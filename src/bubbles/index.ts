// the bubbles: every so often, like the mouse, a few bubbles blow up the
// screen, each holding a crit number, a gold coin or a badge. Every bubble
// lives on its own: it floats for CONFIG.randomSpawns.bubbles.durationMs, pulsing before
// it vanishes. A tap pops one and pays it at once: a coin streams into the
// total, a crit number slams into its floor's income bar, and a badge plays
// its crit celebration.
//
// gameCanvas wires the floor actions in (wireBubbles), ticks the spawn timer
// (updateBubbles), pops on presses (popBubbleAt) and draws them in screen
// space over the HUD (drawBubbles)
import { CONFIG } from "../config";
import type { FloorActionsDeps } from "../floors";
import type { Floor } from "../gameState";
import { playBubbleAppear, playBubblePop } from "../sound";
import { randomInt } from "../utils";
import { createSpawnRoll } from "../shared/spawnRoll";
import { between, easeOutBack, lerp, progress } from "../shared/easing";
import { isScreenFrozen } from "../shared/screenFreeze";
import { shakeScreen } from "../shared/screenShake";
import { drawSoapBubble, drawSoapBubblePop } from "../shared/soapBubble";
import {
  collectPrize,
  drawMini,
  drawPayout,
  isPayoutDone,
  pickSpawnFloor,
  prepareMini,
  rollPrize,
  type Payout,
  type Prize,
} from "../shared/spawnPrize";
import { urgentBlink } from "../shared/urgentBlink";
import type { Point } from "../shared/wisp";

const RADIUS = 130;
const CONTENT_SIZE = 160;
// tapping counts this far round a bubble, for thumbs
const HIT_REACH = 1.15;
// a spawn blows its bubbles in over SPAWN_MS, each growing in over GROW_MS;
// each vanishes over VANISH_MS once its time is up
const SPAWN_MS = 2_400;
const GROW_MS = 240;
const VANISH_MS = 250;
// they start between SPAWN_Y of the screen's height and rise to TOP_Y by the end
const SPAWN_Y: [number, number] = [0.5, 0.88];
const TOP_Y = 0.22;
const SPAWN_X: [number, number] = [0.12, 0.88];
const SWAY_PX = 24;
// a slower second sway and a bob, so the drift never repeats
const DRIFT_PX = 14;
const BOB_PX = 12;
// the film jiggles this much of its radius, a lot more just after it blows in
const WOBBLE = 0.021;
const WOBBLE_BLOWN = 2.5;
const WOBBLE_SETTLE_S = 0.7;
const WOBBLE_RATE = 7.5;
// the content inside jiggles this share of the film's
const CONTENT_WOBBLE = 0.5;
const POP_MS = 150;

interface Bubble {
  content: Prize;
  floor: Floor;
  // performance.now() it blows in
  bornAt: number;
  // spawn spot as fractions of the screen, and its rise in screen heights a second
  fx: number;
  fy: number;
  rise: number;
  seed: number;
  appeared: boolean;
  poppedAt: number;
  from: Point;
  payout: Payout | null;
}

let getDeps: (() => FloorActionsDeps) | null = null;
const bubbles: Bubble[] = [];
const roll = createSpawnRoll(CONFIG.randomSpawns.bubbles, performance.now());
// the screen as last drawn, in gameCanvas's screen units
let width = 1;
let height = 1;
const spot: Point = { x: 0, y: 0 };

// the floor actions of the building on screen
export function wireBubbles(deps: () => FloorActionsDeps): void {
  getDeps = deps;
}

// once the last bubbles are gone, rolls to blow a few more in, like the mouse
export function updateBubbles(now: number): void {
  if (bubbles.length > 0) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (!getDeps || !roll.procs(now)) return;
  const floor = pickSpawnFloor(getDeps());
  if (!floor) return;
  spawnBubbles(floor, now);
}

// blows a few bubbles in at once, alongside any already floating (test button)
export function forceBubbles(): void {
  const floor = getDeps && pickSpawnFloor(getDeps());
  if (floor) spawnBubbles(floor, performance.now());
}

function spawnBubbles(floor: Floor, now: number): void {
  const { durationMs, contentOdds } = CONFIG.randomSpawns.bubbles;
  const count = randomInt(...CONFIG.randomSpawns.bubbles.count);
  // one lane each across the screen, shuffled, so they don't pile up
  const lanes = Array.from({ length: count }, (_, i) => i);
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }
  lanes.forEach((lane, i) => {
    const content = rollPrize(contentOdds, floor);
    prepareMini(content);
    const fy = between(SPAWN_Y);
    bubbles.push({
      content,
      floor,
      bornAt: now + (i / count) * SPAWN_MS,
      fx: lerp(SPAWN_X, (lane + 0.2 + Math.random() * 0.6) / count),
      fy,
      rise: ((fy - TOP_Y) / (durationMs / 1000)) * between([0.5, 1]),
      seed: Math.random() * Math.PI * 2,
      appeared: false,
      poppedAt: Infinity,
      from: { x: 0, y: 0 },
      payout: null,
    });
  });
}

function bubbleAt(bubble: Bubble, now: number, into: Point): Point {
  const age = (now - bubble.bornAt) / 1000;
  const { seed } = bubble;
  into.x =
    bubble.fx * width +
    Math.sin(age * 2.1 + seed) * SWAY_PX +
    Math.sin(age * 0.9 + seed * 3) * DRIFT_PX;
  into.y =
    (bubble.fy - bubble.rise * age) * height +
    Math.sin(age * 2.9 + seed * 2) * BOB_PX;
  return into;
}

// the bubble's film jiggling: squashed along an axis that slowly turns,
// stretched across it, under ctx's transform round (x, y)
function applyWobble(
  ctx: CanvasRenderingContext2D,
  bubble: Bubble,
  now: number,
  x: number,
  y: number,
  share: number,
): void {
  const age = (now - bubble.bornAt) / 1000;
  const amount =
    WOBBLE *
    share *
    (1 + WOBBLE_BLOWN * Math.max(0, 1 - age / WOBBLE_SETTLE_S));
  const phase = age * WOBBLE_RATE + bubble.seed;
  const axis = bubble.seed + age * 0.8;
  ctx.translate(x, y);
  ctx.rotate(axis);
  ctx.scale(1 + amount * Math.sin(phase), 1 - amount * Math.sin(phase));
  ctx.rotate(-axis);
}

// how big a bubble is at now (0 before it blows in), its pulse aside
function bubbleScale(bubble: Bubble, now: number): number {
  if (now < bubble.bornAt || now >= bubble.poppedAt) return 0;
  const grow = progress(now, bubble.bornAt, GROW_MS);
  const vanish = progress(
    now,
    bubble.bornAt + CONFIG.randomSpawns.bubbles.durationMs,
    VANISH_MS,
  );
  return grow >= 1 ? 1 - vanish : easeOutBack(grow);
}

function hitBubble(x: number, y: number, now: number): Bubble | null {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const bubble = bubbles[i];
    if (now >= bubble.bornAt + CONFIG.randomSpawns.bubbles.durationMs) continue;
    const scale = bubbleScale(bubble, now);
    if (scale <= 0.3) continue;
    bubbleAt(bubble, now, spot);
    if (Math.hypot(x - spot.x, y - spot.y) < RADIUS * scale * HIT_REACH)
      return bubble;
  }
  return null;
}

// whether a press at (x, y) (gameCanvas screen units) would pop a bubble
export function hitTestBubbles(x: number, y: number): boolean {
  return !!hitBubble(x, y, performance.now());
}

// pops the bubble under (x, y) and pays what's inside; true if one popped,
// so the press goes no further
export function popBubbleAt(x: number, y: number): boolean {
  if (!getDeps) return false;
  const now = performance.now();
  const bubble = hitBubble(x, y, now);
  if (!bubble) return false;
  bubble.poppedAt = now;
  bubbleAt(bubble, now, bubble.from);
  playBubblePop();
  shakeScreen(0.35);
  bubble.payout = collectPrize(
    getDeps(),
    bubble.floor,
    bubble.content,
    bubble.from,
    height,
    CONTENT_SIZE,
    now,
  );
  return true;
}

// whether a bubble is gone for good: vanished, or popped and paid out
function isDone(bubble: Bubble, now: number): boolean {
  if (bubble.poppedAt === Infinity)
    return (
      now >= bubble.bornAt + CONFIG.randomSpawns.bubbles.durationMs + VANISH_MS
    );
  return (
    now >= bubble.poppedAt + POP_MS &&
    (!bubble.payout || isPayoutDone(bubble.payout, now))
  );
}

// every bubble, in gameCanvas's screen units (w x h), each frame
export function drawBubbles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
): void {
  if (bubbles.length === 0 || !getDeps) return;
  width = w;
  height = h;
  const t = performance.now();
  for (let i = bubbles.length - 1; i >= 0; i--)
    if (isDone(bubbles[i], t)) bubbles.splice(i, 1);
  const deps = getDeps();
  const { durationMs, pulseMs } = CONFIG.randomSpawns.bubbles;
  ctx.save();
  for (const bubble of bubbles) {
    if (!bubble.appeared && t >= bubble.bornAt) {
      bubble.appeared = true;
      playBubbleAppear();
    }
    const scale = bubbleScale(bubble, t);
    if (scale > 0) {
      bubbleAt(bubble, t, spot);
      ctx.globalAlpha =
        Math.min(1, scale) *
        urgentBlink(bubble.bornAt + durationMs - t, pulseMs, now);
      ctx.save();
      applyWobble(ctx, bubble, t, spot.x, spot.y, 1);
      drawSoapBubble(ctx, 0, 0, RADIUS * scale);
      ctx.restore();
      ctx.save();
      applyWobble(ctx, bubble, t, spot.x, spot.y, CONTENT_WOBBLE);
      drawMini(ctx, bubble.content, 0, 0, CONTENT_SIZE * scale);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    if (t < bubble.poppedAt) continue;
    if (t < bubble.poppedAt + POP_MS)
      drawSoapBubblePop(
        ctx,
        bubble.from.x,
        bubble.from.y,
        RADIUS,
        (t - bubble.poppedAt) / POP_MS,
      );
    if (bubble.payout) drawPayout(ctx, deps, bubble.payout, height, t, now);
  }
  ctx.restore();
}
