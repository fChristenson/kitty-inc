// the coins: every so often, like the mouse and the bubbles, a few black
// holes open one after another on the floors in view, a gold coin rises out
// of each and its hole closes behind it. Each coin hovers just over the floor
// where the workers walk, spinning, for CONFIG.randomSpawns.coin.durationMs,
// pulsing before its hole opens again and swallows it. A tap flips one up
// into the air; at the peak of the flip it's sucked into the total, paying
// its share of rewardSeconds of the company's income as it lands.
//
// gameCanvas wires the floor actions in (wireCoinSpawn), ticks the spawn
// timer (updateCoinSpawn), taps them (tapCoinSpawn) and draws them in screen
// space over the HUD (drawCoinSpawn)
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playCoinAppear, playSold, playSwoosh } from "../../sound";
import { getActiveCompanyIndex } from "../../company";
import {
  addTotalIncome,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import {
  FLOOR_X_MAX,
  FLOOR_X_MIN,
  WORKER_FEET_Y,
  type FloorActionsDeps,
} from "../../floors";
import type { Floor } from "../../gameState";
import { isVisibleOnFloor } from "../../crits";
import { loadImageByName } from "../../loadAssets";
import { randomInt } from "../../utils";
import { multiply, type BigNumber } from "../../shared/bigNumber";
import { bezier } from "../../shared/curves";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../shared/easing";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { tapHits } from "../../shared/tapTarget";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";
import { stampGlimmer } from "../../shared/twinkle";
import { urgentBlink } from "../../shared/urgentBlink";
import type { Point } from "../../shared/wisp";

// a hole, lying flat on the floor (squashed to HOLE_SQUASH of its width);
// it shuts HOLE_SHUT_MS in, once its coin is out
const HOLE_SIZE = 160;
const HOLE_SQUASH = 0.32;
const HOLE_OPEN_MS = 280;
const HOLE_CLOSE_MS = 220;
const HOLE_SHUT_MS = 480;
// the holes open STAGGER_MS apart, at least SPREAD apart on one floor
const STAGGER_MS = 160;
const SPREAD = 200;
const PLACE_TRIES = 12;
// a coin rises out of its hole to hover just over the floor, bobbing and
// spinning round its upright axis like the splash screen's coin (a turn
// every 900ms), three quarters of a bubble's coin
const COIN_RADIUS = 60;
const COIN_PX = 128;
const RISE_MS = 420;
const HOVER = 104;
const BOB = 8;
const BOB_RATE = 0.004;
const SPIN = (Math.PI * 2) / 900;
// left untapped, its hole reopens and it sinks in SINK_LEAD_MS later
const SINK_LEAD_MS = 150;
const SINK_MS = 300;
const GLOW = fadeStops(COLOR.heavenlyGold);
const GLOW_ALPHA = 0.35;
// a tap flips it FLIP_HIGH up, spinning fast, swelling a little; at the
// peak it's sucked into the total, shrinking as it goes
const FLIP_MS = 380;
const FLIP_HIGH = 300;
const FLIP_SPIN = 0.03;
const FLIP_GROW = 0.2;
const SUCK_MS = 320;
const SUCK_SHRINK = 0.65;
const PEAK_GLINT = 90;
const PEAK_GLINT_MS = 180;
const LAND_SHAKE = 0.4;

interface Coin {
  floor: Floor;
  // where on the floor it opens, in the floor's own space
  localX: number;
  // performance.now() it opens, it's tapped (Infinity until then) and from
  // where on screen
  bornAt: number;
  tappedAt: number;
  from: Point;
  chimed: boolean;
  swooshed: boolean;
  done: boolean;
}

let getDeps: (() => FloorActionsDeps) | null = null;
const coins: Coin[] = [];
// what each coin pays
let share: BigNumber | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.coin, performance.now());
// the coin, rastered once from coin.webp
let face: HTMLCanvasElement | null = null;
let loading = false;
const hole: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const peak: Point = { x: 0, y: 0 };
const bend: Point = { x: 0, y: 0 };
const total: Point = { x: 0, y: 0 };

// the floor actions of the building on screen
export function wireCoinSpawn(deps: () => FloorActionsDeps): void {
  getDeps = deps;
}

// once the last coins are gone, rolls to open more, like the mouse
export function updateCoinSpawn(now: number): void {
  if (coins.length > 0) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) startCoins(now);
}

// opens a few coins now (test button)
export function forceCoinSpawn(): void {
  startCoins(performance.now());
}

function raster(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = COIN_PX;
  const c = canvas.getContext("2d")!;
  c.imageSmoothingQuality = "high";
  c.drawImage(image, 0, 0, COIN_PX, COIN_PX);
  return canvas;
}

