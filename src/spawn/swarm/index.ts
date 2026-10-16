// the swarm: every so often a cluster of small wisps flies in from the side
// as one mass and settles somewhere on the screen, drifting slowly round its
// middle. A tap on it scatters it in a burst, then it
// snaps back together at another spot; after CONFIG's taps it scatters one
// last time and every member rushes into the total, each paying its share
// of the reward as it lands. Left alone it blinks out after durationMs at
// each spot. Draws in screen space over the crit flash
import { CONFIG } from "../../config";
import {
  playBubblePop,
  playPayout,
  playSpawnNotice,
  playSold,
  playSwoosh,
} from "../../sound";
import { getActiveCompanyIndex } from "../../company";
import {
  addTotalIncome,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import { multiply, type BigNumber } from "../../shared/bigNumber";
import { between, clamp01, easeOutCubic, lerp } from "../../shared/easing";
import { beginLightBatch, endLightBatch } from "../../shared/lightBatch";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import type { SpawnGame } from "../../shared/spawnGames";
import { hash01, stampGlimmer } from "../../shared/twinkle";
import { COLOR } from "../../palette";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { tapHits } from "../../shared/tapTarget";

const TAU = Math.PI * 2;
// the flock: COUNT small wisps (SIZE of a wisp's size, give or take) in a
// disk CLUSTER_R of the screen's shorter side, SQUASH as tall as wide
const COUNT = 14;
const CLUSTER_R = 0.08;
const SQUASH = 0.8;
const SIZE: [number, number] = [0.4, 0.6];
// drifting round its middle (rad/ms), breathing in and out, bobbing
const WHEEL: [number, number] = [0.0006, 0.0012];
const BREATHE = 0.12;
const BREATHE_RATE = 0.0015;
const BOB = 0.12;
const BOB_RATE = 0.002;
// flying in from off the side, the back of the flock LAG_MS behind
const ENTER_MS = 420;
const LAG_MS = 140;
// where it settles, as fractions of the screen, at least HOP_FAR of the
// shorter side from where it was
const SPOT_X: [number, number] = [0.18, 0.82];
const SPOT_Y: [number, number] = [0.32, 0.82];
const HOP_FAR = 0.35;
const SPOT_TRIES = 12;
// a tap: each member bursts out SCATTER_REACH of the shorter side over
// SCATTER_MS (staggered over STAGGER_MS), then snaps to the new spot
const SCATTER_MS = 180;
const SCATTER_REACH: [number, number] = [0.12, 0.3];
const STAGGER_MS = 90;
const GATHER_MS = 280;
const SCATTER_SHAKE = 0.35;
// the last tap: a wider burst, then each member streaks into the total
const RUSH_REACH: [number, number] = [0.16, 0.42];
const RUSH_DELAY_MS = 260;
const RUSH_MS: [number, number] = [260, 380];
const RUSH_BOW = 0.15;
const CLEAR_SHAKE = 0.9;
// a flash where it scatters and where it gathers
const FLASH_MS = 220;
const SCATTER_FLASH = 2.2;
const GATHER_FLASH = 1.4;
const GATHER_SHAKE = 0.2;

const ENTER = 0;
const HOP = 1;
const RUSH = 2;

interface Hop {
  kind: number;
  at: number;
  // spots as fractions of the screen
  from: Point;
  to: Point;
  // per member: its burst out (of the screen's shorter side), and how late
  // it starts
  sx: Float32Array;
  sy: Float32Array;
  delay: Float32Array;
}

interface Flash {
  x: number;
  y: number;
  at: number;
  size: number;
  shake: number;
  fired: boolean;
}

interface Run {
  hops: Hop[];
  flashes: Flash[];
  // when it's settled at its current spot, and when it runs out there
  settleAt: number;
  endAt: number;
  taps: number;
  // the rush: when each wisp lands, which have paid, and the last landing
  landAt: Float32Array;
  paid: Uint8Array;
  left: number;
  lastLandAt: number;
  share: BigNumber;
  // when its next flight (a gather or the rush) sets off, for its swoosh
  swooshAt: number;
}

// each member's place in the flock, fixed for every swarm
const angle = new Float32Array(COUNT);
const reach = new Float32Array(COUNT);
const wheel = new Float32Array(COUNT);
const phase = new Float32Array(COUNT);
const lag = new Float32Array(COUNT);
const size = new Float32Array(COUNT);
const rushDelay = new Float32Array(COUNT);
const rushMs = new Float32Array(COUNT);
for (let i = 0; i < COUNT; i++) {
  angle[i] = (i / COUNT) * TAU + hash01(i, 801) * 0.4;
  reach[i] = 0.3 + 0.7 * Math.sqrt(hash01(i, 802));
  wheel[i] = lerp(WHEEL, hash01(i, 803));
  phase[i] = hash01(i, 804) * TAU;
  lag[i] = hash01(i, 805);
  size[i] = lerp(SIZE, hash01(i, 806)) * WISP_SIZE;
  rushDelay[i] = hash01(i, 807) * RUSH_DELAY_MS;
  rushMs[i] = lerp(RUSH_MS, hash01(i, 808));
}

let run: Run | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.swarm, performance.now());
// the screen as last drawn, in gameCanvas's screen units (1 x 1 until the
// first draw, so spots stay fractions until drawn)
let width = 1;
let height = 1;
let unit = 1;
let totalY = 0;
const spot: Point = { x: 0, y: 0 };
const middle: Point = { x: 0, y: 0 };
const wispAt = Array.from(
  { length: COUNT },
  (_, i) => (ms: number) => (run ? memberAt(run, i, ms, spot) : null),
);

