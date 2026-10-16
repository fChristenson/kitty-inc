// the sweet spot: every so often a big gold coin hangs on the screen with a
// band of gold ringed round it, and a ring of light closes in on it from far
// out, again and again (CONFIG passMs a pass). A tap while the ring is in the
// band is a match: the band flashes, the match pays matchSeconds times its
// round into the total, and the ring starts over from far out with the band
// thinner, the coin bigger and brighter, a note higher. Matching the last
// round swells the coin trembling until it bursts, paying the most; a tap
// outside the band ends it, and so does waiting out durationMs. Draws in
// screen space over the crit flash
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playJackpot, playSimonNote, playSpawnNotice } from "../../sound";
import { drawDetonation } from "../../shared/animationStyles/explosion";
import { COIN_SPIN, drawSpinCoin, loadSpinCoin } from "../../shared/coinFlip";
import { between, clamp01, lerp } from "../../shared/easing";
import { playExplosion } from "../../shared/explosionBang";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import {
  payTotal,
  spawnGameDeps,
  type SpawnGame,
} from "../../shared/spawnGames";
import { stampGlimmer } from "../../shared/twinkle";
import type { Point } from "../../shared/wisp";
import { tapHits } from "../../shared/tapTarget";

const TAU = Math.PI * 2;
// where it hangs, as fractions of the screen; the coin COIN_R of the
// screen's shorter side, the band's middle ZONE coin radii out, HALF of them
// either side of it in the first round, SHRINK times that each round after
const SPOT_X: [number, number] = [0.25, 0.75];
const SPOT_Y: [number, number] = [0.4, 0.75];
const COIN_R = 0.085;
const ZONE = 1.7;
const HALF = 0.85;
const SHRINK = 0.62;
const SHRINK_MS = 200;
const GLOW = 2.6;
// the coin bigger and the glow brighter each round
const ROUND_GROW = 0.12;
const ROUND_GLOW = 0.12;
// the closing ring: from RING_FROM coin radii in to the coin's middle, after
// APPEAR_MS at first and RESTART_MS after each match
const RING_FROM = 4.5;
const RING_WIDTH = 0.12;
const APPEAR_MS = 250;
const RESTART_MS = 180;
const MATCH_SHAKE: [number, number] = [0.25, 0.6];
const MATCH_COINS: [number, number] = [8, 20];
// the last match: the coin swells and trembles, then bursts
const SWELL_MS = 420;
const SWELL = 0.7;
const TREMBLE = 14;
const TREMBLE_RATE = 0.1;
const BURST_SHAKE = 1.3;
const BURST_SIZE = 4.5;
const BURST_COINS: [number, number] = [36, 44];
const FLASH_MS = 260;
const END_MS = 900;

interface Run {
  // as fractions of the screen
  spot: Point;
  startAt: number;
  endAt: number;
  // matches so far, the band's half-width (coin radii) and the one before
  round: number;
  half: number;
  wasHalf: number;
  // when the ring last started over, the last tap and the ring's radius then
  ringFrom: number;
  tappedAt: number;
  tappedR: number;
  // when the last match was, a miss ended it, the last match bursts
  matchAt: number;
  missAt: number;
  burstAt: number;
  burst: boolean;
}

let run: Run | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.sweetSpot, performance.now());
// the screen as last drawn, in gameCanvas's screen units (1 x 1 until the
// first draw, so the spot stays a fraction until drawn)
let width = 1;
let height = 1;
let unit = 1;
const center: Point = { x: 0, y: 0 };

function updateSweetSpot(now: number): void {
  if (run) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) startRun(performance.now());
}

function startRun(now: number): void {
  loadSpinCoin();
  run = {
    spot: { x: between(SPOT_X), y: between(SPOT_Y) },
    startAt: now,
    endAt: now + CONFIG.randomSpawns.sweetSpot.durationMs,
    round: 0,
    half: HALF,
    wasHalf: HALF,
    ringFrom: now + APPEAR_MS,
    tappedAt: -Infinity,
    tappedR: 0,
    matchAt: -Infinity,
    missAt: Infinity,
    burstAt: Infinity,
    burst: false,
  };
  playSpawnNotice();
}

const centerOf = (r: Run): Point => {
  center.x = r.spot.x * width;
  center.y = r.spot.y * height;
  return center;
};

// the closing ring's radius at t, in coin radii
function ringAt(r: Run, t: number): number {
  const ms = t - r.ringFrom;
  if (ms < 0) return RING_FROM;
  const { passMs } = CONFIG.randomSpawns.sweetSpot;
  return RING_FROM * (1 - (ms % passMs) / passMs);
}

// the band's half-width at t, narrowing after a match
const halfAt = (r: Run, t: number) =>
  lerp([r.wasHalf, r.half], clamp01((t - r.matchAt) / SHRINK_MS));

const isOver = (r: Run) => r.missAt !== Infinity || r.burstAt !== Infinity;

function hitsCoin(x: number, y: number, t: number): boolean {
  const r = run;
  if (!r || isOver(r) || isSpawnGone(r.endAt - t)) return false;
  return tapHits(x, y, centerOf(r), COIN_R * unit * (ZONE + HALF));
}