function loadCoin(): void {
  if (loading) return;
  loading = true;
  loadImageByName("coin")
    .then((image) => {
      face = raster(image);
    })
    .catch(() => {
      loading = false;
    });
}

// a spot on floor at least SPREAD from every other coin there, the last try
// if none is
function placeOn(floor: Floor): number {
  let x = 0;
  for (let k = 0; k < PLACE_TRIES; k++) {
    x = lerp([FLOOR_X_MIN + 60, FLOOR_X_MAX - 60], Math.random());
    let clear = true;
    for (const c of coins)
      if (c.floor === floor && Math.abs(c.localX - x) < SPREAD) clear = false;
    if (clear) break;
  }
  return x;
}

function startCoins(now: number): void {
  if (!getDeps) return;
  loadCoin();
  const floors = (getDeps().getOnScreenFloors?.() ?? []).filter(
    (entry) => entry.floor.unlocked && isVisibleOnFloor(entry, WORKER_FEET_Y),
  );
  if (!floors.length) return;
  const { count, rewardSeconds } = CONFIG.randomSpawns.coin;
  const n = randomInt(...count);
  const rate = getCompanyIncomeRatePerSecond(getActiveCompanyIndex());
  share = multiply(rate, rewardSeconds / n);
  coins.length = 0;
  for (let i = 0; i < n; i++) {
    const floor = floors[Math.floor(Math.random() * floors.length)].floor;
    coins.push({
      floor,
      localX: placeOn(floor),
      bornAt: now + i * STAGGER_MS,
      tappedAt: Infinity,
      from: { x: 0, y: 0 },
      chimed: false,
      swooshed: false,
      done: false,
    });
  }
}

// where c's hole is on screen, following its floor as the view scrolls;
// false once its floor is gone (another building is on screen)
function holeAt(c: Coin): boolean {
  const deps = getDeps?.();
  const area = deps?.floors.includes(c.floor)
    ? deps.getScreenAreaLocal?.(c.floor)
    : null;
  if (!area) return false;
  hole.x = c.localX - area.left;
  hole.y = WORKER_FEET_Y - area.top;
  return true;
}

// left untapped: when a coin starts sinking, and when its hole shuts on it
const sinkAt = () => CONFIG.randomSpawns.coin.durationMs + SINK_LEAD_MS;
const swallowedAt = () => sinkAt() + SINK_MS;

// how far a hole is open at age (0..1): open while its coin rises out, shut
// while it hovers, open again to swallow it if it's never tapped
function holeOpen(age: number, tapped: boolean): number {
  const { durationMs } = CONFIG.randomSpawns.coin;
  if (age < HOLE_SHUT_MS) return easeOutBack(clamp01(age / HOLE_OPEN_MS));
  if (tapped || age < durationMs)
    return 1 - easeIn(clamp01((age - HOLE_SHUT_MS) / HOLE_CLOSE_MS));
  if (age < swallowedAt())
    return easeOutBack(clamp01((age - durationMs) / HOLE_OPEN_MS));
  return 1 - easeIn(clamp01((age - swallowedAt()) / HOLE_CLOSE_MS));
}

// a hovering coin's spot and how far it has risen out of its hole (0..1)
function hoverAt(c: Coin, now: number): number {
  const age = now - c.bornAt;
  const out =
    age < RISE_MS
      ? easeOutBack(clamp01(age / RISE_MS))
      : 1 - easeIn(clamp01((age - sinkAt()) / SINK_MS));
  spot.x = hole.x;
  spot.y = hole.y - HOVER * out + Math.sin(age * BOB_RATE) * BOB * out;
  return out;
}

function canTap(c: Coin, now: number): boolean {
  const age = now - c.bornAt;
  return (
    !c.done &&
    c.tappedAt === Infinity &&
    age >= RISE_MS * 0.5 &&
    age < CONFIG.randomSpawns.coin.durationMs
  );
}

// the coin under (x, y), its spot left in `spot`
function coinAt(x: number, y: number, now: number): Coin | null {
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    if (!canTap(c, now) || !holeAt(c)) continue;
    hoverAt(c, now);
    if (tapHits(x, y, spot, COIN_RADIUS)) return c;
  }
  return null;
}

// whether a press at (x, y) (gameCanvas screen units) lands on a coin
export function hitTestCoinSpawn(x: number, y: number): boolean {
  return !!coinAt(x, y, performance.now());
}

