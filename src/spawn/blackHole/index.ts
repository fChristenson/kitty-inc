// the black hole: every so often a little nebula drifts on the screen. Held
// down, it collapses into a black hole that sucks in the screen, rumbling
// harder and harder: money streams in, crit numbers are dragged in on an arc
// and wisps keep breaking for it, only to be yanked back. Held for CONFIG
// holdMs, everything is swallowed, the hole shrinks to a point and goes
// supernova: wisps fly out onto every bar in view with levels and the coins
// pour into the total. Let go early and it eases back into a nebula; left
// alone, it blinks and vanishes like every spawn
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import {
  CRIT_TIER_CONFIG,
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
  type CritTier,
} from "../../crits";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../coinBurst";
import type { Floor } from "../../gameState";
import {
  playBlackHoleBubble,
  playBloop,
  playCoinAppear,
  playJackpot,
  playSwoosh,
} from "../../sound";
import { drawBeam } from "../../shared/beam";
import { drawGravityHole } from "../../shared/clutter";
import { clamp01, lerp } from "../../shared/easing";
import { drawDetonation } from "../../shared/explosion";
import { playExplosion } from "../../shared/explosionBang";
import {
  drawStars,
  planDisk,
  scatterArms,
  type Disk,
  type Orbit,
} from "../../shared/galaxy";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../shared/lightBatch";
import { shakeScreen } from "../../shared/screenShake";
import { buzz } from "../../shared/vibration";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import {
  barFloorsInView,
  barOnScreen,
  giveLevels,
  payTotal,
  registerSpawnGame,
  spawnGameDeps,
} from "../../shared/spawnGames";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { tapHits } from "../../shared/tapTarget";
import {
  drawWispHead,
  drawWispTrail,
  WISP_SIZE,
  WISP_TRAIL_MS,
  type Point,
} from "../../shared/wisp";

// the nebula, somewhere in the middle of the screen (shares of its size)
const SPOT_X: [number, number] = [0.25, 0.75];
const SPOT_Y: [number, number] = [0.32, 0.72];
const NEBULA = 130;
const NEBULA_STARS = 48;
const STAR = 26;
const NEBULA_GLOW = 0.35;
const REACH = 120;
// let go, it eases back RELAX times as fast as it charged
const RELAX = 2;
// the hole, growing as it charges
const HOLE: [number, number] = [70, 280];
// the hold rumbles harder and harder: a light shake and a buzz every
// RUMBLE_MS
const RUMBLE_MS = 150;
const RUMBLE: [number, number] = [0.08, 0.3];
const RUMBLE_BUZZ: [number, number] = [6, 30];
// the money: coins all over the screen, each pulled in once the charge
// passes its turn, swirling round as it falls in
const COINS = 80;
const COIN = 30;
const COIN_SPIN = 0.02;
const COIN_PULL = 0.25;
const SWIRL = 2.6;
// crit numbers, dragged in on one arch, flipping once
const NUMBERS = 8;
const NUMBER_FONT = 70;
const NUMBER_STROKE = 12;
const NUMBER_RES = 2;
const NUMBER_PULL = 0.22;
const NUMBER_BOW = 0.3;
const NUMBER_TIERS: CritTier[] = ["crit", "mega", "ultra"];
// wisps like fish fleeing a drain: each swims straight away from the hole,
// wriggling, till it stalls against the suction (SWIM_MS), then struggles
// there the whole hold, swimming harder and harder and slowly losing ground
// (to LOST of the way out), until SUCK_FROM_MS before the end, when the
// hole sucks them all in at once over SUCK_MS and closes
const WISPS = 4;
const WISP = WISP_SIZE * 1.4;
const WISP_STAGGER_MS = 120;
const SWIM_MS = 450;
const ESCAPE_FROM = 50;
const ESCAPE = 480;
const LOST = 0.65;
const SUCK_FROM_MS = 500;
const SUCK_MS = 220;
// the swimming: a wriggle side to side, wider and quicker as it tires, and
// surges forward
const WRIGGLE: [number, number] = [10, 34];
const WRIGGLE_RATE: [number, number] = [0.025, 0.06];
const SURGE = 18;
const SURGE_RATE = 0.02;
const SUCK_SHAKE = 1.2;
const SUCK_BUZZ = 40;
// the bubbling while it's held, quicker as it charges
const BUBBLE_MS: [number, number] = [260, 70];
// the pull: streaks of light racing into it
const STREAKS = 14;
const STREAK_REACH = 700;
const STREAK_LEN = 140;
const STREAK_SPEED = 1.2;
const STREAK_WIDTH = 10;
// the end: the hole shrinks to a point, then the supernova
const COLLAPSE_MS = 220;
const NOVA = 300;
const NOVA_RING = 8;
const NOVA_RING_R = 220;
const NOVA_RING_MS = 45;
const NOVA_RING_BLAST = 110;
const NOVA_FLASH_MS = 400;
const NOVA_FLASH = 0.6;
const NOVA_GLOW = 600;
const NOVA_SHAKE = 3;
const OUT_MS = 340;
const OUT_STAGGER_MS = 60;
const OUT_BLAST = 90;
const END_MS = 1500;
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white);

