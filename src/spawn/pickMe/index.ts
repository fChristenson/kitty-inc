// pick me: every so often x3, x7 and x10 pop up in a row over a floor's bar
// in view, three wisps fly in and cover them, then shuffle back and forth
// like cups, faster and faster; tap one and it bursts open on the number it
// hid, shown big in the badge lights, which then drops onto the bar as that
// many levels, the other two then showing what they hid. Untapped, it blinks
// and vanishes like every spawn
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import {
  CRIT_TIER_CONFIG,
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
  type CritTier,
} from "../../crits";
import { getIncomeBarBox } from "../../floors";
import type { Floor } from "../../gameState";
import { playSpawnNotice, playJackpot, playSpinTick } from "../../sound";
import { clamp01, lerp } from "../../shared/easing";
import { drawLightRays } from "../../shared/lightRays";
import { drawDetonation } from "../../shared/animationStyles/explosion";
import { playExplosion } from "../../shared/explosionBang";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import {
  barFloorsInView,
  barOnScreen,
  giveLevels,
  type SpawnGame,
  spawnGameDeps,
} from "../../shared/spawnGames";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { tapHits } from "../../shared/tapTarget";
import { stampGlimmer } from "../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";

const TIERS: CritTier[] = ["crit", "mega", "ultra"];
// the row over the bar: its spots SPACING of the bar's width apart, ROW of
// the bar's height above it, the numbers FONT of its height
const SPACING = 0.3;
const ROW = 1.5;
const FONT = 0.7;
const STROKE = 0.15;
const RES = 2;
// the numbers popping up one after another, each fading in over SHOW_MS
const SHOW_STAGGER_MS = 80;
const SHOW_MS = 150;
// the wisps flying in from off the top of the screen, each covering its
// number COVER_MS in, FLY_MS after setting off
const COVER_MS = 900;
const COVER_STAGGER_MS = 120;
const FLY_MS = 380;
const FLY_FROM = [-0.15, 0.5, 1.15];
const FLY_UP = 6;
const COVER_BLAST = 50;
// the shuffle: each swap's two wisps trading spots on arches BOW of the
// bar's height, one over and one under, quicker swap after swap
const SHUFFLE_FROM_MS = 1500;
const SWAPS_MS = [320, 290, 260, 230, 210, 190, 180];
const SWAP_GAP_MS = 40;
const BOW = 0.9;
const WISP = WISP_SIZE * 1.4;
const GLOW = 70;
const REACH = 0.8;
// a pick: the wisp bursts on its number, shown big in the badge lights while
// it holds, then dropping onto the bar as that many levels; the other two
// pop open on theirs once it's landed
const BURST_BLAST = 90;
const BURST_SHAKE = 1;
const PICKED_FONT = 1.3;
const LIGHTS = 1.6;
const HOLD_MS = 700;
const DROP_MS = 220;
const LAND_BLAST = 170;
const LAND_SHAKE = 2.4;
const OTHERS_MS = [HOLD_MS + DROP_MS + 250, HOLD_MS + DROP_MS + 370];
const OTHER_TICK = [1.3, 1.5];
const OTHER_BLAST = 60;
const OTHER_ALPHA = 0.7;
const OTHER_FADE_MS = 700;
const END_MS = 1100;

interface Swap {
  at: number;
  ms: number;
  a: number;
  b: number;
}

interface Pick {
  floor: Floor;
  isGround: boolean;
  bornAt: number;
  swaps: Swap[];
  // slotsAfter[k][t]: the slot tier t's wisp sits in after k swaps
  slotsAfter: number[][];
  shuffledAt: number;
  // performance.now() of the tap, the tier picked, when it lands
  pickedAt: number;
  picked: number;
  swapped: number;
  // how many of the other two have popped open
  opened: number;
  landed: boolean;
}

let pick: Pick | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.pickMe, performance.now());
const bar: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const sprites = new Map<CritTier, CritTextSprite>();
const bigSprites = new Map<CritTier, CritTextSprite>();
// the bar's size as drawn this frame
let barW = 0;
let barH = 0;
let screenW = 0;

function spriteFor(tier: CritTier, big = false): CritTextSprite {
  const cache = big ? bigSprites : sprites;
  let sprite = cache.get(tier);
  if (!sprite) {
    const { label, color } = CRIT_TIER_CONFIG[tier];
    const fontSize = getIncomeBarBox(false).height * (big ? PICKED_FONT : FONT);
    sprite = createCritTextSprite(
      label,
      color,
      { fontSize, strokeWidth: fontSize * STROKE },
      RES,
    );
    cache.set(tier, sprite);
  }
  return sprite;
}

