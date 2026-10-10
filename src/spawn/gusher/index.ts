// the gusher: every so often, like the mouse and the bubbles, a vent opens
// at the bottom of the screen, fizzing and spitting up a coin now and then,
// for CONFIG.randomSpawns.gusher.durationMs before it vanishes the way
// every spawn does (shared/spawnFade). A tap blows it: a blast, then a
// roaring stream of coins and cash shoots up out of it and flows over into
// the total, each paying its share of rewardSeconds of the company's income.
//
// gameCanvas wires the floor actions in (wireGusher), ticks the spawn timer
// (updateGusher), taps it (tapGusher) and draws it in screen space over the
// HUD (drawGusher)
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playSold } from "../../sound";
import { getActiveCompanyIndex } from "../../company";
import {
  addTotalIncome,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import type { FloorActionsDeps } from "../../floors";
import {
  beginCoinBatch,
  COIN_BILL_CHANCE,
  drawCoinBurstFrame,
  endCoinBatch,
  randomCoinBurstSize,
  type CoinBurstSprite,
} from "../../coinBurst";
import { multiply, type BigNumber } from "../../shared/bigNumber";
import { cubic } from "../../shared/curves";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { DETONATION_MS, drawDetonation } from "../../shared/explosion";
import { playBarExplosion } from "../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import { tapHits } from "../../shared/tapTarget";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";
import { hash01 } from "../../shared/twinkle";
import type { Point } from "../../shared/wisp";

// the vent: a dark slot VENT_W across, squashed flat, BOTTOM up from the
// screen's bottom somewhere across VENT_X of its width, glowing gold; it
// opens over OPEN_MS
const VENT_W = 180;
const VENT_SQUASH = 0.22;
const BOTTOM = 90;
const VENT_X: [number, number] = [0.2, 0.8];
const OPEN_MS = 280;
const VENT_GLOW = fadeStops(COLOR.heavenlyGold);
const GLOW_R = 150;
const GLOW_ALPHA = 0.55;
const GLOW_PULSE = 0.25;
const HIT_RADIUS = 110;
// while it waits it spits a coin SPIT_H up every SPIT_EVERY_MS
const SPIT_EVERY_MS = 160;
const SPIT_MS = 420;
const SPIT_H: [number, number] = [60, 150];
const SPIT_SPREAD = 90;
const SPIT_COIN = 20;
// blown: a blast, then the stream pours for FLOW_MS, each coin or bill
// shooting straight up to APEX_UNDER the total, then flowing over BOW into
// the readout, FLOW_TRAVEL_MS on the way, WOBBLE either side of the stream
const BLOW_SIZE = 320;
const BLOW_SHAKE = 0.8;
const FLOW_MS = 1_600;
const FLOW_TRAVEL_MS = 900;
const APEX_UNDER = 260;
const BOW = 220;
const WOBBLE = 130;
const COIN_SPIN = 0.02;
// the total's readout the stream lands across
const LAND_SPREAD = 200;
const RUMBLE_EVERY_MS = 110;
const RUMBLE_SHAKE = 0.15;
const LAST_SHAKE = 0.5;

interface Vent {
  // across the screen, as a fraction of its width
  fx: number;
  bornAt: number;
  // performance.now() it blew (Infinity until tapped), and where
  blownAt: number;
  from: Point;
  paid: number;
  rumbled: number;
  share: BigNumber;
}

let getDeps: (() => FloorActionsDeps) | null = null;
let vent: Vent | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.gusher, performance.now());
let width = 1;
let height = 1;
const spot: Point = { x: 0, y: 0 };
const total: Point = { x: 0, y: 0 };
const up: Point = { x: 0, y: 0 };
const over: Point = { x: 0, y: 0 };
const land: Point = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };
// each piece's wobble, where on the readout it lands, and coin or bill
const pieces = Array.from({ length: CONFIG.randomSpawns.gusher.coins }, () => ({
  dx: (Math.random() - 0.5) * 2 * WOBBLE,
  land: (Math.random() - 0.5) * LAND_SPREAD,
  size: randomCoinBurstSize(),
  sprite: {
    kind: Math.random() < COIN_BILL_CHANCE ? "bill" : "coin",
    spinFrame: 0,
    axisAngle: (Math.random() - 0.5) * Math.PI,
  } as CoinBurstSprite,
}));
const spitSprite: CoinBurstSprite = {
  kind: "coin",
  spinFrame: 0,
  axisAngle: 0,
};

// the floor actions of the building on screen
export function wireGusher(deps: () => FloorActionsDeps): void {
  getDeps = deps;
}

// once the last vent is gone, rolls to open another, like the mouse
export function updateGusher(now: number): void {
  if (vent) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) startVent(now);
}

// opens a vent now (test button)
export function forceGusher(): void {
  startVent(performance.now());
}

function startVent(now: number): void {
  const { rewardSeconds } = CONFIG.randomSpawns.gusher;
  const rate = getCompanyIncomeRatePerSecond(getActiveCompanyIndex());
  vent = {
    fx: lerp(VENT_X, Math.random()),
    bornAt: now,
    blownAt: Infinity,
    from: { x: 0, y: 0 },
    paid: 0,
    rumbled: 0,
    share: multiply(rate, rewardSeconds / pieces.length),
  };
}

// where the vent is on screen, into spot
function ventAt(v: Vent): Point {
  spot.x = v.fx * width;
  spot.y = height - BOTTOM;
  return spot;
}