interface Coin {
  x: number;
  y: number;
  turn: number;
}
interface Pulled {
  x: number;
  y: number;
  turn: number;
  tier: CritTier;
}
interface Hole {
  bornAt: number;
  center: Point;
  disk: Disk;
  stars: Orbit[];
  coins: Coin[];
  numbers: Pulled[];
  wisps: { phase: number; offset: number }[];
  // the charge: held (or let go) since segAt (ms after bornAt) from segCharge
  holding: boolean;
  segAt: number;
  segCharge: number;
  // ms after bornAt the hold began from nothing: the wisps swim from it
  heldAt: number;
  // the hole has sucked its wisps in
  sucked: boolean;
  // ms after bornAt of the hold's last rumble and bubble
  rumbledAt: number;
  bubbledAt: number;
  // ms after bornAt it went supernova, and the floors its wisps fly onto
  novaAt: number;
  burst: boolean;
  targets: Floor[];
  landed: number;
}

let hole: Hole | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.blackHole, performance.now());
const sprite: CoinBurstSprite = { kind: "coin", spinFrame: 0, axisAngle: 0 };
const numberSprites = new Map<CritTier, CritTextSprite>();
const spot: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const wispSpot: Point = { x: 0, y: 0 };
let drawnW = 0;
let drawnH = 0;
// started before the screen's size was known: starts on the next frame
let startPending = false;

function numberSprite(tier: CritTier): CritTextSprite {
  let s = numberSprites.get(tier);
  if (!s) {
    const { label, color } = CRIT_TIER_CONFIG[tier];
    s = createCritTextSprite(
      label,
      color,
      { fontSize: NUMBER_FONT, strokeWidth: NUMBER_STROKE },
      NUMBER_RES,
    );
    numberSprites.set(tier, s);
  }
  return s;
}

function start(now: number): void {
  const w = drawnW;
  const h = drawnH;
  if (w <= 0 || h <= 0) {
    startPending = true;
    return;
  }
  if (!spawnGameDeps()) return;
  const center = {
    x: w * lerp(SPOT_X, Math.random()),
    y: h * lerp(SPOT_Y, Math.random()),
  };
  const disk = planDisk(center, {
    inner: NEBULA * 0.15,
    outer: NEBULA,
    squash: 0.55,
    tilt: (Math.random() - 0.5) * 0.8,
    rimHz: 0.25,
  });
  for (const tier of NUMBER_TIERS) numberSprite(tier);
  hole = {
    bornAt: now,
    center,
    disk,
    stars: scatterArms(disk, NEBULA_STARS, 2, 0.7),
    coins: Array.from({ length: COINS }, (_, i) => ({
      x: Math.random() * w,
      y: h * (0.12 + 0.86 * Math.random()),
      turn: (i / COINS) * (1 - COIN_PULL),
    })),
    numbers: Array.from({ length: NUMBERS }, (_, i) => ({
      x: w * (0.1 + 0.8 * Math.random()),
      y: h * (0.15 + 0.8 * Math.random()),
      turn: 0.05 + (i / NUMBERS) * (0.95 - NUMBER_PULL),
      tier: NUMBER_TIERS[i % NUMBER_TIERS.length],
    })),
    wisps: Array.from({ length: WISPS }, (_, i) => ({
      phase: (i / WISPS) * Math.PI * 2 + Math.random() * 0.8,
      offset: i * WISP_STAGGER_MS,
    })),
    holding: false,
    segAt: 0,
    segCharge: 0,
    heldAt: 0,
    sucked: false,
    rumbledAt: 0,
    bubbledAt: 0,
    novaAt: -1,
    burst: false,
    targets: [],
    landed: 0,
  };
  playCoinAppear();
}

// drifts a nebula in (test button)
export function forceBlackHoleSpawn(): void {
  start(performance.now());
}

