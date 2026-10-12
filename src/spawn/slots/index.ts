// the slots: every so often a floor's income bar in view flips over and
// comes back as a slot window, three cells of numbers ringed by casino bulbs
// chasing round it and a wisp flying in to wait by its top right corner,
// wiggling for a tap. A tap has the wisp grab and haul down like a hand on a
// lever, kicking the reels into a blurred spin, the bulbs racing;
// they stop one by one with a slam, the last teasing past before it drops
// in, all three on x3, x7 or x10 (CONFIG odds); then every bulb flashes, a
// payline beams across and the floor takes that many levels in a blast
// before the bar flips back. Untapped, it blinks and vanishes like every
// spawn
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
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelSpawnHidden,
} from "../../floors";
import type { Floor } from "../../gameState";
import { playCoinDrop, playJackpot, playSwoosh } from "../../sound";
import { drawBeam } from "../../shared/beam";
import { clamp01, lerp } from "../../shared/easing";
import { drawDetonation } from "../../shared/explosion";
import { playExplosion } from "../../shared/explosionBang";
import { beginLightBatch, endLightBatch } from "../../shared/lightBatch";
import { shakeScreen } from "../../shared/screenShake";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import {
  barFloorsInView,
  barOnScreen,
  giveLevels,
  registerSpawnGame,
  spawnGameDeps,
} from "../../shared/spawnGames";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { drawChevronBarFrame } from "../../shared/glossyWidgets";
import { tapHitsMoving } from "../../shared/tapTarget";
import { stampGlimmer } from "../../shared/twinkle";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";

// the bar flipping over into its cells, and back
const FLIP_MS = 320;
// the three cells across the bar, split by dividers DIVIDER of its height wide
const REELS = 3;
const DIVIDER = 0.07;
// a symbol, of the bar's height (inside its border, like jackpotReelsEvent's
// reels), and how far apart they ride on a reel
const SYMBOL_FONT = 0.4;
const SYMBOL_STROKE = 0.15;
const SYMBOL_RES = 2;
const STEP = 0.75;
const STRIP: CritTier[] = ["crit", "mega", "crit", "ultra", "crit", "mega"];
// the wiggle asking for a tap
const WIGGLE = 0.04;
const WIGGLE_RATE = 0.018;
// a wisp flies in over ARRIVE_MS to wait by the window's top right corner,
// bobbing; a tap has it pull like a hand on a lever: it hitches up over
// WIND_MS, hauls down the window's right side over PULL_MS, gathering speed,
// bumps at the bottom, holds and lets go back up. The haul's end starts every
// reel spinning at SPIN symbols a ms, blurring. Each reel brakes over its
// SETTLES_MS into its stop, STOPS_MS after the tap (the last slow, teasing
// past before it drops in). Distances are of the bar's height
const ARRIVE_MS = 300;
const ARRIVE_UP = 3;
const ARRIVE_OUT = 80;
const REST_OUT = 0.45;
const BOB = 0.06;
const BOB_RATE = 0.006;
const WIND_MS = 110;
const WIND_UP = 0.3;
const PULL_MS = 150;
const PULL_BELOW = 0.5;
const PULL_BOW = 0.2;
const BUMP_MS = 70;
const BUMP = 0.12;
const HOLD_MS = 140;
const LET_GO_MS = 320;
const YANK_MS = WIND_MS + PULL_MS;
const YANK_SHAKE = 1.2;
const WISP = WISP_SIZE * 1.3;
// reels roll at least SPIN symbols a ms (at most about twice it): past half a
// symbol a frame the numbers seem to roll up instead of in from above
const SPIN = 0.012;
const SETTLES_MS = [220, 220, 700];
const STOPS_MS = [800, 1050, 1700];
const BLUR_GHOSTS = 2;
const BLUR_ALPHA = 0.35;
const BLUR_GAP = 0.22;
const LAND_MS = STOPS_MS[REELS - 1] + 80;
const BACK_MS = LAND_MS + 1000;
const STOP_SHAKE = 0.6;
const STOP_BLAST = 60;
const TEASE_BLAST = 90;
const LAND_SHAKE = 2.6;
const LAND_BLAST = 170;
const LAND_CLUSTER = [-0.35, 0.35, -0.7, 0.7];
const LAND_CLUSTER_MS = 45;
const LAND_CLUSTER_BLAST = 90;
// the win: a gold flash over the cells and a payline beamed across
const WIN_FLASH_MS = 400;
const WIN_FLASH = 0.5;
const PAYLINE_MS = 500;
const PAYLINE = 40;
const PAYLINE_OUT = 60;
// the casino bulbs above and below the window, BULB_GAP apart, chasing
// every CHASE_MS (racing while it spins), all flashing on a win
const BULB_GAP = 64;
const BULB_OUT = 34;
const BULB_LIT = 38;
const BULB_DIM = 12;
const CHASE_MS = 130;
const RACE_MS = 45;
const FLASH_MS = 90;
// each reel's strip starts here, so the idle reels show x3, x7 and x10
const REEL_FROM = [0, 1, 3];