function start(now: number): void {
  const deps = spawnGameDeps();
  if (!deps) return;
  const floors = barFloorsInView(deps);
  if (!floors.length) return;
  const floor = floors[Math.floor(Math.random() * floors.length)];
  for (const tier of TIERS) {
    spriteFor(tier);
    spriteFor(tier, true);
  }
  const swaps: Swap[] = [];
  const slotsAfter: number[][] = [[0, 1, 2]];
  let at = SHUFFLE_FROM_MS;
  for (const ms of SWAPS_MS) {
    const a = Math.floor(Math.random() * 3);
    const b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
    swaps.push({ at, ms, a, b });
    const before = slotsAfter[slotsAfter.length - 1];
    slotsAfter.push(before.map((s) => (s === a ? b : s === b ? a : s)));
    at += ms + SWAP_GAP_MS;
  }
  pick = {
    floor,
    isGround: deps.floors.indexOf(floor) === 0,
    bornAt: now,
    swaps,
    slotsAfter,
    shuffledAt: at,
    pickedAt: -1,
    picked: -1,
    swapped: 0,
    opened: 0,
    landed: false,
  };
  playSpawnNotice();
}

// shuffles a row of numbers (test button)
function forcePickMeSpawn(): void {
  pick = null;
  start(performance.now());
}

// slot i's spot over the bar as drawn this frame
function slotAt(i: number, into: Point): Point {
  into.x = bar.x + (i - 1) * barW * SPACING;
  into.y = bar.y - barH * ROW;
  return into;
}

const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
// where tier t's wisp is ms after the row popped up, null before it sets off
function wispAt(p: Pick, t: number, ms: number): Point | null {
  const coverAt = COVER_MS + t * COVER_STAGGER_MS;
  if (ms < coverAt - FLY_MS) return null;
  if (ms < coverAt) {
    // in from off the top of the screen, swooping down onto its number
    const u = 1 - (1 - clamp01((ms - coverAt + FLY_MS) / FLY_MS)) ** 2;
    slotAt(t, to);
    const fx = screenW * FLY_FROM[t];
    const fy = to.y - barH * FLY_UP;
    spot.x = (1 - u) ** 2 * fx + 2 * (1 - u) * u * to.x + u * u * to.x;
    spot.y = (1 - u) ** 2 * fy + 2 * (1 - u) * u * fy + u * u * to.y;
    return spot;
  }
  let k = 0;
  while (k < p.swaps.length && ms >= p.swaps[k].at + p.swaps[k].ms) k++;
  const slot = p.slotsAfter[k][t];
  const swap = p.swaps[k];
  if (swap && ms >= swap.at && (slot === swap.a || slot === swap.b)) {
    // trading spots: the one leaving a arches over, the other under
    const other = slot === swap.a ? swap.b : swap.a;
    const u = (ms - swap.at) / swap.ms;
    const e = u * u * (3 - 2 * u);
    slotAt(slot, from);
    slotAt(other, to);
    spot.x = lerp([from.x, to.x], e);
    spot.y =
      from.y + (slot === swap.a ? -1 : 1) * barH * BOW * Math.sin(Math.PI * e);
    return spot;
  }
  return slotAt(slot, spot);
}

// ms after the tap tier t's wisp pops open (the picked one at once)
function openAt(p: Pick, t: number): number {
  if (t === p.picked) return 0;
  const others = [0, 1, 2].filter((o) => o !== p.picked);
  return OTHERS_MS[others.indexOf(t)];
}

// the bar on screen, false once its floor is gone
function place(p: Pick): boolean {
  const deps = spawnGameDeps();
  if (!deps || !barOnScreen(deps, p.floor, bar)) return false;
  const box = getIncomeBarBox(p.isGround);
  barW = box.width;
  barH = box.height;
  return true;
}

function canTap(p: Pick, now: number): boolean {
  const age = now - p.bornAt;
  return (
    p.pickedAt < 0 &&
    age >= p.shuffledAt &&
    age < CONFIG.randomSpawns.pickMe.durationMs
  );
}

// the tier whose wisp (x, y) is on, -1 if none; the nearest where the
// fingertip reaches overlap
function tierAt(p: Pick, x: number, y: number, now: number): number {
  const age = now - p.bornAt;
  let best = -1;
  let bestDistance = Infinity;
  for (let t = 0; t < TIERS.length; t++) {
    const at = wispAt(p, t, age);
    if (!at || !tapHits(x, y, at, barH * REACH)) continue;
    const distance = (x - at.x) ** 2 + (y - at.y) ** 2;
    if (distance < bestDistance) {
      best = t;
      bestDistance = distance;
    }
  }
  return best;
}

function hitTest(x: number, y: number, now: number): boolean {
  const p = pick;
  if (!p || !canTap(p, now) || !place(p)) return false;
  return tierAt(p, x, y, now) >= 0;
}

function press(x: number, y: number, now: number): boolean {
  const p = pick;
  if (!p || !canTap(p, now) || !place(p)) return false;
  const t = tierAt(p, x, y, now);
  if (t < 0) return false;
  p.picked = t;
  p.pickedAt = now;
  shakeScreen(BURST_SHAKE);
  playExplosion();
  playSpawnNotice();
  return true;
}