// flips the coin at (x, y) up; true if there was one, so the press goes no
// further
export function tapCoinSpawn(x: number, y: number): boolean {
  const now = performance.now();
  const c = coinAt(x, y, now);
  if (!c) return false;
  c.tappedAt = now;
  c.from.x = spot.x;
  c.from.y = spot.y;
  playBloop();
  return true;
}

function pay(): void {
  if (share) addTotalIncome(share);
  pulseHudTotalFlash();
  playSold();
  shakeScreen(LAND_SHAKE);
}

// the hole, open by `open` (0..1), lying flat on the floor
function drawHole(ctx: CanvasRenderingContext2D, open: number): void {
  if (open <= 0) return;
  const r = (HOLE_SIZE / 2) * open;
  ctx.fillStyle = COLOR.black;
  ctx.beginPath();
  ctx.ellipse(hole.x, hole.y, r, r * HOLE_SQUASH, 0, 0, Math.PI * 2);
  ctx.fill();
}

// the coin turned `turn` round its upright axis, mirrored once past edge-on
function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  turn: number,
): void {
  if (!face || radius <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(Math.cos(turn), 1);
  ctx.drawImage(face, -radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

// an untapped coin: its hole, and it rising, hovering or sinking
function drawHovering(
  ctx: CanvasRenderingContext2D,
  c: Coin,
  t: number,
  now: number,
): void {
  const age = t - c.bornAt;
  if (age < 0) return;
  if (!c.chimed) {
    c.chimed = true;
    playCoinAppear();
  }
  if (age >= swallowedAt() + HOLE_CLOSE_MS || !holeAt(c)) {
    c.done = true;
    return;
  }
  drawHole(ctx, holeOpen(age, false));
  const out = hoverAt(c, t);
  if (out <= 0) return;
  const { durationMs, pulseMs } = CONFIG.randomSpawns.coin;
  const blink = urgentBlink(c.bornAt + durationMs - t, pulseMs, now);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = GLOW_ALPHA * out * blink;
  drawGlow(ctx, GLOW, spot.x, spot.y, COIN_RADIUS * 1.6);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  const radius = COIN_RADIUS * (0.4 + 0.6 * out);
  drawCoin(ctx, spot.x, spot.y, radius, blink, age * SPIN);
}

// a tapped coin: flipped up, then sucked into the total at the peak
function drawFlipped(
  ctx: CanvasRenderingContext2D,
  c: Coin,
  t: number,
  w: number,
  totalAtY: number,
): void {
  const age = t - c.bornAt;
  const since = t - c.tappedAt;
  if (holeAt(c)) drawHole(ctx, holeOpen(age, true));
  const turn = age * SPIN + since * FLIP_SPIN;
  if (since < FLIP_MS) {
    const u = easeOut(since / FLIP_MS);
    drawCoin(
      ctx,
      c.from.x,
      c.from.y - FLIP_HIGH * u,
      COIN_RADIUS * (1 + FLIP_GROW * u),
      1,
      turn,
    );
    return;
  }
  peak.x = c.from.x;
  peak.y = c.from.y - FLIP_HIGH;
  if (!c.swooshed) {
    c.swooshed = true;
    playSwoosh();
  }
  const glint = (since - FLIP_MS) / PEAK_GLINT_MS;
  if (glint < 1) {
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 1 - glint;
    const size = PEAK_GLINT * (0.6 + glint);
    stampGlimmer(ctx, peak.x, peak.y, size, age, COLOR.white);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
  }
  const p = (since - FLIP_MS) / SUCK_MS;
  if (p >= 1) {
    pay();
    c.done = true;
    return;
  }
  total.x = w / 2;
  total.y = totalAtY;
  bend.x = lerp([peak.x, total.x], 0.3);
  bend.y = Math.min(peak.y, total.y) - 60;
  const k = easeIn(p);
  bezier(peak, bend, total, k, spot);
  drawCoin(
    ctx,
    spot.x,
    spot.y,
    COIN_RADIUS * (1 + FLIP_GROW) * (1 - SUCK_SHRINK * k),
    1,
    turn,
  );
}

// the holes and their coins, in gameCanvas's screen units (w wide, the
// total's middle at totalAtY), each frame
export function drawCoinSpawn(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  totalAtY: number,
  now: number,
): void {
  if (coins.length === 0) return;
  const t = performance.now();
  for (const c of coins) {
    if (c.done) continue;
    if (c.tappedAt === Infinity) drawHovering(ctx, c, t, now);
    else drawFlipped(ctx, c, t, w, totalAtY);
  }
  for (let i = coins.length - 1; i >= 0; i--)
    if (coins[i].done) coins.splice(i, 1);
}