interface Slot {
  floor: Floor;
  isGround: boolean;
  bornAt: number;
  // performance.now() it was tapped, its result, and each reel's speed
  // (symbols a ms), brake (symbol it brakes from) and stop (symbol it lands on)
  tappedAt: number;
  result: CritTier;
  speeds: number[];
  brakes: number[];
  stops: number[];
  landed: number;
  paid: boolean;
  yanked: boolean;
}

let slot: Slot | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.slots, performance.now());
const bar: Point = { x: 0, y: 0 };
const left: Point = { x: 0, y: 0 };
const right: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };
const sprites = new Map<CritTier, CritTextSprite>();
// the bar's window, white, and its shade over the numbers so each cell reads
// as a turning drum, both built once
let windowBack: HTMLCanvasElement | null = null;
let windowShade: HTMLCanvasElement | null = null;

function spriteFor(tier: CritTier): CritTextSprite {
  let sprite = sprites.get(tier);
  if (!sprite) {
    const { label, color } = CRIT_TIER_CONFIG[tier];
    const fontSize = getIncomeBarBox(false).height * SYMBOL_FONT;
    sprite = createCritTextSprite(
      label,
      color,
      { fontSize, strokeWidth: fontSize * SYMBOL_STROKE },
      SYMBOL_RES,
    );
    sprites.set(tier, sprite);
  }
  return sprite;
}

function bakeWindow(isGround: boolean): void {
  if (windowBack && windowShade) return;
  const { width, height, radius } = getIncomeBarBox(isGround);
  const make = (paint: (c: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);
    const c = canvas.getContext("2d")!;
    c.beginPath();
    c.roundRect(0, 0, width, height, radius);
    paint(c);
    return canvas;
  };
  windowBack = make((c) => {
    c.fillStyle = COLOR.white;
    c.fill();
  });
  windowShade = make((c) => {
    const shade = c.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, "rgba(0, 0, 0, 0.45)");
    shade.addColorStop(0.3, "rgba(0, 0, 0, 0)");
    shade.addColorStop(0.7, "rgba(0, 0, 0, 0)");
    shade.addColorStop(1, "rgba(0, 0, 0, 0.45)");
    c.fillStyle = shade;
    c.fill();
  });
}

function pickResult(): CritTier {
  const { odds } = CONFIG.randomSpawns.slots;
  let r = Math.random() * (odds.crit + odds.mega + odds.ultra);
  if ((r -= odds.ultra) < 0) return "ultra";
  if ((r -= odds.mega) < 0) return "mega";
  return "crit";
}

function start(now: number): void {
  const deps = spawnGameDeps();
  if (!deps) return;
  const floors = barFloorsInView(deps);
  if (!floors.length) return;
  const floor = floors[Math.floor(Math.random() * floors.length)];
  for (const tier of STRIP) spriteFor(tier);
  slot = {
    floor,
    isGround: deps.floors.indexOf(floor) === 0,
    bornAt: now,
    tappedAt: -1,
    result: "crit",
    speeds: [],
    brakes: [],
    stops: [],
    landed: 0,
    paid: false,
    yanked: false,
  };
  setIncomePanelSpawnHidden(floor);
}