// the charge (0..1) at ms after it appeared
function chargeAt(b: Hole, ms: number): number {
  const { holdMs } = CONFIG.randomSpawns.blackHole;
  const t = (ms - b.segAt) / holdMs;
  return b.holding
    ? clamp01(b.segCharge + t)
    : clamp01(b.segCharge - t * RELAX);
}

function setHolding(b: Hole, holding: boolean, now: number): void {
  const ms = now - b.bornAt;
  b.segCharge = chargeAt(b, ms);
  b.segAt = ms;
  b.holding = holding;
}

function hitTest(x: number, y: number, now: number): boolean {
  const b = hole;
  if (!b || b.novaAt >= 0) return false;
  const ms = now - b.bornAt;
  if (chargeAt(b, ms) <= 0 && ms >= CONFIG.randomSpawns.blackHole.durationMs)
    return false;
  return tapHits(x, y, b.center, REACH);
}

function press(x: number, y: number, now: number): boolean {
  const b = hole;
  if (!b || !hitTest(x, y, now)) return false;
  if (chargeAt(b, now - b.bornAt) <= 0) b.heldAt = now - b.bornAt;
  setHolding(b, true, now);
  playSwoosh();
  return true;
}

function release(now: number): void {
  const b = hole;
  if (!b || b.novaAt >= 0 || !b.holding) return;
  setHolding(b, false, now);
}

function update(now: number): void {
  if (hole) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) start(now);
}

// how far into the hole's final suck (0..1) the charge is
function suckAt(c: number): number {
  const { holdMs } = CONFIG.randomSpawns.blackHole;
  return clamp01((c - 1 + SUCK_FROM_MS / holdMs) / (SUCK_MS / holdMs));
}
// the suck this frame: the wisps' trails are pulled in with their heads
let suckNow = 0;
// the ms being drawn: a trail's older sparkles drain into the hole
let drawMs = -1;

// a wisp's spot at ms: swimming out along its heading, then stalled and
// struggling, slowly losing ground, till the hole sucks it in; null once
// swallowed
const wispPaths = Array.from({ length: WISPS }, (_, i) => (ms: number) => {
  const b = hole;
  if (!b || b.novaAt >= 0) return null;
  const c = chargeAt(b, ms);
  if (c <= 0) return null;
  const w = b.wisps[i];
  const swum = (ms - b.heldAt - w.offset) / SWIM_MS;
  if (swum < 0) return null;
  const suck = Math.max(suckAt(c), suckNow);
  if (suck >= 1) return null;
  const p = Math.min(1, swum);
  // how far out (0..1) and how tired (0..1)
  const tired = Math.min(
    1,
    c / (1 - SUCK_FROM_MS / CONFIG.randomSpawns.blackHole.holdMs),
  );
  const out = (1 - (1 - p) * (1 - p)) * (1 - (1 - LOST) * tired * tired);
  const surge = SURGE * p * Math.sin(ms * SURGE_RATE + w.phase);
  const drain = drawMs < 0 ? 0 : clamp01((drawMs - ms) / WISP_TRAIL_MS);
  const r =
    (ESCAPE_FROM + (ESCAPE - ESCAPE_FROM) * out + surge) *
    (1 - suck * suck * suck) *
    (1 - drain);
  const side =
    lerp(WRIGGLE, tired) *
    Math.min(1, swum * 2) *
    (1 - suck) *
    (1 - drain) *
    Math.sin(ms * lerp(WRIGGLE_RATE, tired) + w.phase * 3);
  const cos = Math.cos(w.phase);
  const sin = Math.sin(w.phase);
  wispSpot.x = b.center.x + cos * r - sin * side;
  wispSpot.y = b.center.y + sin * r + cos * side;
  return wispSpot;
});

// the hold's rumble and bubbling, and a jolt as the hole sucks its wisps in
function rumble(b: Hole, c: number, ms: number): void {
  if (!b.holding || c <= 0) return;
  if (ms - b.rumbledAt >= RUMBLE_MS) {
    b.rumbledAt = ms;
    shakeScreen(lerp(RUMBLE, c));
    buzz(lerp(RUMBLE_BUZZ, c));
  }
  if (ms - b.bubbledAt >= lerp(BUBBLE_MS, c)) {
    b.bubbledAt = ms;
    playBlackHoleBubble(c);
  }
  if (!b.sucked && suckAt(c) > 0) {
    b.sucked = true;
    shakeScreen(SUCK_SHAKE);
    buzz(SUCK_BUZZ);
    playSwoosh();
  }
}

