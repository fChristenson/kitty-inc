// the slots: every so often a floor's income bar in view flips over and
// comes back as a slot window, three cells of numbers ringed by casino bulbs
// chasing round it and a wisp flying in to wait by its top right corner,
// wiggling for a tap. A tap has the wisp grab and haul down like a hand on a
// lever, kicking the reels into a blurred spin that charges up: a bloop
// for every number rolling past, rising in pitch, the bulbs racing, a gold
// glow swelling behind the rattling window and sparks spraying off it; they
// stop one by one with a slam, each linked to the one before by a crackling
// arc; once two match the world goes dark but the bar and the last crawls
// past, the screen thumping like a heartbeat, quicker and harder, gold rings
// pulsing off the window and the bulbs flashing on each beat, all three on
// x3, x7 or x10 (CONFIG odds); as it drops in the lights slam back on in a
// white flash, a payline beams across and a huge blast and a geyser of coins
// give the floor that many levels before the bar flips back. Untapped, it
// blinks and vanishes like every spawn
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
  spawnCoinBurst,
} from "../../floors";
import type { Floor } from "../../gameState";
import {
  playCoinDrop,
  playHeartbeat,
  playJackpot,
  playSpinTick,
  playSwoosh,
} from "../../sound";
import { buzz } from "../../shared/vibration";
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
import { stampGlimmer, hash01 } from "../../shared/twinkle";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { drawLightningArc } from "../../shared/lightningArc";
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
const SETTLES_MS = [220, 220, 1300];
const STOPS_MS = [660, 910, 2360];
const BLUR_GHOSTS = 2;
const BLUR_ALPHA = 0.35;
const BLUR_GAP = 0.22;
const LAND_MS = STOPS_MS[REELS - 1];
const STOP_SHAKE = 1;
const STOP_BLAST = 90;
const STOP_FLASH_MS = 160;
const STOP_FLASH = 0.8;
// each reel landing on the one before's number links them with a crackling
// arc, firing across over LINK_FIRE_MS, LINK_ARC as thick as usual
const LINK_FIRE_MS = 80;
const LINK_ARC = 0.7;
// the heartbeat: once two reels match, the world goes DARK but the bar while
// the last crawls past, the screen thumping on beats coming quicker (each gap
// BEAT_QUICKEN of the last, from BEAT_GAP_MS down to BEAT_MIN_MS) and
// harder, each a gold ring pulsing off the window; the locked reels pulse gold
const DARK = 0.75;
const DARK_IN_MS = 250;
const DARK_OUT_MS = 150;
const BEAT_FROM_MS = 220;
const BEAT_GAP_MS = 420;
const BEAT_QUICKEN = 0.78;
const BEAT_MIN_MS = 110;
const BEAT_SHAKE: [number, number] = [0.4, 1.6];
const BEAT_BUZZ_MS = 40;
const BEAT_GLOW_MS = 220;
const BEAT_RING_MS = 380;
const BEAT_FLASH_MS = 110;
const TEASE_GOLD = 0.2;
const TEASE_PULSE = 0.03;
const BEATS: number[] = [];
for (
  let at = STOPS_MS[1] + BEAT_FROM_MS, gap = BEAT_GAP_MS;
  at < LAND_MS - 60;
  at += gap, gap = Math.max(BEAT_MIN_MS, gap * BEAT_QUICKEN)
)
  BEATS.push(at);
// the win: the lights slam back on in a white flash, a huge blast and a
// geyser of coins as the floor takes its levels
const WHITE_MS = 300;
const BOOM_BLAST = 320;
const BOOM_SHAKE = 3.2;
const GEYSER_SCALE = 2.2;
const GEYSER_COINS: [number, number] = [90, 120];
const BACK_MS = LAND_MS + 1500;
// the charge while it spins (0..1 from the yank to the landing): the bloop
// ticks rising in pitch, a gold glow swelling behind the window (radius of
// its width), the window rattling (px) and sparks spraying off its edges
const SPIN_RATE: [number, number] = [0.8, 1.7];
const CHARGE_GLOW: [number, number] = [0.55, 1];
const CHARGE_GLOW_ALPHA: [number, number] = [0.3, 0.95];
const CHARGE_GLOW_SQUASH = 0.45;
const CHARGE_GLOW_STOPS = fadeStops(COLOR.heavenlyGold);
const RATTLE = 4;
const SPARKS = 18;
const SPARK_MS = 380;
const SPARK_SIZE = 34;
// how far a spark flies off the window, of the bar's height
const SPARK_FLY = 1.6;
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
  beaten: number;
  paid: boolean;
  yanked: boolean;
  // the last number the last reel ticked a bloop for
  ticked: number;
}