function land(p: Pick): void {
  const deps = spawnGameDeps();
  const { multiplier, color } = CRIT_TIER_CONFIG[TIERS[p.picked]];
  if (deps) giveLevels(deps, p.floor, multiplier, color);
  shakeScreen(LAND_SHAKE);
  playExplosion();
  playJackpot();
}

function update(now: number): void {
  if (pick) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) start(now);
}

function drawNumber(
  ctx: CanvasRenderingContext2D,
  t: number,
  at: Point,
  alpha: number,
  big = false,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  drawCritTextSprite(ctx, spriteFor(TIERS[t], big), at.x, at.y);
  ctx.restore();
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  _totalAtY: number,
  now: number,
): void {
  const p = pick;
  if (!p) return;
  screenW = w;
  if (!place(p)) {
    pick = null;
    return;
  }
  const age = now - p.bornAt;
  const picked = p.pickedAt >= 0;
  const since = picked ? now - p.pickedAt : -1;
  const landAt = HOLD_MS + DROP_MS;
  if (picked && since >= landAt + END_MS) {
    pick = null;
    return;
  }
  let fade = { alpha: 1, scale: 1 };
  if (!picked) {
    const { durationMs, pulseMs } = CONFIG.randomSpawns.pickMe;
    const msLeft = durationMs - age;
    if (isSpawnGone(msLeft)) {
      pick = null;
      return;
    }
    fade = spawnFade(msLeft, pulseMs, now);
  }
  while (p.swapped < p.swaps.length && age >= p.swaps[p.swapped].at) {
    playSpinTick(1 + p.swapped * 0.12);
    p.swapped++;
  }
  if (picked && !p.landed && since >= landAt) {
    p.landed = true;
    land(p);
  }
  while (picked && p.opened < OTHERS_MS.length && since >= OTHERS_MS[p.opened])
    playSpinTick(OTHER_TICK[p.opened++]);

  // the numbers popping up, until their wisps cover them
  for (let t = 0; t < TIERS.length; t++) {
    const coverAt = COVER_MS + t * COVER_STAGGER_MS;
    if (age >= coverAt) continue;
    drawNumber(
      ctx,
      t,
      slotAt(t, spot),
      clamp01((age - t * SHOW_STAGGER_MS) / SHOW_MS),
    );
  }

  // the wisps, a gold glow under each, until each pops open
  const live = (t: number) => !picked || since < openAt(p, t);
  ctx.save();
  ctx.globalAlpha = fade.alpha;
  ctx.globalCompositeOperation = "lighter";
  for (let t = 0; t < TIERS.length; t++) {
    const at = live(t) ? wispAt(p, t, age) : null;
    if (at)
      stampGlimmer(
        ctx,
        at.x,
        at.y,
        GLOW * fade.scale * (1 + 0.15 * Math.sin(now * 0.02 + t)),
        t,
        COLOR.heavenlyGold,
      );
  }
  ctx.restore();
  for (let t = 0; t < TIERS.length; t++) {
    if (!live(t)) continue;
    drawWisp(
      ctx,
      (ms) => wispAt(p, t, ms),
      age,
      now,
      WISP * fade.scale,
      0.5,
      fade.alpha,
    );
  }

  // what each wisp hid: the picked one's number held, then dropping onto
  // the bar; the others showing theirs and fading
  if (picked) {
    for (let t = 0; t < TIERS.length; t++) {
      const opened = since - openAt(p, t);
      if (opened < 0) continue;
      const openedSpot = wispAt(p, t, p.pickedAt - p.bornAt + openAt(p, t));
      if (!openedSpot) continue;
      from.x = openedSpot.x;
      from.y = openedSpot.y;
      if (t === p.picked) {
        // the burst under the number, so it doesn't hide it
        drawDetonation(ctx, from, opened, BURST_BLAST, now);
        if (since < landAt) {
          const u = clamp01((since - HOLD_MS) / DROP_MS) ** 2;
          spot.x = from.x;
          spot.y = lerp([from.y, bar.y], u);
          if (since < HOLD_MS)
            drawLightRays(ctx, spot.x, spot.y, barH * LIGHTS, 1, now);
          drawNumber(ctx, t, spot, 1, true);
        }
        spot.x = from.x;
        spot.y = bar.y;
        drawDetonation(ctx, spot, since - landAt, LAND_BLAST, now);
      } else {
        drawNumber(
          ctx,
          t,
          from,
          OTHER_ALPHA * (1 - clamp01(opened / OTHER_FADE_MS)),
        );
        drawDetonation(ctx, from, opened, OTHER_BLAST, now);
      }
    }
  }

  // each wisp landing on its number
  for (let t = 0; t < TIERS.length; t++)
    drawDetonation(
      ctx,
      slotAt(t, spot),
      age - COVER_MS - t * COVER_STAGGER_MS,
      COVER_BLAST,
      now,
    );
}

export default {
  force: forcePickMeSpawn,
  update,
  draw,
  press,
  hitTest,
} satisfies SpawnGame;
