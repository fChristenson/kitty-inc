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
import {
  CRIT_TIER_CONFIG,
  eventProcContext,
  loadFeaturedRewards,
  pickCritTierByOdds,
  pickFeaturedBadge,
} from "../crits";
import {
  getIncomeBarCenter,
  increaseIncomeRateBy,
  punchIncomeBar,
  rewardPayoutAmount,
  spawnHomingCoinBurst,
  type FloorActionsDeps,
} from "../floors";
import type { Floor } from "../gameState";
import { addTotalIncome } from "../totalIncome";
import { playBubbleAppear, playBubblePop } from "../sound";
import { randomInt } from "../utils";
import { bezier } from "../shared/curves";
import {
  between,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
  progress,
} from "../shared/easing";
import { DETONATION_MS, drawDetonation } from "../shared/explosion";
import { playBarExplosion } from "../shared/explosionBang";
import { EVENT_COIN_TIMING } from "../shared/floorEvents";
import { isScreenFrozen } from "../shared/screenFreeze";
import { shakeScreen } from "../shared/screenShake";
import { drawSoapBubble, drawSoapBubblePop } from "../shared/soapBubble";
import { pulseHudTotalFlash } from "../shared/totalIncomeCoins";
import { urgentBlink } from "../shared/urgentBlink";
import { drawWispTrail, WISP_TRAIL_MS, type Point } from "../shared/wisp";
import { drawMini, prepareMini, type BubbleContent } from "./minis";

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
const STREAM_COINS: [number, number] = [10, 16];
// a crit number flies up off its bubble, swelling to SMASH_SIZE, and slams
// down onto its floor's bar SMASH_MS after the pop
const SMASH_MS = 340;
const SMASH_ARC = 360;
const SMASH_SIZE = 340;
// of the flight spent swelling before the slam
const SMASH_SWELL = 0.55;
const SMASH_BLAST = 260;
const SMASH_SHAKE = 0.6;
const SQUASH_MS = 250;
const TRAIL_SIZE = 30;
// a popped number is done once its blast and trail have faded
const SMASH_DONE_MS = SMASH_MS + Math.max(DETONATION_MS, WISP_TRAIL_MS);

interface Bubble {
  content: BubbleContent;
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
  // a crit number's flight onto its floor's bar (in screen units, kept up
  // to date each frame), and whether it has landed
  bar: Point;
  smash: (at: number) => Point | null;
  hit: boolean;
}

let getDeps: (() => FloorActionsDeps) | null = null;
const bubbles: Bubble[] = [];
let nextSpawnAt = performance.now() + gapMs();
// the screen as last drawn, in gameCanvas's screen units
let width = 1;
let height = 1;
const spot: Point = { x: 0, y: 0 };

function gapMs(): number {
  return randomInt(...CONFIG.randomSpawns.bubbles.spawnGapMs);
}

// the floor actions of the building on screen
export function wireBubbles(deps: () => FloorActionsDeps): void {
  getDeps = deps;
}

// a random unlocked floor on screen, the one a spawn's bubbles pay
function pickFloor(): Floor | null {
  if (!getDeps) return null;
  const floors = (getDeps().getOnScreenFloors?.() ?? []).filter(
    (f) => f.floor.unlocked,
  );
  return floors.length
    ? floors[Math.floor(Math.random() * floors.length)].floor
    : null;
}

// once its random wait is up and the last bubbles are gone, blows a few
// more in, like the mouse
export function updateBubbles(now: number): void {
  if (bubbles.length > 0 || now < nextSpawnAt || isScreenFrozen()) return;
  const floor = pickFloor();
  if (!floor) return;
  spawnBubbles(floor, now);
  nextSpawnAt =
    now + SPAWN_MS + CONFIG.randomSpawns.bubbles.durationMs + gapMs();
}

// blows a few bubbles in at once, alongside any already floating (test button)
export function forceBubbles(): void {
  const floor = pickFloor();
  if (floor) spawnBubbles(floor, performance.now());
}

function rollContent(): BubbleContent {
  const { tier, coin } = CONFIG.randomSpawns.bubbles.contentOdds;
  const roll = Math.random();
  if (roll < tier) return { kind: "tier", tier: pickCritTierByOdds() };
  if (roll < tier + coin) return { kind: "coin" };
  return { kind: "badge", badge: pickFeaturedBadge() };
}