let slot: Slot | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.slots, performance.now());
const bar: Point = { x: 0, y: 0 };
const left: Point = { x: 0, y: 0 };
const right: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };
// the window's rattle this frame
const rattle: Point = { x: 0, y: 0 };
const linkFrom: Point = { x: 0, y: 0 };
const linkTo: Point = { x: 0, y: 0 };
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
    beaten: 0,
    paid: false,
    yanked: false,
    ticked: REEL_FROM[REELS - 1],
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
  ctx.translate(bar.x + rattle.x, bar.y + rattle.y);
  ctx.scale(scale, sy * scale);
  if (wiggle) ctx.rotate(wiggle * Math.sin(now * WIGGLE_RATE));
  ctx.translate(-bar.x, -bar.y);
  bakeWindow(s.isGround);
  ctx.drawImage(windowBack!, left, top);
  const t = s.tappedAt >= 0 ? now - s.tappedAt : -1;
  // the locked reels pulse gold while the last one crawls
  if (t >= STOPS_MS[1] && t < LAND_MS) {
    ctx.fillStyle = COLOR.heavenlyGold;
    ctx.globalAlpha =
      alpha * (TEASE_GOLD + TEASE_GOLD * Math.sin(now * TEASE_PULSE));
    ctx.fillRect(left, top, cell * (REELS - 1), box.height);
    ctx.globalAlpha = alpha;
  }
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
  // each reel flashes white as it slams to a stop
  ctx.fillStyle = COLOR.white;
  for (let i = 0; i < REELS; i++) {
    const since = t - STOPS_MS[i];
    if (t < 0 || since < 0 || since >= STOP_FLASH_MS) continue;
    ctx.globalAlpha = alpha * STOP_FLASH * (1 - since / STOP_FLASH_MS);
    ctx.fillRect(left + cell * i, top, cell, box.height);
  }
  ctx.globalAlpha = alpha;
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
  if (deps) {
    giveLevels(deps, s.floor, multiplier, color);
    const area = deps.getScreenAreaLocal?.(s.floor);
    if (area)
      spawnCoinBurst(
        s.floor,
        bar.x + area.left,
        bar.y + area.top,
        () => {},
        GEYSER_SCALE,
        GEYSER_COINS,
      );
  }
  shakeScreen(BOOM_SHAKE);
  playExplosion();
  playJackpot();
}

// how built up the spin is, 0 at the yank to 1 as the last reel lands
const chargeAt = (t: number): number =>
  t >= LAND_MS ? 0 : clamp01((t - YANK_MS) / (LAND_MS - YANK_MS));

// how dark the world round the bar is: falling once two reels match, the
// lights slamming back on as the last lands
const darkAt = (t: number): number =>
  t < STOPS_MS[1]
    ? 0
    : t < LAND_MS
      ? DARK * clamp01((t - STOPS_MS[1]) / DARK_IN_MS)
      : DARK * (1 - clamp01((t - LAND_MS) / DARK_OUT_MS));

// ms since the latest heartbeat, Infinity before the first and after the win
function sinceBeat(t: number): number {
  if (t >= LAND_MS) return Infinity;
  let since = Infinity;
  for (let k = 0; k < BEATS.length && BEATS[k] <= t; k++) since = t - BEATS[k];
  return since;
}

// the heartbeat's gold rings pulsing off the window and the glow it throbs
function drawBeats(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
): void {
  const since = sinceBeat(t);
  if (since >= BEAT_RING_MS) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (since < BEAT_GLOW_MS) {
    ctx.globalAlpha = 0.9 * (1 - since / BEAT_GLOW_MS);
    drawGlow(
      ctx,
      CHARGE_GLOW_STOPS,
      bar.x,
      bar.y,
      width * 1.1,
      CHARGE_GLOW_SQUASH,
    );
  }
  const u = since / BEAT_RING_MS;
  ctx.globalAlpha = 1 - u;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.lineWidth = 20 * (1 - u) + 2;
  ctx.beginPath();
  ctx.ellipse(
    bar.x,
    bar.y,
    width * 0.55 + width * 0.5 * u,
    height * 0.6 + height * 2 * u,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.restore();
}

// the crackling arcs linking each landed reel to the one before it
function drawLinks(
  ctx: CanvasRenderingContext2D,
  width: number,
  t: number,
  now: number,
): void {
  if (t >= LAND_MS) return;
  const cell = width / REELS;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 1; i < REELS; i++) {
    const since = t - STOPS_MS[i];
    if (since < 0) break;
    linkFrom.x = bar.x - width / 2 + cell * (i - 0.5);
    linkTo.x = linkFrom.x + cell;
    linkFrom.y = linkTo.y = bar.y;
    drawLightningArc(
      ctx,
      linkFrom,
      linkTo,
      1,
      LINK_ARC,
      now,
      i,
      clamp01(since / LINK_FIRE_MS),
    );
  }
  endLightBatch(ctx);
  ctx.restore();
}

