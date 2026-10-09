// the tosses: every so often, like the mouse and the bubbles, a warning sign
// flashes at the bottom of the screen, then prizes get tossed up from below
// one after another like fruit: crit numbers, gold coins and badges, each
// spinning up and falling back off the screen. A tap catches one in the air
// and pays it like a popped bubble (see shared/spawnPrize).
//
// gameCanvas wires the floor actions in (wireTosses), ticks the spawn timer
// (updateTosses), catches on presses (catchTossAt) and draws them in screen
// space over the HUD (drawTosses)
import { CONFIG } from "../config";
import { createCritTextSprite, drawCritTextSprite } from "../crits";
import type { FloorActionsDeps } from "../floors";
import type { Floor } from "../gameState";
import { COLOR } from "../palette";
import { playBloop, playBubblePop, playSwoosh } from "../sound";
import { randomInt } from "../utils";
import { between, easeOutBack, progress } from "../shared/easing";
import { drawWhiteBurst } from "../shared/eventFx";
import { isScreenFrozen } from "../shared/screenFreeze";
import { shakeScreen } from "../shared/screenShake";
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
import { drawWispTrail, type Point } from "../shared/wisp";

const SIZE = 170;
// tapping counts this far round a prize, for thumbs
const HIT_REACH = 0.8;
// where tosses start (below the bottom edge) and how high they go, of the
// screen's height, and where across they start, of its width
const START_BELOW = 0.6; // of SIZE
const APEX_Y: [number, number] = [0.15, 0.45];
const START_X: [number, number] = [0.15, 0.85];
// share of the way to the middle it drifts over its flight
const DRIFT: [number, number] = [0.15, 0.6];
// turns a second
const SPIN: [number, number] = [-1.2, 1.2];
const TRAIL_SIZE = 26;
const CATCH_MS = 250;
const CATCH_BURST = 0.25;
const CATCH_SHAKE = 0.35;
// the warning sign: its size, how far up from the bottom, its pulse
const SIGN_SIZE = 90;
const SIGN_UP = 150;
const SIGN_IN_MS = 220;
const SIGN_OUT_MS = 200;
const SIGN_PULSE_MS = 260;
const SIGN_STROKE = 8;

interface Toss {
  prize: Prize;
  floor: Floor;
  // performance.now() it leaves the bottom, and its flight's length
  launchAt: number;
  flightMs: number;
  // start across, apex up and drift, as shares of the screen; spin in turns a second
  fx: number;
  fApex: number;
  drift: number;
  spin: number;
  launched: boolean;
  caughtAt: number;
  from: Point;
  payout: Payout | null;
  // where it is at a moment, null outside its flight (for its trail)
  path: (at: number) => Point | null;
}

interface Warning {
  at: number;
  until: number;
  shown: boolean;
}

let getDeps: (() => FloorActionsDeps) | null = null;
const tosses: Toss[] = [];
const warnings: Warning[] = [];
let nextSpawnAt = performance.now() + gapMs();
// the screen as last drawn, in gameCanvas's screen units
let width = 1;
let height = 1;
const spot: Point = { x: 0, y: 0 };
let bang: ReturnType<typeof createCritTextSprite> | null = null;

function gapMs(): number {
  return randomInt(...CONFIG.randomSpawns.tosses.spawnGapMs);
}

// the floor actions of the building on screen
export function wireTosses(deps: () => FloorActionsDeps): void {
  getDeps = deps;
}

// once its random wait is up and the last tosses are gone, warns and tosses
// a few more, like the mouse
export function updateTosses(now: number): void {
  if (tosses.length > 0 || warnings.length > 0) return;
  if (now < nextSpawnAt || isScreenFrozen() || !getDeps) return;
  const floor = pickSpawnFloor(getDeps());
  if (!floor) return;
  const endsAt = spawnTosses(floor, now);
  nextSpawnAt = endsAt + gapMs();
}

// warns and tosses a few at once, alongside any already flying (test button)
export function forceTosses(): void {
  const floor = getDeps && pickSpawnFloor(getDeps());
  if (floor) spawnTosses(floor, performance.now());
}

// the warning and its tosses from now; when the last one has fallen
function spawnTosses(floor: Floor, now: number): number {
  const { warningMs, count, tossGapMs, flightMs, contentOdds } =
    CONFIG.randomSpawns.tosses;
  warnings.push({ at: now, until: now + warningMs, shown: false });
  let launchAt = now + warningMs;
  let endsAt = launchAt;
  const n = randomInt(...count);
  for (let i = 0; i < n; i++) {
    const prize = rollPrize(contentOdds);
    prepareMini(prize);
    const toss: Toss = {
      prize,
      floor,
      launchAt,
      flightMs: between([...flightMs]),
      fx: between(START_X),
      fApex: between(APEX_Y),
      drift: between(DRIFT),
      spin: between(SPIN),
      launched: false,
      caughtAt: Infinity,
      from: { x: 0, y: 0 },
      payout: null,
      path: () => null,
    };
    const at: Point = { x: 0, y: 0 };
    toss.path = (t) =>
      t < toss.launchAt || t > toss.launchAt + toss.flightMs
        ? null
        : tossAt(toss, t, at);
    tosses.push(toss);
    endsAt = launchAt + toss.flightMs;
    launchAt += between([...tossGapMs]);
  }
  return endsAt;
}