function spawnBubbles(floor: Floor, now: number): void {
  const { durationMs } = CONFIG.randomSpawns.bubbles;
  const count = randomInt(...CONFIG.randomSpawns.bubbles.count);
  // one lane each across the screen, shuffled, so they don't pile up
  const lanes = Array.from({ length: count }, (_, i) => i);
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }
  lanes.forEach((lane, i) => {
    const content = rollContent();
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
      bar: { x: 0, y: 0 },
      smash: () => null,
      hit: false,
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

// the floor a bubble pays, or the building's first if it's gone
function payFloor(deps: FloorActionsDeps, bubble: Bubble): Floor | undefined {
  return deps.floors.includes(bubble.floor) ? bubble.floor : deps.floors[0];
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
  const deps = getDeps();
  const floor = payFloor(deps, bubble);
  if (!floor) return true;
  const { content } = bubble;
  if (content.kind === "coin") streamCoin(deps, floor, bubble.from);
  // the badge rewards are a lazy chunk the idle loader may not have reached
  else if (content.kind === "badge")
    void loadFeaturedRewards().then(() =>
      eventProcContext(deps, deps.floors.indexOf(floor) === 0).applyProcCrit?.(
        floor,
        "crit",
        content.badge,
      ),
    );
  else {
    const from = { ...bubble.from };
    const bend = { x: 0, y: 0 };
    const at = { x: 0, y: 0 };
    const { bar } = bubble;
    barOnScreen(deps, floor, bar);
    bubble.smash = (t) => {
      if (t < now || t > now + SMASH_MS) return null;
      bend.x = (from.x + bar.x) / 2;
      bend.y = Math.min(from.y, bar.y) - SMASH_ARC;
      return bezier(from, bend, bar, progress(t, now, SMASH_MS) ** 1.6, at);
    };
  }
  return true;
}

// where floor's income bar is on screen, kept on the screen's height
function barOnScreen(deps: FloorActionsDeps, floor: Floor, into: Point): void {
  const area = deps.getScreenAreaLocal?.(floor);
  if (!area) return;
  const bar = getIncomeBarCenter(deps.floors.indexOf(floor) === 0);
  into.x = bar.x - area.left;
  into.y = Math.min(height, Math.max(0, bar.y - area.top));
}

// a coin's payout, streaming from its bubble into the total
function streamCoin(deps: FloorActionsDeps, floor: Floor, at: Point): void {
  addTotalIncome(rewardPayoutAmount(floor, Date.now()));
  deps.persist();
  const area = deps.getScreenAreaLocal?.(floor);
  if (area)
    spawnHomingCoinBurst(floor, at.x + area.left, at.y + area.top, {
      ...EVENT_COIN_TIMING,
      coins: STREAM_COINS,
      onEachArrive: pulseHudTotalFlash,
    });
}

// a crit number slamming onto its floor's bar: its levels land
function smashIn(deps: FloorActionsDeps, floor: Floor, bubble: Bubble): void {
  if (bubble.content.kind !== "tier") return;
  const { multiplier, color } = CRIT_TIER_CONFIG[bubble.content.tier];
  increaseIncomeRateBy(floor, multiplier);
  deps.persist();
  punchIncomeBar(floor, `+${multiplier} Lvl`, color);
  shakeScreen(SMASH_SHAKE);
  playBarExplosion(1 + 0.1 * Math.random());
}

// whether a bubble is gone for good: vanished, or popped and paid out
function isDone(bubble: Bubble, now: number): boolean {
  if (bubble.poppedAt === Infinity)
    return (
      now >= bubble.bornAt + CONFIG.randomSpawns.bubbles.durationMs + VANISH_MS
    );
  const doneMs = bubble.content.kind === "tier" ? SMASH_DONE_MS : POP_MS;
  return now >= bubble.poppedAt + doneMs;
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
    const floor = payFloor(deps, bubble);
    if (bubble.content.kind === "tier" && floor)
      drawSmash(ctx, deps, floor, bubble, t, now);
  }
  ctx.restore();
}

// a popped crit number flying up, swelling, and slamming onto its bar
function drawSmash(
  ctx: CanvasRenderingContext2D,
  deps: FloorActionsDeps,
  floor: Floor,
  bubble: Bubble,
  t: number,
  now: number,
): void {
  barOnScreen(deps, floor, bubble.bar);
  const hitAt = bubble.poppedAt + SMASH_MS;
  drawWispTrail(ctx, bubble.smash, t, now, TRAIL_SIZE);
  if (t < hitAt) {
    const at = bubble.smash(t);
    const u = progress(t, bubble.poppedAt, SMASH_MS);
    const size =
      u < SMASH_SWELL
        ? lerp([CONTENT_SIZE, SMASH_SIZE], easeOut(u / SMASH_SWELL))
        : lerp(
            [SMASH_SIZE, CONTENT_SIZE],
            easeIn((u - SMASH_SWELL) / (1 - SMASH_SWELL)),
          );
    if (at) drawMini(ctx, bubble.content, at.x, at.y, size);
    return;
  }
  if (!bubble.hit) {
    bubble.hit = true;
    smashIn(deps, floor, bubble);
  }
  drawDetonation(ctx, bubble.bar, t - hitAt, SMASH_BLAST, now);
  // squashed flat into the bar as it fades
  const out = progress(t, hitAt, SQUASH_MS);
  if (out >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - out;
  ctx.translate(bubble.bar.x, bubble.bar.y);
  ctx.scale(1 + 0.6 * out, 1 - 0.5 * out);
  drawMini(ctx, bubble.content, 0, 0, CONTENT_SIZE);
  ctx.restore();
}