// the gold glow swelling behind the window as the spin builds
function drawChargeGlow(
  ctx: CanvasRenderingContext2D,
  width: number,
  charge: number,
  now: number,
): void {
  if (charge <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha =
    lerp(CHARGE_GLOW_ALPHA, charge) *
    (0.85 + 0.15 * Math.sin(now * (0.02 + 0.04 * charge)));
  drawGlow(
    ctx,
    CHARGE_GLOW_STOPS,
    bar.x,
    bar.y,
    width * lerp(CHARGE_GLOW, charge),
    CHARGE_GLOW_SQUASH,
  );
  ctx.restore();
}

// sparks spraying off the window's top and bottom edges, more and bigger as
// the spin builds
function drawSparks(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  charge: number,
): void {
  if (charge <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let k = 0; k < SPARKS; k++) {
    const clock = t + (k * SPARK_MS) / SPARKS;
    const round = Math.floor(clock / SPARK_MS);
    const u = (clock % SPARK_MS) / SPARK_MS;
    const up = k % 2 === 0;
    const x =
      bar.x -
      width / 2 +
      width * hash01(k, round) +
      (hash01(round, k) - 0.5) * 60 * u;
    const y =
      bar.y +
      (up ? -1 : 1) * (height / 2 + height * SPARK_FLY * (1 - (1 - u) ** 2));
    stampGlimmer(
      ctx,
      x,
      y,
      SPARK_SIZE * charge * (1 - u),
      k + round,
      k % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.restore();
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
  // in the dark they die, all flashing on each heartbeat
  const dark = !won && t >= STOPS_MS[1];
  const beat = sinceBeat(t) < BEAT_FLASH_MS;
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
      const lit = dark
        ? beat
        : won
          ? (flash + k + side) % 2 === 0
          : (k + chase) % 3 === 0;
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
  h: number,
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
  const charge = chargeAt(t);
  // a bloop for every number the last reel rolls past, rising in pitch as
  // the spin builds and slowing with it as it brakes
  if (t < STOPS_MS[REELS - 1]) {
    const passed = Math.floor(reelAt(s, REELS - 1, now));
    if (passed > s.ticked) {
      s.ticked = passed;
      playSpinTick(lerp(SPIN_RATE, charge));
    }
  }
  while (s.landed < REELS && t >= STOPS_MS[s.landed]) {
    shakeScreen(STOP_SHAKE);
    playCoinDrop();
    s.landed++;
  }
  while (s.beaten < BEATS.length && t >= BEATS[s.beaten]) {
    shakeScreen(lerp(BEAT_SHAKE, s.beaten / Math.max(1, BEATS.length - 1)));
    playHeartbeat();
    buzz(BEAT_BUZZ_MS);
    s.beaten++;
  }
  if (!s.paid && t >= LAND_MS) {
    s.paid = true;
    land(s);
  }
  if (t >= BACK_MS + FLIP_MS) {
    end();
    return;
  }
  // the world round the bar goes dark while the last reel crawls
  const dark = darkAt(t);
  if (dark > 0) {
    ctx.fillStyle = COLOR.black;
    ctx.globalAlpha = dark;
    ctx.fillRect(-w, -h, w * 3, h * 3);
    ctx.globalAlpha = 1;
  }
  // the window rattles harder as the spin builds
  rattle.x = charge * RATTLE * Math.sin(now * 0.9);
  rattle.y = charge * RATTLE * Math.cos(now * 1.3);
  if (t >= BACK_MS) {
    const flip = Math.cos(Math.PI * ((t - BACK_MS) / FLIP_MS));
    if (flip > 0) {
      drawReels(ctx, s, Math.max(0.04, flip), 0, 1, 1, now);
      drawBulbs(ctx, s, flip, 1, 1, now);
    } else drawRealBar(ctx, s, Math.max(0.04, -flip));
  } else {
    drawChargeGlow(ctx, box.width, charge, now);
    drawBeats(ctx, box.width, box.height, t);
    drawReels(ctx, s, 1, 0, 1, 1, now);
    drawBulbs(ctx, s, 1, 1, 1, now);
    drawSparks(ctx, box.width, box.height, t, charge);
    drawLinks(ctx, box.width, t, now);
  }
  rattle.x = rattle.y = 0;

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
    drawDetonation(ctx, blast, t - STOPS_MS[i], STOP_BLAST, now);
  }
  drawDetonation(ctx, bar, t - LAND_MS, BOOM_BLAST, now);
  // the lights slamming back on in a white flash
  const white = t - LAND_MS;
  if (white >= 0 && white < WHITE_MS) {
    ctx.fillStyle = COLOR.white;
    ctx.globalAlpha = 1 - white / WHITE_MS;
    ctx.fillRect(-w, -h, w * 3, h * 3);
    ctx.globalAlpha = 1;
  }
}

registerSpawnGame({ update, draw, press, hitTest });