function updateSwarmSpawn(now: number): void {
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

function pickSpot(from: Point): Point {
  let best: Point = { x: 0.5, y: 0.5 };
  let bestFar = -1;
  for (let k = 0; k < SPOT_TRIES; k++) {
    const x = between(SPOT_X);
    const y = between(SPOT_Y);
    const far = Math.hypot((x - from.x) * width, (y - from.y) * height);
    if (far >= HOP_FAR * unit) return { x, y };
    if (far > bestFar) {
      bestFar = far;
      best = { x, y };
    }
  }
  return best;
}

function makeHop(kind: number, at: number, from: Point, to: Point): Hop {
  const sx = new Float32Array(COUNT);
  const sy = new Float32Array(COUNT);
  const delay = new Float32Array(COUNT);
  if (kind !== ENTER) {
    const range = kind === RUSH ? RUSH_REACH : SCATTER_REACH;
    for (let i = 0; i < COUNT; i++) {
      const a = ((i + Math.random() * 0.6) / COUNT) * TAU;
      const d = between(range);
      sx[i] = Math.cos(a) * d;
      sy[i] = Math.sin(a) * d;
      delay[i] = Math.random() * STAGGER_MS;
    }
  }
  return { kind, at, from, to, sx, sy, delay };
}

function startRun(now: number): void {
  const { durationMs, rewardSeconds } = CONFIG.randomSpawns.swarm;
  const fromLeft = Math.random() < 0.5;
  const from = { x: fromLeft ? -0.15 : 1.15, y: between([0.3, 0.7]) };
  const to = pickSpot(from);
  const settleAt = now + ENTER_MS + LAG_MS;
  const rate = getCompanyIncomeRatePerSecond(getActiveCompanyIndex());
  run = {
    hops: [makeHop(ENTER, now, from, to)],
    flashes: [],
    settleAt,
    endAt: settleAt + durationMs,
    taps: 0,
    landAt: new Float32Array(COUNT).fill(Infinity),
    paid: new Uint8Array(COUNT),
    left: COUNT,
    lastLandAt: Infinity,
    swooshAt: Infinity,
    share: multiply(rate, rewardSeconds / COUNT),
  };
  playSpawnNotice();
  playSwoosh();
}

// the flock's middle at t on spot `to` (a fraction of the screen), bobbing
function middleAt(to: Point, t: number, into: Point): Point {
  into.x = to.x * width;
  into.y = to.y * height + Math.sin(t * BOB_RATE) * BOB * CLUSTER_R * unit;
  return into;
}

// member i at t, written into `into`; null before it flies in or once it
// has landed in the total
function memberAt(r: Run, i: number, t: number, into: Point): Point | null {
  let h = r.hops.length - 1;
  while (h > 0 && r.hops[h].at > t) h--;
  const hop = r.hops[h];
  if (t < hop.at) return null;
  const s = t - hop.at;
  const radius = CLUSTER_R * unit;
  const a = angle[i] + t * wheel[i];
  const d =
    reach[i] * radius * (1 + BREATHE * Math.sin(t * BREATHE_RATE + phase[i]));
  const ox = Math.cos(a) * d;
  const oy = Math.sin(a) * d * SQUASH;
  if (hop.kind === ENTER) {
    const e = easeOutCubic(clamp01((s - lag[i] * LAG_MS) / ENTER_MS));
    const fx = hop.from.x * width;
    const fy = hop.from.y * height;
    middleAt(hop.to, t, middle);
    into.x = fx + (middle.x - fx) * e + ox;
    into.y = fy + (middle.y - fy) * e + oy;
    return into;
  }
  middleAt(hop.from, t, middle);
  const k = s - hop.delay[i];
  const out = easeOutCubic(clamp01(k / SCATTER_MS)) * unit;
  const px = middle.x + ox + hop.sx[i] * out;
  const py = middle.y + oy + hop.sy[i] * out;
  if (k < SCATTER_MS) {
    into.x = px;
    into.y = py;
    return into;
  }
  if (hop.kind === HOP) {
    const g = clamp01((k - SCATTER_MS) / GATHER_MS);
    const e = g * g * (3 - 2 * g);
    middleAt(hop.to, t, middle);
    into.x = px + (middle.x + ox - px) * e;
    into.y = py + (middle.y + oy - py) * e;
    return into;
  }
  const f = (k - SCATTER_MS - rushDelay[i]) / rushMs[i];
  if (f < 0) {
    into.x = px;
    into.y = py;
    return into;
  }
  if (f >= 1) return null;
  const dx = width / 2 - px;
  const dy = totalY - py;
  const e = f * f;
  const bow = RUSH_BOW * Math.sin(Math.PI * f) * (i % 2 ? 1 : -1);
  into.x = px + dx * e - dy * bow;
  into.y = py + dy * e + dx * bow;
  return into;
}

function addFlash(
  r: Run,
  at: Point,
  t: number,
  scale: number,
  shake: number,
): void {
  r.flashes.push({
    x: at.x,
    y: at.y,
    at: t,
    size: scale * CLUSTER_R * unit,
    shake,
    fired: false,
  });
}

// whether (x, y) lands on the settled flock
function hitsSwarm(x: number, y: number, t: number): boolean {
  const r = run;
  if (!r || t < r.settleAt || isSpawnGone(r.endAt - t)) return false;
  const hop = r.hops[r.hops.length - 1];
  if (hop.kind === RUSH) return false;
  middleAt(hop.to, t, middle);
  return tapHits(x, y, middle, CLUSTER_R * unit * 1.3);
}

function tapSwarm(t: number): void {
  const r = run!;
  const { durationMs, taps } = CONFIG.randomSpawns.swarm;
  const from = r.hops[r.hops.length - 1].to;
  r.taps++;
  middleAt(from, t, spot);
  addFlash(r, spot, t, SCATTER_FLASH, SCATTER_SHAKE);
  playBubblePop();
  r.swooshAt = t + SCATTER_MS;
  if (r.hops.length > 2) r.hops.shift();
  if (r.taps >= taps) {
    const hop = makeHop(RUSH, t, from, from);
    r.hops.push(hop);
    let last = 0;
    for (let i = 0; i < COUNT; i++) {
      r.landAt[i] = t + hop.delay[i] + SCATTER_MS + rushDelay[i] + rushMs[i];
      last = Math.max(last, r.landAt[i]);
    }
    r.lastLandAt = last;
    r.settleAt = Infinity;
    r.endAt = Infinity;
    return;
  }
  const to = pickSpot(from);
  r.hops.push(makeHop(HOP, t, from, to));
  r.settleAt = t + STAGGER_MS + SCATTER_MS + GATHER_MS;
  r.endAt = r.settleAt + durationMs;
  middleAt(to, r.settleAt, middle);
  addFlash(r, middle, r.settleAt, GATHER_FLASH, GATHER_SHAKE);
}

function pay(r: Run, i: number): void {
  r.paid[i] = 1;
  r.left--;
  addTotalIncome(r.share);
  pulseHudTotalFlash();
  playSold();
  if (r.left === 0) {
    shakeScreen(CLEAR_SHAKE);
    playPayout();
  }
}

function drawSwarmSpawn(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  totalAtY: number,
  now: number,
): void {
  width = w;
  height = h;
  unit = Math.min(w, h);
  totalY = totalAtY;
  const r = run;
  if (!r) return;
  const t = performance.now();
  const msLeft = r.endAt - t;
  if (isSpawnGone(msLeft) || t > r.lastLandAt + 1_200) {
    run = null;
    return;
  }
  const fade = spawnFade(msLeft, CONFIG.randomSpawns.swarm.pulseMs, now);
  if (t >= r.swooshAt) {
    r.swooshAt = Infinity;
    playSwoosh();
  }
  for (let i = 0; i < COUNT; i++) {
    if (r.paid[i]) continue;
    if (t >= r.landAt[i]) pay(r, i);
  }
  for (let i = 0; i < COUNT; i++)
    drawWisp(ctx, wispAt[i], t, now, size[i] * fade.scale, 0.3, fade.alpha);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let n = 0; n < r.flashes.length; n++) {
    const flash = r.flashes[n];
    const since = t - flash.at;
    if (since < 0 || since > FLASH_MS) continue;
    if (!flash.fired) {
      flash.fired = true;
      shakeScreen(flash.shake);
    }
    const p = since / FLASH_MS;
    ctx.globalAlpha = 1 - p;
    stampGlimmer(
      ctx,
      flash.x,
      flash.y,
      flash.size * (0.5 + p),
      flash.at,
      COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

export default {
  force: () => startRun(performance.now()),
  update: updateSwarmSpawn,
  drawOver: drawSwarmSpawn,
  press: (x, y) => {
    const t = performance.now();
    if (!hitsSwarm(x, y, t)) return false;
    tapSwarm(t);
    return true;
  },
  hitTest: (x, y) => hitsSwarm(x, y, performance.now()),
} satisfies SpawnGame;
