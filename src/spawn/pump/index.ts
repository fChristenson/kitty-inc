// the pump: every so often, like the mouse and the bubbles, a crackling
// glitter orb hangs over a floor's bar for CONFIG.randomSpawns.pump.durationMs,
// blinking before it vanishes. Every tap pumps it bigger with a jolt; the
// last of CONFIG's taps blows it: a huge blast, a rattling cluster of blasts
// all over the bars in view, then a crit number slams onto each bar.
//
// gameCanvas wires the floor actions in (wirePump), ticks the spawn timer
// (updatePump), taps it (tapPump) and draws it in screen space over the HUD
// (drawPump)
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop } from "../../sound";
import {
  FLOOR_X_MAX,
  FLOOR_X_MIN,
  getIncomeBarBox,
  getIncomeBarCenter,
  type FloorActionsDeps,
} from "../../floors";
import type { Floor } from "../../gameState";
import { pickCritTierByOdds } from "../../crits";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { DETONATION_MS, drawDetonation } from "../../shared/explosion";
import { playBarExplosion } from "../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import {
  barsInView,
  collectPrize,
  drawPayout,
  isPayoutDone,
  prepareMini,
  type Payout,
  type Prize,
} from "../../shared/spawnPrize";
import { tapHits } from "../../shared/tapTarget";
import { stampGlimmer } from "../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";

// the orb hangs ORB_ABOVE over its floor's bar, ORB_EDGE in from the floor's
// sides; RADIUS across, PUMP_GROW more with each pump, jolting KICK bigger
// for a moment on each
const ORB_ABOVE = 210;
const ORB_EDGE = 300;
const RADIUS = 60;
const PUMP_GROW = 30;
const KICK = 0.3;
const KICK_MS = 90;
const WOBBLE = 0.05;
const WOBBLE_RATE = 0.04;
const IN_MS = 260;
const GLOW = fadeStops(COLOR.heavenlyGold);
const GLOW_RADII = 1.7;
const GLOW_ALPHA = 0.45;
const GLOW_PER_PUMP = 0.1;
const WISP_PER_RADIUS = WISP_SIZE / 70;
// glitter crackling round its skin, more and faster with each pump
const CRACKLE = 12;
const CRACKLE_PER_PUMP = 4;
const CRACKLE_SIZE = 14;
const CRACKLE_SIZE_PER_PUMP = 4;
const CRACKLE_SPIN = 0.002;
const TAP_SHAKE = 0.1;
const TAP_SHAKE_PER_PUMP = 0.05;
// blown: a huge blast, then PER_BAR blasts on every bar in view BARRAGE_MS
// apart, nearest first, then a crit number onto each bar NUMBER_GAP_MS apart
const BLOW_SIZE = 440;
const BLOW_SHAKE = 1;
const PER_BAR = 4;
const BARRAGE_LEAD_MS = 70;
const BARRAGE_MS = 45;
const BARRAGE_SIZE = 140;
const BARRAGE_SHAKE = 0.15;
const NUMBER_LEAD_MS = 80;
const NUMBER_GAP_MS = 70;
const NUMBER_SIZE = 160;

interface Blast {
  floor: Floor;
  // floor space
  x: number;
  y: number;
  at: number;
  fired: boolean;
}

interface Orb {
  floor: Floor;
  // floor space
  x: number;
  y: number;
  bornAt: number;
  pumps: number;
  pumpedAt: number;
  // performance.now() it blew (Infinity until then)
  blownAt: number;
  blasts: Blast[];
  payouts: Payout[];
}

let getDeps: (() => FloorActionsDeps) | null = null;
let orb: Orb | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.pump, performance.now());
let height = 1;
const spot: Point = { x: 0, y: 0 };
const blastAt: Point = { x: 0, y: 0 };
const fixed = () => spot;

// the floor actions of the building on screen
export function wirePump(deps: () => FloorActionsDeps): void {
  getDeps = deps;
}

// once the last orb is gone, rolls to hang another, like the mouse
export function updatePump(now: number): void {
  if (orb) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) startOrb(now);
}

// hangs an orb now (test button)
export function forcePump(): void {
  startOrb(performance.now());
}

const isGround = (deps: FloorActionsDeps, floor: Floor) =>
  deps.floors.indexOf(floor) === 0;