// a supernova wisp's spot at ms, flying from the centre onto its bar (where
// it is this frame, set by draw)
const targetSpots: Point[] = [];
const outPaths = Array.from({ length: 8 }, (_, i) => (ms: number) => {
  const b = hole;
  if (!b || b.novaAt < 0 || i >= b.targets.length) return null;
  const t = (ms - b.novaAt - i * OUT_STAGGER_MS) / OUT_MS;
  if (t < 0 || t > 1) return null;
  const target = targetSpots[i];
  const u = t * t * (3 - 2 * t);
  wispSpot.x = lerp([b.center.x, target.x], u);
  wispSpot.y = lerp([b.center.y, target.y], u) - Math.sin(Math.PI * u) * 160;
  return wispSpot;
});

function goNova(b: Hole): void {
  b.burst = true;
  const deps = spawnGameDeps();
  if (deps) {
    b.targets = barFloorsInView(deps).slice(0, outPaths.length);
    payTotal(deps, CONFIG.randomSpawns.blackHole.rewardSeconds, b.center);
  }
  shakeScreen(NOVA_SHAKE);
  playExplosion();
  playJackpot();
}

function landWisps(b: Hole, ms: number): void {
  const deps = spawnGameDeps();
  while (
    b.landed < b.targets.length &&
    ms >= b.novaAt + b.landed * OUT_STAGGER_MS + OUT_MS
  ) {
    if (deps)
      giveLevels(
        deps,
        b.targets[b.landed],
        CONFIG.randomSpawns.blackHole.levels,
        COLOR.heavenlyGold,
      );
    playBloop();
    b.landed++;
  }
}

function drawPulled(
  ctx: CanvasRenderingContext2D,
  b: Hole,
  c: number,
  ms: number,
): void {
  const { x: cx, y: cy } = b.center;
  // the money
  const base = ctx.getTransform();
  beginCoinBatch(ctx);
  for (let i = 0; i < b.coins.length; i++) {
    const coin = b.coins[i];
    const p = clamp01((c - coin.turn) / COIN_PULL);
    if (p <= 0 || p >= 1) continue;
    const q = p * p;
    const a = SWIRL * q;
    const dx = coin.x - cx;
    const dy = coin.y - cy;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    sprite.spinFrame = ms * COIN_SPIN + i;
    drawCoinBurstFrame(
      ctx,
      sprite,
      cx + (dx * cos - dy * sin) * (1 - q),
      cy + (dx * sin + dy * cos) * (1 - q),
      COIN * Math.min(1, p * 6),
      base,
    );
  }
  endCoinBatch(ctx);
  // the crit numbers
  for (let i = 0; i < b.numbers.length; i++) {
    const n = b.numbers[i];
    const p = clamp01((c - n.turn) / NUMBER_PULL);
    if (c <= 0 || c < n.turn - 0.1 || p >= 1) continue;
    const show = clamp01((c - n.turn + 0.1) / 0.1);
    const u = p * p;
    const mx = (n.x + cx) / 2 - (cy - n.y) * NUMBER_BOW;
    const my = (n.y + cy) / 2 + (cx - n.x) * NUMBER_BOW;
    const x = (1 - u) ** 2 * n.x + 2 * (1 - u) * u * mx + u * u * cx;
    const y = (1 - u) ** 2 * n.y + 2 * (1 - u) * u * my + u * u * cy;
    ctx.save();
    ctx.globalAlpha = show * (p > 0.85 ? (1 - p) / 0.15 : 1);
    ctx.translate(x, y);
    ctx.scale(Math.max(0.06, Math.abs(Math.cos(Math.PI * p))), 1);
    drawCritTextSprite(ctx, numberSprite(n.tier), 0, 0, 1);
    ctx.restore();
  }
}

// wisps' trails in one light batch, then their heads; skipped outside
// fromMs..toMs and its trails' fade (a head past its path returns null)
function drawWisps(
  ctx: CanvasRenderingContext2D,
  paths: ((ms: number) => Point | null)[],
  ms: number,
  now: number,
  fromMs: number,
  toMs: number,
  size = WISP_SIZE,
): void {
  if (ms < fromMs || ms > toMs + WISP_TRAIL_MS + OUT_STAGGER_MS * paths.length)
    return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 0; i < paths.length; i++)
    drawWispTrail(ctx, paths[i], ms, now, size);
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
  for (let i = 0; i < paths.length; i++)
    drawWispHead(ctx, paths[i], ms, now, size, 1);
}

