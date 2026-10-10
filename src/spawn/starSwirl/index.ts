// the star swirl: every so often, like the mouse and the bubbles, a little
// spiral of glitter stars turns round a bright core over a floor's bar (the
// inner stars racing round faster than the outer) for
// CONFIG.randomSpawns.starSwirl.durationMs, blinking before it vanishes. A tap
// on the core bursts it, and a shockwave strikes every worker in view in
// turn, nearest first: each worker struck jumps, a coin pops up
// over its head, holds a moment, then flips up into the total like the coin
// spawn's, paying rewardSecondsPerWorker of the company's income, so the more
// workers on screen, the bigger the pay.
//
// gameCanvas wires the floor actions in (wireStarSwirl), ticks the spawn
// timer (updateStarSwirl), taps it (tapStarSwirl) and draws it in screen
// space over the HUD (drawStarSwirl)
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playCoinAppear, playSold } from "../../sound";
import { getActiveCompanyIndex } from "../../company";
import {
  addTotalIncome,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import {
  FLOOR_X_MAX,
  FLOOR_X_MIN,
  getIncomeBarCenter,
  getRenderedWorkerCount,
  getWorkerCenter,
  triggerJump,
  type FloorActionsDeps,
} from "../../floors";
import type { Floor } from "../../gameState";
import { isVisibleOnFloor } from "../../crits";
import { multiply, type BigNumber } from "../../shared/bigNumber";
import {
  COIN_SPIN,
  drawCoinFlip,
  drawSpinCoin,
  loadSpinCoin,
  startCoinFlip,
  type CoinFlip,
} from "../../shared/coinFlip";
import { isFloorLocked } from "../../shared/detachedJob";
import {
  between,
  clamp01,
  easeOut,
  easeOutBack,
  lerp,
} from "../../shared/easing";
import { DETONATION_MS, drawDetonation } from "../../shared/explosion";
import { playBarExplosion } from "../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import { tapHits } from "../../shared/tapTarget";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";
import { stampGlimmer } from "../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";

// the core turns CORE_ABOVE over its floor's bar, CORE_EDGE in from the
// floor's sides; its stars on two arms out to STAR_R, on a disk tilted flat
// to TILT, each turning SPIN * (SPIN_R / r)^SPIN_FALLOFF radians a ms
const CORE_ABOVE = 150;
const CORE_EDGE = 320;
const CORE_SIZE = WISP_SIZE * 0.9;
const CORE_HEAT = 0.6;
const HIT_RADIUS = 80;
const STAR_R: [number, number] = [40, 280];
const STAR_SPREAD = 0.7;
const ARM_TWIST = 0.013;
const ARM_JITTER = 0.6;
const TILT = 0.38;
const SPIN = 0.0035;
const SPIN_R = 80;
const SPIN_FALLOFF = 1.2;
const STAR_SIZE: [number, number] = [10, 26];
const IN_MS = 400;
const GLOW = fadeStops(COLOR.heavenlyGold);
const GLOW_R = 300;
const GLOW_ALPHA = 0.5;
// tapped: it bursts, then the workers are struck FIRST_HIT_MS on, HIT_GAP_MS
// apart, nearest first
const BURST_SIZE = 320;
const BURST_SHAKE = 0.6;
const FIRST_HIT_MS = 150;
const HIT_GAP_MS = 50;
// a struck worker: a shockwave and a jump; with the jump a coin pops out
// of the worker's head, rising RISE over COIN_IN_MS to COIN_ABOVE over its
// middle (the coin spawn's size), holds HOLD_MS, then flips up into the
// total, paying as it lands
const HIT_SIZE = 150;
const HIT_SHAKE = 0.25;
const COIN_ABOVE = 170;
const RISE = 90;
const COIN_RADIUS = 60;
const COIN_IN_MS = 300;
const HOLD_MS = 500;
const LAND_SHAKE = 0.4;

interface Star {
  r: number;
  angle: number;
  spin: number;
  size: number;
  color: string;
}

interface Target {
  floor: Floor;
  workerIndex: number;
  // performance.now() it's struck (Infinity until tapped) and whether it
  // has been, whether its coin has popped up, the coin's flip and whether
  // that has landed
  hitAt: number;
  struck: boolean;
  chimed: boolean;
  flip: CoinFlip | null;
  paid: boolean;
}

interface Swirl {
  floor: Floor;
  // the core, floor space
  x: number;
  y: number;
  bornAt: number;
  tappedAt: number;
  stars: Star[];
  targets: Target[];
  share: BigNumber;
}

let getDeps: (() => FloorActionsDeps) | null = null;
let swirl: Swirl | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.starSwirl, performance.now());
const core: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const coin: Point = { x: 0, y: 0 };
const total: Point = { x: 0, y: 0 };
const fixed = () => core;

// the floor actions of the building on screen
export function wireStarSwirl(deps: () => FloorActionsDeps): void {
  getDeps = deps;
}

