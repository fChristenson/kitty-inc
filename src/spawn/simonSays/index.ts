// Simon says: every so often the income bars in view flip over, their
// income text flipping away, and play a classic Simon light show: bar after
// bar lights up gold, each with its own note. Then the player taps the bars
// in the same order, each lighting up with its note again. Every right tap
// plays its part of an effect (simonSays/effects); the last starts its
// reward, played by tapping any bar in view. A wrong tap, or none in time,
// ends it with nothing lost, the bars flipping back
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { CRIT_TIER_CONFIG } from "../../crits";
import {
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelsSpawnHidden,
  wiggleIncomeBar,
} from "../../floors";
import type { Floor } from "../../gameState";
import { playBloop, playSimonNote, playSwoosh } from "../../sound";
import { drawChevronBar, drawGoldBar } from "../../shared/glossyWidgets";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import {
  barFloorsInView,
  barOnScreen,
  registerSpawnGame,
  spawnGameDeps,
} from "../../shared/spawnGames";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { tapHitsMoving } from "../../shared/tapTarget";
import type { Point } from "../../shared/wisp";
import { EFFECTS, type SimonEffect } from "./effects";

// the bars flipping over one after another, and back
const FLIP_MS = 320;
const FLIP_STAGGER_MS = 70;
// the light show: each bar lit LIGHT_MS, GAP_MS apart, after a beat
const SHOW_FROM_MS = 350;
const LIGHT_MS = 380;
const GAP_MS = 140;
// a tapped bar lights up this long
const TAP_LIGHT_MS = 260;
// a lit bar's glow
const GLOW = 360;
const GLOW_ALPHA = 0.6;
const WRONG_SHAKE = 0.8;
// how long it lingers after the last tap or a wrong one, before flipping back
const LINGER_MS = 250;
const GOLD = fadeStops(COLOR.heavenlyGold);

interface Game {
  bornAt: number;
  // the bars in it, and each one's note
  floors: Floor[];
  // the bars in the order shown, and the next one to tap
  order: Floor[];
  next: number;
  // the lights of the show played so far
  played: number;
  // ms after bornAt the player's turn starts
  turnAt: number;
  // when each bar was last tapped (ms after bornAt)
  tappedAt: Map<Floor, number>;
  effect: SimonEffect;
  // the sequence is done and the effect's reward plays
  won: boolean;
  // ms after bornAt it was won, lost or timed out (-1 still on)
  endedAt: number;
}

let game: Game | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.simonSays, performance.now());
const bar: Point = { x: 0, y: 0 };
const left: Point = { x: 0, y: 0 };
const right: Point = { x: 0, y: 0 };

// every bar once in a shuffled order, then extra lights of other bars,
// never the same one twice in a row unless it's alone
function planOrder(floors: Floor[], extra: number): Floor[] {
  const order = [...floors];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let k = 0; k < extra; k++) {
    const last = order[order.length - 1];
    const others = floors.filter((floor) => floor !== last);
    order.push(
      others.length ? others[Math.floor(Math.random() * others.length)] : last,
    );
  }
  return order;
}

const lightAt = (k: number) => SHOW_FROM_MS + k * (LIGHT_MS + GAP_MS);

function start(now: number): void {
  const deps = spawnGameDeps();
  if (!deps) return;
  const floors = barFloorsInView(deps);
  if (!floors.length) return;
  const order = planOrder(floors, CONFIG.randomSpawns.simonSays.extraTaps);
  game = {
    bornAt: now,
    floors,
    order,
    next: 0,
    played: 0,
    turnAt: lightAt(order.length),
    tappedAt: new Map(),
    effect: EFFECTS[Math.floor(Math.random() * EFFECTS.length)](),
    won: false,
    endedAt: -1,
  };
  setIncomePanelsSpawnHidden(floors);
  playSwoosh();
}

// flips the bars in view into a light show (test button)
export function forceSimonSaysSpawn(): void {
  if (game) end();
  start(performance.now());
}

function end(): void {
  setIncomePanelsSpawnHidden([]);
  game = null;
}

function playing(g: Game, now: number): boolean {
  const age = now - g.bornAt;
  return (
    g.endedAt < 0 &&
    age >= g.turnAt &&
    age < g.turnAt + CONFIG.randomSpawns.simonSays.durationMs
  );
}

// the floor among `floors` whose income bar is under (x, y), or null
function barAt(floors: Iterable<Floor>, x: number, y: number): Floor | null {
  const deps = spawnGameDeps();
  if (!deps) return null;
  for (const floor of floors) {
    if (!barOnScreen(deps, floor, bar)) continue;
    const box = getIncomeBarBox(deps.floors.indexOf(floor) === 0);
    const half = box.height / 2;
    left.x = bar.x - box.width / 2 + half;
    left.y = bar.y;
    right.x = bar.x + box.width / 2 - half;
    right.y = bar.y;
    if (tapHitsMoving(x, y, left, right, half)) return floor;
  }
  return null;
}

// every bar in view while the reward plays
function feverBarAt(x: number, y: number): Floor | null {
  const deps = spawnGameDeps();
  return deps ? barAt(barFloorsInView(deps), x, y) : null;
}

function hitTest(x: number, y: number, now: number): boolean {
  const g = game;
  if (!g) return false;
  if (g.won) return feverBarAt(x, y) !== null;
  return playing(g, now) && barAt(g.floors, x, y) !== null;
}