function drawStreaks(
  ctx: CanvasRenderingContext2D,
  b: Hole,
  c: number,
  ms: number,
): void {
  if (c <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 0; i < STREAKS; i++) {
    const a = (i / STREAKS) * Math.PI * 2 + i * 0.37;
    const d =
      STREAK_REACH -
      ((ms * STREAK_SPEED + i * 211) % STREAK_REACH) * (0.6 + 0.4 * c);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    from.x = b.center.x + cos * d;
    from.y = b.center.y + sin * d;
    to.x = b.center.x + cos * Math.max(0, d - STREAK_LEN);
    to.y = b.center.y + sin * Math.max(0, d - STREAK_LEN);
    drawBeam(ctx, from, to, STREAK_WIDTH, 0.55 * c * Math.min(1, d / 200));
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  _totalAtY: number,
  now: number,
): void {
  drawnW = w;
  drawnH = h;
  if (startPending) {
    startPending = false;
    start(now);
  }
  const b = hole;
  if (!b) return;
  const ms = now - b.bornAt;
  const { durationMs, pulseMs, holdMs } = CONFIG.randomSpawns.blackHole;

  if (b.novaAt < 0) {
    const c = chargeAt(b, ms);
    if (b.holding && c >= 1) {
      b.novaAt = b.segAt + (1 - b.segCharge) * holdMs + COLLAPSE_MS;
    } else {
      // left alone, the nebula blinks and goes
      const idle = !b.holding && c <= 0;
      const msLeft = idle ? durationMs - ms : 1;
      if (idle && isSpawnGone(msLeft)) {
        hole = null;
        return;
      }
      const fade = spawnFade(msLeft, pulseMs, now);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = NEBULA_GLOW * fade.alpha * (1 - c);
      drawGlow(ctx, GOLD, b.center.x, b.center.y, NEBULA * 1.6 * fade.scale);
      ctx.restore();
      drawStars(
        ctx,
        b.disk,
        b.stars,
        ms * (1 + 4 * c),
        STAR * fade.scale,
        fade.scale * (1 - 0.85 * c),
        fade.alpha,
      );
      drawStreaks(ctx, b, c, ms);
      drawPulled(ctx, b, c, ms);
      if (c > 0) {
        rumble(b, c, ms);
        ctx.save();
        drawGravityHole(
          ctx,
          b.center,
          lerp(HOLE, c),
          Math.min(1, c * 4),
          ms,
          now,
        );
        ctx.restore();
      }
      suckNow = suckAt(c);
      drawMs = ms;
      drawWisps(ctx, wispPaths, ms, now, -Infinity, Infinity, WISP);
      suckNow = 0;
      drawMs = -1;
      return;
    }
  }

  // swallowed: the hole shrinks to a point, then goes off
  const since = ms - b.novaAt;
  if (since >= END_MS) {
    hole = null;
    return;
  }
  if (since >= 0 && !b.burst) goNova(b);
  if (since < 0) {
    ctx.save();
    drawGravityHole(
      ctx,
      b.center,
      HOLE[1] * clamp01(-since / COLLAPSE_MS),
      1,
      ms,
      now,
    );
    ctx.restore();
  } else {
    const flash = NOVA_FLASH * (1 - since / NOVA_FLASH_MS);
    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = flash;
      drawGlow(ctx, WHITE, b.center.x, b.center.y, NOVA_GLOW);
      ctx.restore();
    }
  }
  drawDetonation(ctx, b.center, since, NOVA, now);
  for (let k = 0; k < NOVA_RING; k++) {
    const a = (k / NOVA_RING) * Math.PI * 2;
    spot.x = b.center.x + Math.cos(a) * NOVA_RING_R;
    spot.y = b.center.y + Math.sin(a) * NOVA_RING_R;
    drawDetonation(
      ctx,
      spot,
      since - (k + 1) * NOVA_RING_MS,
      NOVA_RING_BLAST,
      now,
    );
  }
  landWisps(b, ms);
  const deps = spawnGameDeps();
  for (let i = 0; i < b.targets.length; i++) {
    targetSpots[i] ??= { x: 0, y: 0 };
    if (deps) barOnScreen(deps, b.targets[i], targetSpots[i]);
  }
  drawWisps(ctx, outPaths, ms, now, b.novaAt, b.novaAt + OUT_MS);
  for (let i = 0; i < b.targets.length; i++) {
    const at = b.novaAt + i * OUT_STAGGER_MS;
    drawDetonation(ctx, targetSpots[i], ms - at - OUT_MS, OUT_BLAST, now);
  }
}

registerSpawnGame({ update, draw, press, release, hitTest });