function startOrb(now: number): void {
  const deps = getDeps?.();
  const floors = deps ? barsInView(deps) : [];
  if (!deps || !floors.length) return;
  const floor = floors[Math.floor(Math.random() * floors.length)];
  const bar = getIncomeBarCenter(isGround(deps, floor));
  orb = {
    floor,
    x: lerp([FLOOR_X_MIN + ORB_EDGE, FLOOR_X_MAX - ORB_EDGE], Math.random()),
    y: bar.y - ORB_ABOVE,
    bornAt: now,
    pumps: 0,
    pumpedAt: -Infinity,
    blownAt: Infinity,
    blasts: [],
    payouts: [],
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

function radiusAt(o: Orb, t: number): number {
  const age = t - o.bornAt;
  const kick = 1 + KICK * Math.exp(-(t - o.pumpedAt) / KICK_MS);
  const wobble = 1 + WOBBLE * Math.sin(t * WOBBLE_RATE) * (o.pumps / pumps());
  const grow = easeOutBack(clamp01(age / IN_MS));
  return (RADIUS + PUMP_GROW * o.pumps) * grow * kick * wobble;
}

const pumps = () => CONFIG.randomSpawns.pump.pumps;

// the orb if a tap at (x, y) (gameCanvas screen units) lands on it now
function orbUnder(x: number, y: number, now: number): Orb | null {
  const o = orb;
  const deps = getDeps?.();
  if (!o || !deps || o.blownAt !== Infinity) return null;
  const age = now - o.bornAt;
  if (age < IN_MS / 2 || age >= CONFIG.randomSpawns.pump.durationMs)
    return null;
  if (!onScreen(deps, o.floor, o.x, o.y, spot)) return null;
  return tapHits(x, y, spot, radiusAt(o, now)) ? o : null;
}

export function hitTestPump(x: number, y: number): boolean {
  return !!orbUnder(x, y, performance.now());
}

// pumps the orb at (x, y), the last pump blowing it; true if there was one,
// so the press goes no further
export function tapPump(x: number, y: number): boolean {
  const now = performance.now();
  const o = orbUnder(x, y, now);
  const deps = getDeps?.();
  if (!o || !deps) return false;
  o.pumps++;
  o.pumpedAt = now;
  playBloop();
  shakeScreen(TAP_SHAKE + TAP_SHAKE_PER_PUMP * o.pumps);
  if (o.pumps >= pumps()) blow(deps, o, now);
  return true;
}

// the orb going off: its blast, the barrage over the bars, then a crit
// number from where it hung onto each bar
function blow(deps: FloorActionsDeps, o: Orb, now: number): void {
  o.blownAt = now;
  shakeScreen(BLOW_SHAKE);
  playBarExplosion(0.8);
  const floors = barsInView(deps);
  const spots: { floor: Floor; x: number; y: number; d: number }[] = [];
  for (const floor of floors) {
    const box = getIncomeBarBox(isGround(deps, floor));
    if (!onScreen(deps, floor, 0, box.y + box.height / 2, blastAt)) continue;
    for (let k = 0; k < PER_BAR; k++) {
      const x = box.x + ((k + Math.random()) / PER_BAR) * box.width;
      const sx = x + blastAt.x;
      const d = Math.hypot(sx - spot.x, blastAt.y - spot.y);
      spots.push({ floor, x, y: box.y + box.height / 2, d });
    }
  }
  spots.sort((a, b) => a.d - b.d);
  const start = now + BARRAGE_LEAD_MS;
  o.blasts = spots.map((s, i) => ({
    floor: s.floor,
    x: s.x,
    y: s.y,
    at: start + i * BARRAGE_MS,
    fired: false,
  }));
  const numbersAt = start + spots.length * BARRAGE_MS + NUMBER_LEAD_MS;
  floors.forEach((floor, k) => {
    const prize: Prize = { kind: "tier", tier: pickCritTierByOdds() };
    prepareMini(prize);
    const at = numbersAt + k * NUMBER_GAP_MS;
    const payout = collectPrize(
      deps,
      floor,
      prize,
      spot,
      height,
      NUMBER_SIZE,
      at,
    );
    if (payout) o.payouts.push(payout);
  });
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  o: Orb,
  t: number,
  now: number,
): void {
  const { durationMs, pulseMs } = CONFIG.randomSpawns.pump;
  const fade = spawnFade(o.bornAt + durationMs - t, pulseMs, now);
  const r = radiusAt(o, t) * fade.scale;
  if (r <= 0) return;
  const n = o.pumps;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = (GLOW_ALPHA + GLOW_PER_PUMP * n) * fade.alpha;
  drawGlow(ctx, GLOW, spot.x, spot.y, r * GLOW_RADII);
  const count = CRACKLE + CRACKLE_PER_PUMP * n;
  const spin = t * CRACKLE_SPIN * (1 + n);
  const crackle = (CRACKLE_SIZE + CRACKLE_SIZE_PER_PUMP * n) * fade.scale;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + spin;
    const flick = 0.5 + 0.5 * Math.sin(now * 0.03 + i * 1.7);
    ctx.globalAlpha = fade.alpha;
    stampGlimmer(
      ctx,
      spot.x + Math.cos(a) * r,
      spot.y + Math.sin(a) * r,
      crackle * flick,
      i,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  drawWisp(ctx, fixed, t, now, r * WISP_PER_RADIUS, n / pumps(), fade.alpha);
}

// the orb, its blasts and its numbers, in gameCanvas's screen units (w x h),
// each frame
export function drawPump(
  ctx: CanvasRenderingContext2D,
  _w: number,
  h: number,
  now: number,
): void {
  height = h;
  const o = orb;
  const deps = getDeps?.();
  if (!o || !deps) return;
  const t = performance.now();
  if (!onScreen(deps, o.floor, o.x, o.y, spot)) {
    if (o.blownAt === Infinity) orb = null;
  } else if (o.blownAt === Infinity) {
    if (isSpawnGone(o.bornAt + CONFIG.randomSpawns.pump.durationMs - t)) {
      orb = null;
      return;
    }
    drawOrb(ctx, o, t, now);
    return;
  }
  let busy = t - o.blownAt < DETONATION_MS;
  drawDetonation(ctx, spot, t - o.blownAt, BLOW_SIZE, now);
  for (const b of o.blasts) {
    const since = t - b.at;
    if (since < 0) {
      busy = true;
      continue;
    }
    if (!b.fired) {
      b.fired = true;
      shakeScreen(BARRAGE_SHAKE);
      playBarExplosion(1 + 0.2 * Math.random());
    }
    if (since >= DETONATION_MS) continue;
    busy = true;
    if (onScreen(deps, b.floor, b.x, b.y, blastAt))
      drawDetonation(ctx, blastAt, since, BARRAGE_SIZE, now);
  }
  for (const p of o.payouts) {
    if (isPayoutDone(p, t)) continue;
    busy = true;
    drawPayout(ctx, deps, p, h, t, now);
  }
  if (!busy) orb = null;
}