// once the last swirl is gone, rolls to turn another, like the mouse
export function updateStarSwirl(now: number): void {
  if (swirl) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) startSwirl(now);
}

// turns a swirl now (test button)
export function forceStarSwirl(): void {
  startSwirl(performance.now());
}

const isGround = (deps: FloorActionsDeps, floor: Floor) =>
  deps.floors.indexOf(floor) === 0;

// every worker in view on an open floor
function workersInView(deps: FloorActionsDeps): Target[] {
  const targets: Target[] = [];
  for (const entry of deps.getOnScreenFloors?.() ?? []) {
    const { floor } = entry;
    if (!floor.unlocked || isFloorLocked(floor)) continue;
    for (let i = 0; i < getRenderedWorkerCount(floor); i++) {
      const c = getWorkerCenter(floor, i);
      if (c && isVisibleOnFloor(entry, c.y))
        targets.push({
          floor,
          workerIndex: i,
          hitAt: Infinity,
          struck: false,
          chimed: false,
          flip: null,
          paid: false,
        });
    }
  }
  return targets;
}

function startSwirl(now: number): void {
  const deps = getDeps?.();
  if (!deps || !workersInView(deps).length) return;
  const floors = (deps.getOnScreenFloors?.() ?? []).filter((entry) => {
    const bar = getIncomeBarCenter(isGround(deps, entry.floor));
    return entry.floor.unlocked && isVisibleOnFloor(entry, bar.y - CORE_ABOVE);
  });
  if (!floors.length) return;
  const floor = floors[Math.floor(Math.random() * floors.length)].floor;
  const bar = getIncomeBarCenter(isGround(deps, floor));
  const { stars: count, rewardSecondsPerWorker } =
    CONFIG.randomSpawns.starSwirl;
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const r = lerp(STAR_R, Math.random() ** STAR_SPREAD);
    stars.push({
      r,
      angle:
        (i % 2) * Math.PI + r * ARM_TWIST + (Math.random() - 0.5) * ARM_JITTER,
      spin: SPIN * (SPIN_R / r) ** SPIN_FALLOFF,
      size: between(STAR_SIZE),
      color: i % 3 ? COLOR.heavenlyGold : COLOR.white,
    });
  }
  const rate = getCompanyIncomeRatePerSecond(getActiveCompanyIndex());
  loadSpinCoin();
  swirl = {
    floor,
    x: lerp([FLOOR_X_MIN + CORE_EDGE, FLOOR_X_MAX - CORE_EDGE], Math.random()),
    y: bar.y - CORE_ABOVE,
    bornAt: now,
    tappedAt: Infinity,
    stars,
    targets: [],
    share: multiply(rate, rewardSecondsPerWorker),
  };
}

// floor-space (x, y) on floor, on screen, into p; false once floor is gone
function onScreen(
  deps: FloorActionsDeps,
  floor: Floor,
  x: number,
  y: number,
  p: Point,
): boolean {
  const area = deps.floors.includes(floor)
    ? deps.getScreenAreaLocal?.(floor)
    : null;
  if (!area) return false;
  p.x = x - area.left;
  p.y = y - area.top;
  return true;
}

// a star's angle round the core at t
const angleAt = (s: Star, t: number, bornAt: number) =>
  s.angle + s.spin * (t - bornAt);

// whether a tap at (x, y) (gameCanvas screen units) lands on the core now
function coreUnder(x: number, y: number, now: number): boolean {
  const s = swirl;
  const deps = getDeps?.();
  if (!s || !deps || s.tappedAt !== Infinity) return false;
  const age = now - s.bornAt;
  if (age < IN_MS / 2 || age >= CONFIG.randomSpawns.starSwirl.durationMs)
    return false;
  return (
    onScreen(deps, s.floor, s.x, s.y, core) && tapHits(x, y, core, HIT_RADIUS)
  );
}

export function hitTestStarSwirl(x: number, y: number): boolean {
  return coreUnder(x, y, performance.now());
}

// bursts the core at (x, y), its shockwave striking the workers in view;
// true if it was hit, so the press goes no further
export function tapStarSwirl(x: number, y: number): boolean {
  const now = performance.now();
  const s = swirl;
  const deps = getDeps?.();
  if (!s || !deps || !coreUnder(x, y, now)) return false;
  s.tappedAt = now;
  // nearest the core first
  const reach = new Map<Target, number>();
  s.targets = workersInView(deps);
  for (const target of s.targets) {
    const c = getWorkerCenter(target.floor, target.workerIndex);
    const shown = c && onScreen(deps, target.floor, c.x, c.y, to);
    reach.set(
      target,
      shown ? Math.hypot(to.x - core.x, to.y - core.y) : Infinity,
    );
  }
  s.targets.sort((a, b) => reach.get(a)! - reach.get(b)!);
  s.targets.forEach((target, k) => {
    target.hitAt = now + FIRST_HIT_MS + k * HIT_GAP_MS;
  });
  shakeScreen(BURST_SHAKE);
  playBarExplosion(0.9);
  return true;
}