function tap(t: number): void {
  const r = run!;
  const { durationMs, rounds, matchSeconds } = CONFIG.randomSpawns.sweetSpot;
  r.tappedAt = t;
  r.tappedR = ringAt(r, t);
  if (Math.abs(r.tappedR - ZONE) > r.half) {
    r.missAt = t;
    r.endAt = t;
    return;
  }
  r.round++;
  r.matchAt = t;
  playSimonNote(r.round - 1);
  const u = (r.round - 1) / Math.max(1, rounds - 1);
  shakeScreen(lerp(MATCH_SHAKE, u));
  if (r.round >= rounds) {
    r.burstAt = t + SWELL_MS;
    r.endAt = Infinity;
    return;
  }
  const deps = spawnGameDeps();
  const coins = Math.round(lerp(MATCH_COINS, u));
  if (deps)
    payTotal(deps, matchSeconds * r.round, centerOf(r), [coins, coins + 4]);
  r.wasHalf = r.half;
  r.half *= SHRINK;
  r.ringFrom = t + RESTART_MS;
  r.endAt = t + durationMs;
}

function burst(r: Run): void {
  r.burst = true;
  const { matchSeconds, rounds } = CONFIG.randomSpawns.sweetSpot;
  const deps = spawnGameDeps();
  if (deps) payTotal(deps, matchSeconds * rounds, centerOf(r), BURST_COINS);
  shakeScreen(BURST_SHAKE);
  playExplosion();
  playJackpot();
}

function ring(
  ctx: CanvasRenderingContext2D,
  at: Point,
  radius: number,
  lineWidth: number,
  color: string,
  alpha: number,
): void {
  if (radius <= 0 || alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, TAU);
  ctx.stroke();
}

function glimmer(
  ctx: CanvasRenderingContext2D,
  at: Point,
  size: number,
  alpha: number,
  turn: number,
  color: string,
): void {
  if (size <= 0 || alpha <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  stampGlimmer(ctx, at.x, at.y, size, turn, color);
  ctx.globalCompositeOperation = previous;
}

function drawSweetSpot(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  _totalAtY: number,
  now: number,
): void {
  width = w;
  height = h;
  unit = Math.min(w, h);
  const r = run;
  if (!r) return;
  const t = performance.now();
  const msLeft = r.endAt - t;
  const sinceBurst = t - r.burstAt;
  if (isSpawnGone(msLeft) || sinceBurst > END_MS) {
    run = null;
    return;
  }
  if (sinceBurst >= 0 && !r.burst) burst(r);
  const fade = spawnFade(msLeft, CONFIG.randomSpawns.sweetSpot.pulseMs, now);
  const at = centerOf(r);
  const coinR = COIN_R * unit;
  const grow = clamp01((t - r.startAt) / APPEAR_MS);
  const show = fade.alpha * grow;
  const { rounds } = CONFIG.randomSpawns.sweetSpot;
  const sinceMatch = t - r.matchAt;
  const flash = 1 - clamp01(sinceMatch / FLASH_MS);
  ctx.save();
  if (!r.burst) {
    const swell =
      r.burstAt === Infinity ? 0 : clamp01(1 + sinceBurst / SWELL_MS);
    const shiver = swell * TREMBLE * Math.sin(t * TREMBLE_RATE);
    const bigger = 1 + ROUND_GROW * r.round + 0.15 * flash;
    const size =
      coinR * bigger * (1 + SWELL * swell * swell) * fade.scale * grow;
    glimmer(
      ctx,
      at,
      coinR * GLOW * bigger * (1 + swell),
      (0.35 + ROUND_GLOW * r.round + 0.5 * swell) * show,
      now * 0.002,
      COLOR.heavenlyGold,
    );
    drawSpinCoin(
      ctx,
      at.x + shiver,
      at.y,
      size,
      show,
      swell > 0 ? 0 : t * COIN_SPIN * (1 + r.round * 0.5),
    );
    if (swell <= 0) {
      const half = halfAt(r, t) * coinR * fade.scale;
      const zoneR = ZONE * coinR * fade.scale;
      // the pale yellow at the faded end of the badge's light rays
      ring(
        ctx,
        at,
        zoneR,
        2 * half,
        flash > 0 ? COLOR.white : COLOR.wispGlitter,
        show * (0.3 + 0.1 * Math.sin(now * 0.008) + 0.6 * flash),
      );
    }
    const frozen = isOver(r) || sinceMatch < RESTART_MS;
    const ringR = (frozen ? r.tappedR : ringAt(r, t)) * coinR;
    const closing = 1 - ringR / (RING_FROM * coinR);
    const ringAlpha = frozen
      ? 1 - clamp01((t - r.tappedAt) / FLASH_MS)
      : 0.4 + 0.6 * closing;
    ring(ctx, at, ringR, coinR * RING_WIDTH, COLOR.white, show * ringAlpha);
  }
  if (flash > 0)
    glimmer(
      ctx,
      at,
      coinR * ZONE * (1.5 + (2.5 * r.round) / rounds) * (0.5 + 1 - flash),
      flash,
      r.matchAt,
      COLOR.white,
    );
  ctx.restore();
  if (r.burst) drawDetonation(ctx, at, sinceBurst, coinR * BURST_SIZE, now);
}

export default {
  force: () => startRun(performance.now()),
  update: updateSweetSpot,
  drawOver: drawSweetSpot,
  press: (x, y) => {
    const t = performance.now();
    if (!hitsCoin(x, y, t)) return false;
    tap(t);
    return true;
  },
  hitTest: (x, y) => hitsCoin(x, y, performance.now()),
} satisfies SpawnGame;