function press(x: number, y: number, now: number): boolean {
  const g = game;
  if (!g) return false;
  if (g.won) {
    const floor = feverBarAt(x, y);
    return !!floor && g.effect.tap(floor, now);
  }
  if (!playing(g, now)) return false;
  const floor = barAt(g.floors, x, y);
  if (!floor) return false;
  const age = now - g.bornAt;
  g.tappedAt.set(floor, age);
  playSimonNote(g.floors.indexOf(floor));
  if (floor !== g.order[g.next]) {
    g.endedAt = age;
    wiggleIncomeBar(floor);
    shakeScreen(WRONG_SHAKE);
    playBloop();
    return true;
  }
  g.effect.step(g.next, g.order.length, floor, now);
  g.next++;
  if (g.next === g.order.length) {
    g.endedAt = age;
    g.won = true;
    g.effect.start(now);
  }
  return true;
}

function update(now: number): void {
  if (game) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) start(now);
}

// how lit (0..1) floor's bar is at age: in the show, or tapped
function litAt(g: Game, floor: Floor, age: number): number {
  let lit = 0;
  if (age < g.turnAt)
    for (let k = 0; k < g.order.length; k++) {
      if (g.order[k] !== floor) continue;
      const t = age - lightAt(k);
      if (t >= 0 && t < LIGHT_MS) lit = 1 - (t / LIGHT_MS) ** 4;
    }
  const tapped = g.tappedAt.get(floor);
  if (tapped !== undefined && age - tapped < TAP_LIGHT_MS)
    lit = Math.max(lit, 1 - ((age - tapped) / TAP_LIGHT_MS) ** 4);
  return lit;
}

// floor's bar where it is on screen: the real one (its income text and all)
// or flipped over to a plain one, lit gold by `lit`; squashed to `sy`
function drawBar(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  isGround: boolean,
  real: boolean,
  sy: number,
  lit: number,
  now: number,
): void {
  const deps = spawnGameDeps();
  const area = deps?.getScreenAreaLocal?.(floor);
  if (!deps || !area || !barOnScreen(deps, floor, bar)) return;
  const box = getIncomeBarBox(isGround);
  ctx.save();
  ctx.translate(bar.x, bar.y);
  ctx.scale(1, sy);
  ctx.translate(-bar.x, -bar.y);
  if (real) {
    ctx.translate(-area.left, -area.top);
    drawIncomePanel(ctx, floor, isGround, { whiteAlpha: 0, rotation: 0 });
  } else {
    const x = bar.x - box.width / 2;
    const y = bar.y - box.height / 2;
    const tier = floor.critMultiplierTier;
    drawChevronBar(
      ctx,
      floor,
      x,
      y,
      box.width,
      box.height,
      box.radius,
      0,
      tier ? CRIT_TIER_CONFIG[tier].color : COLOR.moneyGreen,
      now,
    );
    if (lit > 0) {
      ctx.globalAlpha = lit;
      drawGoldBar(ctx, x, y, box.width, box.height, box.radius);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = GLOW_ALPHA * lit;
      drawGlow(ctx, GOLD, bar.x, bar.y, GLOW);
    }
  }
  ctx.restore();
}

// every bar flipping: over to plain from `flipAt` (ms after bornAt), or
// back to real if `back`, each FLIP_STAGGER_MS after the last
function drawBars(
  ctx: CanvasRenderingContext2D,
  g: Game,
  age: number,
  flipAt: number,
  back: boolean,
  now: number,
): void {
  const deps = spawnGameDeps();
  if (!deps) return;
  for (let i = 0; i < g.floors.length; i++) {
    const floor = g.floors[i];
    const u = Math.min(
      1,
      Math.max(0, (age - flipAt - i * FLIP_STAGGER_MS) / FLIP_MS),
    );
    const flip = Math.cos(Math.PI * u);
    const real = back ? flip <= 0 : flip > 0;
    drawBar(
      ctx,
      floor,
      deps.floors.indexOf(floor) === 0,
      real,
      Math.max(0.04, Math.abs(flip)),
      real ? 0 : litAt(g, floor, age),
      now,
    );
  }
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  totalAtY: number,
  now: number,
): void {
  const g = game;
  if (!g) return;
  const age = now - g.bornAt;

  // the light show's notes, each as its bar lights
  while (g.played < g.order.length && age >= lightAt(g.played))
    playSimonNote(g.floors.indexOf(g.order[g.played++]));

  // out of time on the player's turn: flips back with nothing lost
  if (
    g.endedAt < 0 &&
    age >= g.turnAt + CONFIG.randomSpawns.simonSays.durationMs
  )
    g.endedAt = age;

  if (g.endedAt < 0) {
    drawBars(ctx, g, age, 0, false, now);
    g.effect.draw(ctx, w, h, totalAtY, now);
    return;
  }
  const backAt = g.endedAt + LINGER_MS;
  const flipped =
    age >= backAt + FLIP_MS + FLIP_STAGGER_MS * (g.floors.length - 1);
  if (flipped) setIncomePanelsSpawnHidden([]);
  else drawBars(ctx, g, age, backAt, true, now);
  const effectOn = g.effect.draw(ctx, w, h, totalAtY, now);
  if (flipped && !effectOn) end();
}

registerSpawnGame({ update, draw, press, hitTest });