// a worker struck by the shockwave: it jumps like a clicked worker
function hitWorker(target: Target): void {
  target.struck = true;
  shakeScreen(HIT_SHAKE);
  triggerJump(target.floor, target.workerIndex, Date.now());
}

// a worker's coin landing in the total: its pay
function pay(deps: FloorActionsDeps, s: Swirl, target: Target): void {
  target.paid = true;
  addTotalIncome(s.share);
  deps.persist();
  pulseHudTotalFlash();
  playSold();
  shakeScreen(LAND_SHAKE);
}

// a struck worker's coin: popping out of its head as it jumps, holding, then
// flipping into the total; false once it has landed
function drawWorkerCoin(
  ctx: CanvasRenderingContext2D,
  deps: FloorActionsDeps,
  s: Swirl,
  target: Target,
  t: number,
): boolean {
  if (target.paid) return false;
  const since = t - target.hitAt;
  const turn = since * COIN_SPIN;
  if (!target.flip) {
    const c = getWorkerCenter(target.floor, target.workerIndex);
    const pop = clamp01(since / COIN_IN_MS);
    const rise = RISE * (1 - easeOut(pop));
    const y = c ? c.y - COIN_ABOVE + rise : 0;
    if (!c || !onScreen(deps, target.floor, c.x, y, coin)) {
      pay(deps, s, target);
      return false;
    }
    if (!target.chimed) {
      target.chimed = true;
      playCoinAppear();
    }
    if (since < COIN_IN_MS + HOLD_MS) {
      const grow = easeOutBack(pop);
      drawSpinCoin(ctx, coin.x, coin.y, COIN_RADIUS * grow, 1, turn);
      return true;
    }
    target.flip = startCoinFlip(coin, t, COIN_RADIUS, turn);
  }
  drawCoinFlip(ctx, target.flip, t, total, () => pay(deps, s, target));
  return !target.paid;
}

// the spiral turning round its core, blinking out at its end
function drawTurning(
  ctx: CanvasRenderingContext2D,
  s: Swirl,
  t: number,
  now: number,
): boolean {
  const { durationMs, pulseMs } = CONFIG.randomSpawns.starSwirl;
  const age = t - s.bornAt;
  const msLeft = durationMs - age;
  if (isSpawnGone(msLeft)) return false;
  const fade = spawnFade(msLeft, pulseMs, now);
  const grow = easeOutBack(clamp01(age / IN_MS)) * fade.scale;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = GLOW_ALPHA * fade.alpha;
  drawGlow(ctx, GLOW, core.x, core.y, GLOW_R * grow, TILT);
  ctx.globalAlpha = fade.alpha;
  for (let i = 0; i < s.stars.length; i++) {
    const star = s.stars[i];
    const a = angleAt(star, t, s.bornAt);
    const x = core.x + Math.cos(a) * star.r * grow;
    const y = core.y + Math.sin(a) * star.r * grow * TILT;
    const size = star.size * fade.scale;
    stampGlimmer(ctx, x, y, size, i + t * 0.002, star.color);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  drawWisp(ctx, fixed, t, now, CORE_SIZE * grow, CORE_HEAT, fade.alpha);
  return true;
}

// the burst core, then a shockwave on each worker in turn; false once every
// coin has landed and every blast is done
function drawFlung(
  ctx: CanvasRenderingContext2D,
  deps: FloorActionsDeps,
  s: Swirl,
  t: number,
  now: number,
): boolean {
  let busy = t - s.tappedAt < DETONATION_MS;
  drawDetonation(ctx, core, t - s.tappedAt, BURST_SIZE, now);
  for (const target of s.targets) {
    if (t < target.hitAt) {
      busy = true;
      continue;
    }
    if (!target.struck) hitWorker(target);
    if (drawWorkerCoin(ctx, deps, s, target, t)) busy = true;
    const since = t - target.hitAt;
    if (since >= DETONATION_MS) continue;
    busy = true;
    const c = getWorkerCenter(target.floor, target.workerIndex);
    if (c && onScreen(deps, target.floor, c.x, c.y, to))
      drawDetonation(ctx, to, since, HIT_SIZE, now);
  }
  return busy;
}

// the swirl, in gameCanvas's screen units (w wide, the total's middle at
// totalAtY), each frame
export function drawStarSwirl(
  ctx: CanvasRenderingContext2D,
  w: number,
  totalAtY: number,
  now: number,
): void {
  const s = swirl;
  const deps = getDeps?.();
  if (!s || !deps) return;
  total.x = w / 2;
  total.y = totalAtY;
  const t = performance.now();
  const shown = onScreen(deps, s.floor, s.x, s.y, core);
  if (s.tappedAt === Infinity) {
    if (!shown || !drawTurning(ctx, s, t, now)) swirl = null;
    return;
  }
  if (!drawFlung(ctx, deps, s, t, now)) swirl = null;
}
