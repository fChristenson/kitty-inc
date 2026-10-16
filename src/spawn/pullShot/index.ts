// the pull shot: every so often a wisp hangs in a band of light strung
// between two glowing posts. Pressed and dragged back, the band stretches
// thinner and the wisp trembles and swells the further it goes; let go and it
// shoots off away from the pull, then curves up into the total, the band
// twanging behind it. The further the pull, the more it pays (CONFIG
// rewardSeconds for a full pull, minShare of it for the shortest shot); a
// pull too short to fire just snaps back. Left alone it blinks out after
// durationMs. Draws in screen space over the crit flash
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playSold, playSpawnNotice, playSwoosh } from "../../sound";
import { getActiveCompanyIndex } from "../../company";
import {
  addTotalIncome,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import { multiply } from "../../shared/bigNumber";
import { drawDetonation } from "../../shared/animationStyles/explosion";
import { bezier } from "../../shared/curves";
import { between, clamp01, lerp } from "../../shared/easing";
import { beginLightBatch, endLightBatch } from "../../shared/lightBatch";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import type { SpawnGame } from "../../shared/spawnGames";
import { stampGlimmer } from "../../shared/twinkle";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";
import {
  drawWisp,
  WISP_SIZE,
  WISP_TRAIL_MS,
  type Point,
} from "../../shared/wisp";
import { tapHits } from "../../shared/tapTarget";

// where it hangs, as fractions of the screen; the posts BAND_HALF of the
// screen's shorter side either side of it
const SPOT_X: [number, number] = [0.3, 0.7];
const SPOT_Y: [number, number] = [0.5, 0.75];
const BAND_HALF = 0.17;
// a full pull reaches MAX_PULL of the shorter side; under MIN_PULL of that
// it snaps back without firing
const MAX_PULL = 0.32;
const MIN_PULL = 0.15;
const WISP_SCALE = 1.4;
const PULL_GROW = 0.7;
const TREMBLE = 12;
const TREMBLE_RATE = 0.09;
const BAND_WIDTH: [number, number] = [9, 3.5];
const POST_SIZE = 70;
// the shot: off away from the pull (KICK times it), curving into the total
const FLY_MS = 280;
const KICK = 1.8;
const RELEASE_SHAKE = 0.4;
const HIT_SHAKE: [number, number] = [0.6, 1.3];
const HIT_BLAST: [number, number] = [160, 320];
const BLAST_MS = 800;
// the band twanging back after a release
const TWANG_RATE = 0.045;
const TWANG_MS = 140;

interface Run {
  // as fractions of the screen
  spot: Point;
  endAt: number;
  held: boolean;
  // the finger's offset from the wisp, and the pull off the rest spot, in
  // screen units
  grab: Point;
  pull: Point;
  // the last release: when, and the pull it let go of
  releasedAt: number;
  released: Point;
  // the shot: when it was fired, from where, its share of the reward (0..1)
  firedAt: number;
  from: Point;
  share: number;
  hit: boolean;
}

let run: Run | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.pullShot, performance.now());
// the screen as last drawn, in gameCanvas's screen units (1 x 1 until the
// first draw, so the spot stays a fraction until drawn)
let width = 1;
let height = 1;
let unit = 1;
let totalY = 0;
const here: Point = { x: 0, y: 0 };
const band: Point = { x: 0, y: 0 };
const post: Point = { x: 0, y: 0 };
const bend: Point = { x: 0, y: 0 };
const total: Point = { x: 0, y: 0 };

function updatePullShot(now: number): void {
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
  run = {
    spot: { x: between(SPOT_X), y: between(SPOT_Y) },
    endAt: now + CONFIG.randomSpawns.pullShot.durationMs,
    held: false,
    grab: { x: 0, y: 0 },
    pull: { x: 0, y: 0 },
    releasedAt: -Infinity,
    released: { x: 0, y: 0 },
    firedAt: Infinity,
    from: { x: 0, y: 0 },
    share: 0,
    hit: false,
  };
  playSpawnNotice();
}

const restX = (r: Run) => r.spot.x * width;
const restY = (r: Run) => r.spot.y * height;
const pullOf = (p: Point) => Math.hypot(p.x, p.y) / (MAX_PULL * unit);

// the band's middle at t: on the finger while held, twanging back after
function bandAt(r: Run, t: number, into: Point): Point {
  into.x = restX(r);
  into.y = restY(r);
  if (r.held) {
    const shiver = pullOf(r.pull) * TREMBLE * Math.sin(t * TREMBLE_RATE);
    into.x += r.pull.x + shiver;
    into.y += r.pull.y - shiver * 0.5;
    return into;
  }
  const since = t - r.releasedAt;
  if (since > TWANG_MS * 8) return into;
  const twang = Math.cos(since * TWANG_RATE) * Math.exp(-since / TWANG_MS);
  into.x += r.released.x * twang;
  into.y += r.released.y * twang;
  return into;
}