// spins a slot (test button)
export function forceSlotsSpawn(): void {
  if (slot) end();
  start(performance.now());
}

function end(): void {
  setIncomePanelSpawnHidden(null);
  slot = null;
}

// the first symbol at or past `from` showing tier
function nextOn(from: number, tier: CritTier): number {
  let k = Math.ceil(from);
  while (STRIP[((k % STRIP.length) + STRIP.length) % STRIP.length] !== tier)
    k++;
  return k;
}

function spinUp(s: Slot, now: number): void {
  s.tappedAt = now;
  s.result = pickResult();
  for (let i = 0; i < REELS; i++) {
    // each reel's speed is set so that braking evenly from it lands on the
    // result: the strip runs (spin + half the settle) at that speed
    const brakeAt = STOPS_MS[i] - SETTLES_MS[i];
    const run = brakeAt - YANK_MS + SETTLES_MS[i] / 2;
    const stop = nextOn(REEL_FROM[i] + SPIN * run, s.result);
    s.speeds[i] = (stop - REEL_FROM[i]) / run;
    s.brakes[i] = REEL_FROM[i] + s.speeds[i] * (brakeAt - YANK_MS);
    s.stops[i] = stop;
  }
  playSwoosh();
}

// where reel i's strip is, in symbols: rolling down from the yank, braking
// evenly into its stop
function reelAt(s: Slot, i: number, now: number): number {
  if (s.tappedAt < 0) return REEL_FROM[i];
  const t = now - s.tappedAt;
  if (t < YANK_MS) return REEL_FROM[i];
  const brakeAt = STOPS_MS[i] - SETTLES_MS[i];
  if (t < brakeAt) return REEL_FROM[i] + s.speeds[i] * (t - YANK_MS);
  const u = clamp01((t - brakeAt) / SETTLES_MS[i]);
  return lerp([s.brakes[i], s.stops[i]], 1 - (1 - u) ** 2);
}

// how blurred reel i is (0..1): spinning flat out, clearing as it brakes
function blurAt(s: Slot, i: number, now: number): number {
  if (s.tappedAt < 0) return 0;
  const t = now - s.tappedAt;
  const brakeAt = STOPS_MS[i] - SETTLES_MS[i];
  if (t < YANK_MS || t >= STOPS_MS[i]) return 0;
  if (t < brakeAt) return Math.min(1, (t - YANK_MS) / 120);
  return 1 - (t - brakeAt) / SETTLES_MS[i];
}

// the wisp's spots, kept as the bar's place this frame: resting by the
// window's top right corner, flying in there ms after the bar appears, and
// hauling down ms after the tap
const wispSpot: Point = { x: 0, y: 0 };
let wispWidth = 0;
let wispHeight = 0;
let screenW = 0;
const restX = () => bar.x + wispWidth / 2 + wispHeight * REST_OUT;
const restY = () => bar.y - wispHeight / 2;

const arrivingAt = (ms: number): Point => {
  const u = clamp01(ms / ARRIVE_MS);
  const k = 1 - (1 - u) ** 3;
  const x = restX();
  const y = restY();
  const fromX = screenW + ARRIVE_OUT;
  const fromY = y - wispHeight * ARRIVE_UP;
  // curving in from off the right edge, dropping onto the corner
  wispSpot.x = (1 - k) ** 2 * fromX + 2 * (1 - k) * k * x + k * k * x;
  wispSpot.y = (1 - k) ** 2 * fromY + 2 * (1 - k) * k * fromY + k * k * y;
  if (u >= 1) wispSpot.y += wispHeight * BOB * Math.sin(ms * BOB_RATE);
  return wispSpot;
};