// a toss in flight: up from below the bottom edge to its apex and back
// down, drifting towards the middle
function tossAt(toss: Toss, now: number, into: Point): Point {
  const t = (now - toss.launchAt) / toss.flightMs;
  const startY = height + SIZE * START_BELOW;
  const apexY = toss.fApex * height;
  // a parabola through the start at t 0 and 1, peaking at t 0.5
  into.y = startY - (startY - apexY) * 4 * t * (1 - t);
  const x0 = toss.fx * width;
  into.x = x0 + (width / 2 - x0) * toss.drift * t;
  return into;
}

function isFlying(toss: Toss, now: number): boolean {
  return (
    toss.caughtAt === Infinity &&
    now >= toss.launchAt &&
    now <= toss.launchAt + toss.flightMs
  );
}

function hitToss(x: number, y: number, now: number): Toss | null {
  for (let i = tosses.length - 1; i >= 0; i--) {
    const toss = tosses[i];
    if (!isFlying(toss, now)) continue;
    tossAt(toss, now, spot);
    if (Math.hypot(x - spot.x, y - spot.y) < SIZE * HIT_REACH) return toss;
  }
  return null;
}

// whether a press at (x, y) (gameCanvas screen units) would catch a toss
export function hitTestTosses(x: number, y: number): boolean {
  return !!hitToss(x, y, performance.now());
}

// catches the toss under (x, y) and pays it; true if one was caught, so the
// press goes no further
export function catchTossAt(x: number, y: number): boolean {
  if (!getDeps) return false;
  const now = performance.now();
  const toss = hitToss(x, y, now);
  if (!toss) return false;
  toss.caughtAt = now;
  tossAt(toss, now, toss.from);
  playBubblePop();
  shakeScreen(CATCH_SHAKE);
  toss.payout = collectPrize(
    getDeps(),
    toss.floor,
    toss.prize,
    toss.from,
    height,
    SIZE,
    now,
  );
  return true;
}

// whether a toss is gone for good: fallen off the screen, or caught and paid
function isDone(toss: Toss, now: number): boolean {
  if (toss.caughtAt === Infinity) return now > toss.launchAt + toss.flightMs;
  return (
    now >= toss.caughtAt + CATCH_MS &&
    (!toss.payout || isPayoutDone(toss.payout, now))
  );
}

// the warning sign at the bottom middle: a gold triangle round a "!",
// popping in, pulsing, and fading out as the first toss leaves
function drawWarning(
  ctx: CanvasRenderingContext2D,
  warning: Warning,
  now: number,
): void {
  const grow = easeOutBack(progress(now, warning.at, SIGN_IN_MS));
  const fade = 1 - progress(now, warning.until - SIGN_OUT_MS, SIGN_OUT_MS);
  const pulse =
    1 + 0.12 * Math.sin(((now - warning.at) / SIGN_PULSE_MS) * Math.PI * 2);
  const size = SIGN_SIZE * grow * pulse;
  if (size <= 0 || fade <= 0) return;
  const x = width / 2;
  const y = height - SIGN_UP;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.95, y + size * 0.65);
  ctx.lineTo(x - size * 0.95, y + size * 0.65);
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.lineWidth = SIGN_STROKE;
  ctx.fillStyle = COLOR.heavenlyGold;
  ctx.strokeStyle = COLOR.white;
  ctx.fill();
  ctx.stroke();
  bang ??= createCritTextSprite("!", COLOR.white, {
    fontSize: 80,
    strokeWidth: 10,
  });
  drawCritTextSprite(ctx, bang, x, y + size * 0.12, size / SIGN_SIZE);
  ctx.restore();
}

// every warning and toss, in gameCanvas's screen units (w x h), each frame
export function drawTosses(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
): void {
  if (tosses.length === 0 && warnings.length === 0) return;
  if (!getDeps) return;
  width = w;
  height = h;
  const t = performance.now();
  for (let i = warnings.length - 1; i >= 0; i--)
    if (t >= warnings[i].until) warnings.splice(i, 1);
  for (let i = tosses.length - 1; i >= 0; i--)
    if (isDone(tosses[i], t)) tosses.splice(i, 1);
  const deps = getDeps();
  ctx.save();
  for (const warning of warnings) {
    if (!warning.shown) {
      warning.shown = true;
      playBloop();
    }
    drawWarning(ctx, warning, t);
  }
  for (const toss of tosses) {
    if (!toss.launched && t >= toss.launchAt) {
      toss.launched = true;
      playSwoosh();
    }
    if (isFlying(toss, t)) {
      drawWispTrail(ctx, toss.path, t, now, TRAIL_SIZE);
      tossAt(toss, t, spot);
      ctx.save();
      ctx.translate(spot.x, spot.y);
      ctx.rotate(((t - toss.launchAt) / 1000) * toss.spin * Math.PI * 2);
      drawMini(ctx, toss.prize, 0, 0, SIZE);
      ctx.restore();
    } else if (toss.caughtAt !== Infinity) {
      drawWhiteBurst(
        ctx,
        toss.from.x,
        toss.from.y,
        (t - toss.caughtAt) / CATCH_MS,
        CATCH_BURST,
      );
      if (toss.payout) drawPayout(ctx, deps, toss.payout, height, t, now);
    }
  }
  ctx.restore();
}