// the wisp at t: on the band, then the shot; null once it's hit
function wispAt(t: number): Point | null {
  const r = run;
  if (!r) return null;
  if (t < r.firedAt) return bandAt(r, Math.max(t, r.releasedAt), here);
  const u = (t - r.firedAt) / FLY_MS;
  if (u >= 1) return null;
  total.x = width / 2;
  total.y = totalY;
  bend.x = r.from.x + (r.from.x - restX(r)) * KICK;
  bend.y = r.from.y + (r.from.y - restY(r)) * KICK;
  return bezier(r.from, bend, total, u, here);
}

function hitsWisp(x: number, y: number, t: number): boolean {
  const r = run;
  if (!r || r.firedAt !== Infinity || isSpawnGone(r.endAt - t)) return false;
  bandAt(r, t, band);
  return tapHits(x, y, band, WISP_SIZE * WISP_SCALE);
}

function press(x: number, y: number): boolean {
  const t = performance.now();
  if (!hitsWisp(x, y, t)) return false;
  const r = run!;
  r.held = true;
  r.grab.x = band.x - x;
  r.grab.y = band.y - y;
  r.pull.x = band.x - restX(r);
  r.pull.y = band.y - restY(r);
  return true;
}

function move(x: number, y: number): void {
  const r = run;
  if (!r?.held) return;
  r.pull.x = x + r.grab.x - restX(r);
  r.pull.y = y + r.grab.y - restY(r);
  const over = pullOf(r.pull);
  if (over > 1) {
    r.pull.x /= over;
    r.pull.y /= over;
  }
}

function release(): void {
  const r = run;
  if (!r?.held) return;
  const t = performance.now();
  r.held = false;
  r.releasedAt = t;
  r.released.x = r.pull.x;
  r.released.y = r.pull.y;
  const share = pullOf(r.pull);
  r.pull.x = r.pull.y = 0;
  if (share < MIN_PULL) return;
  r.firedAt = t;
  r.from.x = restX(r) + r.released.x;
  r.from.y = restY(r) + r.released.y;
  r.share = share;
  r.endAt = Infinity;
  shakeScreen(RELEASE_SHAKE);
  playSwoosh();
}

function hit(r: Run): void {
  r.hit = true;
  const { rewardSeconds, minShare } = CONFIG.randomSpawns.pullShot;
  const rate = getCompanyIncomeRatePerSecond(getActiveCompanyIndex());
  const seconds = rewardSeconds * lerp([minShare, 1], r.share);
  addTotalIncome(multiply(rate, seconds));
  pulseHudTotalFlash();
  shakeScreen(lerp(HIT_SHAKE, r.share));
  playSold();
}

function drawPullShot(
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
  const { pulseMs } = CONFIG.randomSpawns.pullShot;
  // never blinks out while held
  if (r.held) r.endAt = Math.max(r.endAt, t + pulseMs);
  const msLeft = r.endAt - t;
  const since = t - r.firedAt;
  const over = since > Math.max(WISP_TRAIL_MS, BLAST_MS) + FLY_MS;
  if (isSpawnGone(msLeft) || over) {
    run = null;
    return;
  }
  if (since >= FLY_MS && !r.hit) hit(r);
  const fade = spawnFade(msLeft, pulseMs, now);
  const gone = clamp01(since / 300);
  const show = fade.alpha * (1 - gone);
  const pull = r.held ? pullOf(r.pull) : 0;
  bandAt(r, t, band);
  const spread = BAND_HALF * unit;
  if (show > 0) {
    ctx.save();
    ctx.globalAlpha = show;
    // the pale yellow at the faded end of the badge's light rays
    ctx.strokeStyle = COLOR.wispGlitter;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = lerp(BAND_WIDTH, pull) * fade.scale;
    ctx.beginPath();
    ctx.moveTo(restX(r) - spread, restY(r));
    ctx.lineTo(band.x, band.y);
    ctx.lineTo(restX(r) + spread, restY(r));
    ctx.stroke();
    ctx.restore();
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = show;
    beginLightBatch(ctx);
    for (let side = -1; side <= 1; side += 2) {
      post.x = restX(r) + side * spread;
      post.y = restY(r);
      stampGlimmer(
        ctx,
        post.x,
        post.y,
        POST_SIZE * fade.scale * (1 + 0.4 * pull),
        now * 0.003 * side,
        COLOR.heavenlyGold,
      );
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
  }
  const heat = r.firedAt === Infinity ? pull : 1;
  const size =
    WISP_SIZE *
    WISP_SCALE *
    (1 + PULL_GROW * (r.firedAt === Infinity ? pull : r.share)) *
    fade.scale;
  drawWisp(ctx, wispAt, t, now, size, heat, fade.alpha);
  if (r.hit) {
    total.x = w / 2;
    total.y = totalAtY;
    drawDetonation(ctx, total, since - FLY_MS, lerp(HIT_BLAST, r.share), now);
  }
}

export default {
  force: () => startRun(performance.now()),
  update: updatePullShot,
  drawOver: drawPullShot,
  press,
  move,
  release,
  hitTest: (x, y) => hitsWisp(x, y, performance.now()),
} satisfies SpawnGame;