const pullingAt = (ms: number): Point => {
  const h = wispHeight;
  const top = restY();
  const bottom = bar.y + h / 2 + h * PULL_BELOW;
  wispSpot.x = restX();
  wispSpot.y = top;
  if (ms <= 0) return wispSpot;
  if (ms < WIND_MS) {
    wispSpot.y = top - h * WIND_UP * Math.sin((Math.PI / 2) * (ms / WIND_MS));
    return wispSpot;
  }
  const hauled = ms - WIND_MS;
  if (hauled < PULL_MS) {
    const u = hauled / PULL_MS;
    wispSpot.x += h * PULL_BOW * Math.sin(Math.PI * u);
    wispSpot.y = lerp([top - h * WIND_UP, bottom], u * u);
    return wispSpot;
  }
  const held = hauled - PULL_MS;
  if (held < BUMP_MS) {
    wispSpot.y = bottom + h * BUMP * Math.sin(Math.PI * (held / BUMP_MS));
    return wispSpot;
  }
  const back = held - BUMP_MS - HOLD_MS;
  const u = 1 - (1 - clamp01(back / LET_GO_MS)) ** 3;
  wispSpot.y = lerp([bottom, top], back > 0 ? u : 0);
  return wispSpot;
};

// the bar's ends on screen, false once its floor is gone
function place(s: Slot): boolean {
  const deps = spawnGameDeps();
  if (!deps || !barOnScreen(deps, s.floor, bar)) return false;
  const half = getIncomeBarBox(s.isGround).width / 2;
  left.x = bar.x - half;
  left.y = bar.y;
  right.x = bar.x + half;
  right.y = bar.y;
  return true;
}

function canTap(s: Slot, now: number): boolean {
  const age = now - s.bornAt;
  return (
    s.tappedAt < 0 &&
    age >= FLIP_MS / 2 &&
    age < CONFIG.randomSpawns.slots.durationMs
  );
}

function hitTest(x: number, y: number, now: number): boolean {
  const s = slot;
  if (!s || !canTap(s, now) || !place(s)) return false;
  const height = getIncomeBarBox(s.isGround).height;
  return tapHitsMoving(x, y, left, right, height / 2);
}

function press(x: number, y: number, now: number): boolean {
  if (!slot || !hitTest(x, y, now)) return false;
  spinUp(slot, now);
  return true;
}

function update(now: number): void {
  if (slot) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) start(now);
}

// the floor's real bar where it is on screen, under ctx's own transform
function drawBarHere(ctx: CanvasRenderingContext2D, s: Slot): void {
  const area = spawnGameDeps()?.getScreenAreaLocal?.(s.floor);
  if (!area) return;
  ctx.save();
  ctx.translate(-area.left, -area.top);
  drawIncomePanel(ctx, s.floor, s.isGround, { whiteAlpha: 0, rotation: 0 });
  ctx.restore();
}

// the floor's real bar, squashed to `sy` of its height round its middle
function drawRealBar(ctx: CanvasRenderingContext2D, s: Slot, sy: number): void {
  ctx.save();
  ctx.translate(bar.x, bar.y);
  ctx.scale(1, sy);
  ctx.translate(-bar.x, -bar.y);
  drawBarHere(ctx, s);
  ctx.restore();
}