function ventUnder(x: number, y: number, now: number): Vent | null {
  const v = vent;
  if (!v || v.blownAt !== Infinity) return null;
  const age = now - v.bornAt;
  if (age < OPEN_MS / 2 || age >= CONFIG.randomSpawns.gusher.durationMs)
    return null;
  return tapHits(x, y, ventAt(v), HIT_RADIUS) ? v : null;
}

export function hitTestGusher(x: number, y: number): boolean {
  return !!ventUnder(x, y, performance.now());
}

// blows the vent at (x, y); true if there was one, so the press goes no
// further
export function tapGusher(x: number, y: number): boolean {
  const now = performance.now();
  const v = ventUnder(x, y, now);
  if (!v) return false;
  v.blownAt = now;
  v.from.x = spot.x;
  v.from.y = spot.y;
  shakeScreen(BLOW_SHAKE);
  playBarExplosion(0.8);
  return true;
}

// a piece landing in the total: its share
function pay(v: Vent): void {
  v.paid++;
  if (v.paid === 1) playSold();
  addTotalIncome(v.share);
  pulseHudTotalFlash();
  if (v.paid === pieces.length) {
    getDeps?.().persist();
    shakeScreen(LAST_SHAKE);
  }
}

// the waiting vent and the coins it spits, until its time runs out
function drawWaiting(
  ctx: CanvasRenderingContext2D,
  v: Vent,
  t: number,
  now: number,
): boolean {
  const { durationMs, pulseMs } = CONFIG.randomSpawns.gusher;
  const age = t - v.bornAt;
  const msLeft = durationMs - age;
  if (isSpawnGone(msLeft)) return false;
  ventAt(v);
  const fade = spawnFade(msLeft, pulseMs, now);
  const open = easeOutBack(clamp01(age / OPEN_MS)) * fade.scale;
  ctx.save();
  ctx.globalAlpha = fade.alpha;
  ctx.fillStyle = COLOR.black;
  ctx.beginPath();
  const r = (VENT_W / 2) * open;
  ctx.ellipse(spot.x, spot.y, r, r * VENT_SQUASH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = fade.alpha * (GLOW_ALPHA + GLOW_PULSE * Math.sin(t * 0.02));
  drawGlow(ctx, VENT_GLOW, spot.x, spot.y - 20, GLOW_R * open, 0.6);
  ctx.restore();
  // the spits: one leaves every SPIT_EVERY_MS, hops up and drops back
  const base = ctx.getTransform();
  ctx.globalAlpha = fade.alpha;
  for (let k = Math.floor((age - SPIT_MS) / SPIT_EVERY_MS) + 1; ; k++) {
    const since = age - k * SPIT_EVERY_MS;
    if (since < 0) break;
    if (k < 0 || since >= SPIT_MS) continue;
    const u = since / SPIT_MS;
    const h = lerp(SPIT_H, hash01(k, 1));
    const dx = (hash01(k, 2) - 0.5) * SPIT_SPREAD * u;
    spitSprite.spinFrame = t * COIN_SPIN + k;
    drawCoinBurstFrame(
      ctx,
      spitSprite,
      spot.x + dx,
      spot.y - h * 4 * u * (1 - u),
      SPIT_COIN * fade.scale,
      base,
    );
  }
  ctx.globalAlpha = 1;
  return true;
}

// the blown vent: its blast, then the stream of coins and cash pouring up
// and over into the total
function drawPouring(
  ctx: CanvasRenderingContext2D,
  v: Vent,
  t: number,
  now: number,
): boolean {
  const since = t - v.blownAt;
  let busy = since < DETONATION_MS;
  drawDetonation(ctx, v.from, since, BLOW_SIZE, now);
  const rumble = Math.floor(since / RUMBLE_EVERY_MS);
  if (rumble > v.rumbled && since < FLOW_MS) {
    v.rumbled = rumble;
    shakeScreen(RUMBLE_SHAKE);
  }
  const apexY = total.y + APEX_UNDER;
  const gap = FLOW_MS / pieces.length;
  const base = ctx.getTransform();
  beginCoinBatch(ctx);
  let landed = 0;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    const u = (since - i * gap) / FLOW_TRAVEL_MS;
    if (u < 0) {
      busy = true;
      break;
    }
    if (u >= 1) {
      landed++;
      continue;
    }
    busy = true;
    // straight up out of the vent, over the top, down into the readout
    up.x = v.from.x + p.dx;
    up.y = apexY;
    over.x = total.x + p.land;
    over.y = apexY - BOW;
    land.x = total.x + p.land;
    land.y = total.y;
    cubic(v.from, up, over, land, u, at);
    p.sprite.spinFrame = t * COIN_SPIN + i;
    drawCoinBurstFrame(
      ctx,
      p.sprite,
      at.x + p.dx * (1 - u * u),
      at.y,
      p.size,
      base,
    );
  }
  endCoinBatch(ctx);
  while (v.paid < landed) pay(v);
  return busy;
}

// the vent or its stream, in gameCanvas's screen units (w x h, the total's
// middle at totalAtY), each frame
export function drawGusher(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  totalAtY: number,
  now: number,
): void {
  width = w;
  height = h;
  const v = vent;
  if (!v) return;
  total.x = w / 2;
  total.y = totalAtY;
  const t = performance.now();
  const alive =
    v.blownAt === Infinity
      ? drawWaiting(ctx, v, t, now)
      : drawPouring(ctx, v, t, now);
  if (!alive) vent = null;
}