// the bar as a slot machine's window: white, split into its three cells by
// black dividers, each spinning its numbers, under the bar's own border;
// squashed to `sy`, wiggling by `wiggle`, scaled and faded
function drawReels(
  ctx: CanvasRenderingContext2D,
  s: Slot,
  sy: number,
  wiggle: number,
  scale: number,
  alpha: number,
  now: number,
): void {
  const box = getIncomeBarBox(s.isGround);
  const cell = box.width / REELS;
  const left = bar.x - box.width / 2;
  const top = bar.y - box.height / 2;
  const step = box.height * STEP;
  const tier = s.floor.critMultiplierTier;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(bar.x, bar.y);
  ctx.scale(scale, sy * scale);
  if (wiggle) ctx.rotate(wiggle * Math.sin(now * WIGGLE_RATE));
  ctx.translate(-bar.x, -bar.y);
  bakeWindow(s.isGround);
  ctx.drawImage(windowBack!, left, top);
  for (let i = 0; i < REELS; i++) {
    const cx = left + cell * (i + 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - cell / 2, top, cell, box.height);
    ctx.clip();
    const p = reelAt(s, i, now);
    const blur = blurAt(s, i, now);
    for (let k = Math.floor(p) - 1; k <= Math.ceil(p) + 1; k++) {
      const shown = STRIP[((k % STRIP.length) + STRIP.length) % STRIP.length];
      const y = bar.y + (p - k) * step;
      drawCritTextSprite(ctx, spriteFor(shown), cx, y, 1);
      for (let g = 1; g <= BLUR_GHOSTS && blur > 0; g++) {
        ctx.globalAlpha = (alpha * BLUR_ALPHA * blur) / g;
        drawCritTextSprite(
          ctx,
          spriteFor(shown),
          cx,
          y - g * step * BLUR_GAP,
          1,
        );
        ctx.globalAlpha = alpha;
      }
    }
    ctx.restore();
  }
  const won = s.tappedAt >= 0 ? now - s.tappedAt - LAND_MS : -1;
  if (won >= 0 && won < WIN_FLASH_MS) {
    ctx.globalAlpha = alpha * WIN_FLASH * (1 - won / WIN_FLASH_MS);
    ctx.fillStyle = COLOR.heavenlyGold;
    ctx.fillRect(left, top, box.width, box.height);
    ctx.globalAlpha = alpha;
  }
  ctx.drawImage(windowShade!, left, top);
  ctx.fillStyle = COLOR.black;
  const divider = box.height * DIVIDER;
  for (let i = 1; i < REELS; i++)
    ctx.fillRect(left + cell * i - divider / 2, top, divider, box.height);
  drawChevronBarFrame(
    ctx,
    left,
    top,
    box.width,
    box.height,
    box.radius,
    tier ? CRIT_TIER_CONFIG[tier].color : COLOR.moneyGreen,
  );
  ctx.restore();
}

function land(s: Slot): void {
  const deps = spawnGameDeps();
  const { multiplier, color } = CRIT_TIER_CONFIG[s.result];
  if (deps) giveLevels(deps, s.floor, multiplier, color);
  shakeScreen(LAND_SHAKE);
  playExplosion();
  playJackpot();
}

// the casino bulbs above and below the window, `sy` of their spread and
// scaled, chasing slowly, racing while it spins, all flashing on a win
function drawBulbs(
  ctx: CanvasRenderingContext2D,
  s: Slot,
  sy: number,
  scale: number,
  alpha: number,
  now: number,
): void {
  const box = getIncomeBarBox(s.isGround);
  const t = s.tappedAt >= 0 ? now - s.tappedAt : -1;
  const won = t >= LAND_MS;
  const chase = Math.floor(now / (t >= 0 && !won ? RACE_MS : CHASE_MS));
  const flash = Math.floor(now / FLASH_MS);
  const half = (box.width / 2) * scale;
  const out = (box.height / 2 + BULB_OUT) * sy * scale;
  const count = Math.floor((box.width + 40) / BULB_GAP);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let k = 0; k <= count; k++) {
    const x = bar.x - half - 20 * scale + k * BULB_GAP * scale;
    for (let side = 0; side < 2; side++) {
      const lit = won ? (flash + k + side) % 2 === 0 : (k + chase) % 3 === 0;
      stampGlimmer(
        ctx,
        x,
        bar.y + (side ? out : -out),
        (lit ? BULB_LIT : BULB_DIM) * scale,
        k * 2 + side,
        lit ? COLOR.heavenlyGold : COLOR.white,
      );
    }
  }
  endLightBatch(ctx);
  ctx.restore();
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  _totalAtY: number,
  now: number,
): void {
  const s = slot;
  if (!s) return;
  if (!place(s)) {
    end();
    return;
  }
  const box = getIncomeBarBox(s.isGround);
  wispWidth = box.width;
  wispHeight = box.height;
  screenW = w;
  const age = now - s.bornAt;
  if (s.tappedAt < 0) {
    const { durationMs, pulseMs } = CONFIG.randomSpawns.slots;
    const msLeft = durationMs - age;
    if (isSpawnGone(msLeft)) {
      end();
      return;
    }
    if (age < FLIP_MS) {
      const flip = Math.cos(Math.PI * (age / FLIP_MS));
      if (flip > 0) drawRealBar(ctx, s, Math.max(0.04, flip));
      else {
        drawReels(ctx, s, Math.max(0.04, -flip), 0, 1, 1, now);
        drawBulbs(ctx, s, -flip, 1, 1, now);
      }
      drawWisp(ctx, arrivingAt, age, now, WISP);
      return;
    }
    const fade = spawnFade(msLeft, pulseMs, now);
    if (msLeft < 0) drawRealBar(ctx, s, 1);
    drawReels(ctx, s, 1, WIGGLE, fade.scale, fade.alpha, now);
    drawBulbs(ctx, s, 1, fade.scale, fade.alpha, now);
    drawWisp(ctx, arrivingAt, age, now, WISP * fade.scale, 0, fade.alpha);
    return;
  }

  const t = now - s.tappedAt;
  if (!s.yanked && t >= YANK_MS) {
    s.yanked = true;
    shakeScreen(YANK_SHAKE);
  }
  while (s.landed < REELS && t >= STOPS_MS[s.landed]) {
    shakeScreen(STOP_SHAKE);
    playCoinDrop();
    s.landed++;
  }
  if (!s.paid && t >= LAND_MS) {
    s.paid = true;
    land(s);
  }
  if (t >= BACK_MS + FLIP_MS) {
    end();
    return;
  }
  if (t >= BACK_MS) {
    const flip = Math.cos(Math.PI * ((t - BACK_MS) / FLIP_MS));
    if (flip > 0) {
      drawReels(ctx, s, Math.max(0.04, flip), 0, 1, 1, now);
      drawBulbs(ctx, s, flip, 1, 1, now);
    } else drawRealBar(ctx, s, Math.max(0.04, -flip));
  } else {
    drawReels(ctx, s, 1, 0, 1, 1, now);
    drawBulbs(ctx, s, 1, 1, 1, now);
  }

  const cell = box.width / REELS;
  // the wisp hauling down and back, waiting till the bar flips back, and
  // the payline on a win
  drawWispBetween(ctx, pullingAt, t, now, WISP, 1, 0, BACK_MS);
  const line = t - LAND_MS;
  if (line >= 0 && line < PAYLINE_MS) {
    left.x = bar.x - box.width / 2 - PAYLINE_OUT;
    right.x = bar.x + box.width / 2 + PAYLINE_OUT;
    left.y = right.y = bar.y;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawBeam(
      ctx,
      left,
      right,
      PAYLINE,
      (1 - line / PAYLINE_MS) * (0.7 + 0.3 * Math.sin(now * 0.08)),
    );
    ctx.restore();
  }
  for (let i = 0; i < REELS; i++) {
    blast.x = bar.x - box.width / 2 + cell * (i + 0.5);
    blast.y = bar.y;
    drawDetonation(
      ctx,
      blast,
      t - STOPS_MS[i],
      i === REELS - 1 ? TEASE_BLAST : STOP_BLAST,
      now,
    );
  }
  drawDetonation(ctx, bar, t - LAND_MS, LAND_BLAST, now);
  for (let k = 0; k < LAND_CLUSTER.length; k++) {
    blast.x = bar.x + LAND_CLUSTER[k] * box.width;
    blast.y = bar.y;
    drawDetonation(
      ctx,
      blast,
      t - LAND_MS - (k + 1) * LAND_CLUSTER_MS,
      LAND_CLUSTER_BLAST,
      now,
    );
  }
}

registerSpawnGame({ update, draw, press, hitTest });
