// Floodgate, a lock crit: the number becomes a wisp that leads a river of
// coins up into a pool held behind a gate of light above the dark locked
// floor; the pool swells, sloshes and trembles as the wisp grips the gate and
// yanks it open in quickening tugs, each a jolt and a spurt of coins, until it
// bursts: the flood crashes down onto the lock with the wisp riding its front,
// pounding it until the floor bursts open, then pours on into the new button
// with a final splash: each of its next taps also pays out the two floors
// below it
import meta from "./meta";
import { defineTapPerk } from "../../../buttonCrits/buttonBonus";
import {
  beginCoinBatch,
  coinSpot,
  drawCoinBurstFrame,
  endCoinBatch,
  isCoinBatchOpen,
  queueCoinSpot,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// the wisp's dash from the flash to the gate, bowed BOW up
const LEAD_MS = 240;
const BOW = 220;
// the gate, from the lock's middle: GATE_W wide at GATE_Y, two doors hinged
// on its posts meeting in the middle, the wisp gripping under their tips
const GATE_Y = -290;
const GATE_W = 540;
const GATE_IN = 100;
const GRIP = 22;
const POST = 16;
// the feeding river: FEED_COINS coins set off from the flash over FEED_SPAN,
// thickening, each FEED_FLY ms into the pool
const FEED_START = IN_MS + 40;
const FEED_SPAN = 560;
const FEED_FLY = 240;
const FEED_COINS = 150;
const FEED_COIN = 22;
const FEED_SIDE = 26;
// the pool: POOL_COINS coins piled POOL_H tall over POOL_W, sloshing
const POOL_COINS = 170;
const POOL_W = 500;
const POOL_H = 190;
const POOL_COIN = 24;
const SLOSH = 14;
const SLOSH_F = 0.011;
const SWELL = 0.14;
const TREMBLE = 10;
// the tugs: TUGS of them, gaps quickening TUG_GAPS, each opening the doors
// TUG_ANG radians and snapping back over TUG_MS
const TUGS = 4;
const TUG_START = 560;
const TUG_GAPS: [number, number] = [160, 80];
const TUG_MS = 120;
const YANK = 28;
const TUG_ANG: [number, number] = [0.16, 0.4];
const SAG = 70;
// the flood: FLOOD_COINS coins out of the open gate, thickening, each
// FALL_MS onto the lock or (once swung) TO_BTN_MS onto the button
const FLOOD_COINS = 320;
const FLOOD_COIN: [number, number] = [20, 30];
const FALL_MS = 160;
const TO_BTN_MS = 180;
const SWING_MS = 110;
const POUR_MS = 170;
const SPREAD: [number, number] = [36, 70];
const ARCH = 60;
const COIN_SPIN = 0.03;
// the doors flung open and fading
const FLING_MS = 90;
const FLING_ANG = 1.75;
const FADE_MS = 200;
// the wisp riding the front, hopping between pounds
const WISP = WISP_SIZE * 1.3;
const RIDE = 30;
const HOP = 90;
const GLOW = 220;
// splashes: SPLASH_MS long, falling DROP px
const SPLASH_MS = 400;
const DROP = 240;
const POUND_FLASH_MS = 90;
const POUND_FLASH = 120;
const BURST_BLAST = 220;
const POUND_BLAST = 140;
const OPEN_BLAST = 440;
const REWARD_BLAST = 260;
// shakes by step: a tug or a pound, the floor bursting open, the button
const SHAKES = [0.7, 3.2, 1.6];

const LOCK = getLockCenter();
const BTN = getButtonCenter(false);
const BX = BTN.x - LOCK.x;
const BY = BTN.y - LOCK.y;
const HALF = GATE_W / 2;
const FEED_Y = GATE_Y - POOL_H * 0.7;

// the timeline
const TUG_AT = new Float32Array(TUGS);
let clock = TUG_START;
for (let k = 0; k < TUGS; k++) {
  TUG_AT[k] = clock;
  clock += lerp(TUG_GAPS[0], TUG_GAPS[1], k / (TUGS - 1));
}
const LEAD_END = IN_MS + LEAD_MS;
const BURST_AT = clock;
const HIT_LOCK = BURST_AT + FALL_MS;
const POUNDS = 3;
const POUND_AT = new Float32Array([HIT_LOCK, HIT_LOCK + 90, HIT_LOCK + 160]);
const OPEN_AT = HIT_LOCK + 215;
const SWING_START = OPEN_AT - FALL_MS;
const FRONT_AT = SWING_START + SWING_MS + TO_BTN_MS;
const POUR_END = SWING_START + SWING_MS + POUR_MS;
const REWARD_AT = POUR_END + TO_BTN_MS;

// each coin's look, by its index into the pool
const LOOKS = 1024;
const BILL = new Uint8Array(LOOKS);
const COS = new Float32Array(LOOKS);
const SIN = new Float32Array(LOOKS);
const SPIN_OFF = new Float32Array(LOOKS);
for (let i = 0; i < LOOKS; i++) {
  BILL[i] = holeHash(i, 8101) < 0.2 ? 1 : 0;
  const a = (holeHash(i, 8102) - 0.5) * Math.PI;
  COS[i] = Math.cos(a);
  SIN[i] = Math.sin(a);
  SPIN_OFF[i] = holeHash(i, 8103) * 12;
}
const FEED_LOOK = 0;
const POOL_LOOK = 160;
const FLOOD_LOOK = 340;
const SPLASH_LOOK = 680;

// the feeding coins: when each sets off and where it lands in the pool
const FEED_LAUNCH = new Float32Array(FEED_COINS);
const FEED_EX = new Float32Array(FEED_COINS);
const FEED_SX = new Float32Array(FEED_COINS);
for (let i = 0; i < FEED_COINS; i++) {
  FEED_LAUNCH[i] = FEED_START + FEED_SPAN * Math.sqrt(i / FEED_COINS);
  FEED_EX[i] = (holeHash(i, 8111) - 0.5) * POOL_W * 0.5;
  FEED_SX[i] = (holeHash(i, 8112) - 0.5) * 2 * FEED_SIDE;
}

// the pool's coins, bottom first: across, how high, and their slosh phase
const POOL_X = new Float32Array(POOL_COINS);
const POOL_UP = new Float32Array(POOL_COINS);
const POOL_PH = new Float32Array(POOL_COINS);
for (let i = 0; i < POOL_COINS; i++) {
  const x = (holeHash(i, 8121) - 0.5) * POOL_W;
  const lens = 0.3 + 0.7 * Math.sqrt(1 - ((2 * x) / POOL_W) ** 2);
  POOL_X[i] = x;
  POOL_UP[i] = 14 + ((i + holeHash(i, 8122)) / POOL_COINS) * POOL_H * lens;
  POOL_PH[i] = holeHash(i, 8123) * Math.PI * 2;
}

// the flood's coins: when each leaves the gate, from where, how big, and how
// far off its landing
const FLOOD_LAUNCH = new Float32Array(FLOOD_COINS);
const FLOOD_X = new Float32Array(FLOOD_COINS);
const FLOOD_SIZE = new Float32Array(FLOOD_COINS);
const FLOOD_SIDE = new Float32Array(FLOOD_COINS);
for (let i = 0; i < FLOOD_COINS; i++) {
  const p = i / FLOOD_COINS;
  FLOOD_LAUNCH[i] = BURST_AT + (POUR_END - BURST_AT) * Math.sqrt(p);
  FLOOD_X[i] = (holeHash(i, 8131) - 0.5) * GATE_W * 0.75;
  FLOOD_SIZE[i] = lerp(FLOOD_COIN[0], FLOOD_COIN[1], p);
  FLOOD_SIDE[i] = (holeHash(i, 8132) - 0.5) * 2 * lerp(SPREAD[0], SPREAD[1], p);
}

// the splashes: when, where, and each coin's flight out
const SPLASH_AT: number[] = [];
const SPLASH_X: number[] = [];
const SPLASH_Y: number[] = [];
const SPLASH_FIRST: number[] = [];
const SPLASH_SIZE: number[] = [];
const SPLASH_DX = new Float32Array(320);
const SPLASH_DY = new Float32Array(320);
let splashCoins = 0;
const addSplash = (
  at: number,
  x: number,
  y: number,
  n: number,
  reach: number,
  aim: number,
  spread: number,
  size: number,
) => {
  SPLASH_AT.push(at);
  SPLASH_X.push(x);
  SPLASH_Y.push(y);
  SPLASH_FIRST.push(splashCoins);
  SPLASH_SIZE.push(size);
  for (let j = 0; j < n; j++, splashCoins++) {
    const a = aim + (holeHash(splashCoins, 8141) - 0.5) * 2 * spread;
    const r = reach * (0.35 + 0.65 * holeHash(splashCoins, 8142));
    SPLASH_DX[splashCoins] = Math.cos(a) * r;
    SPLASH_DY[splashCoins] = Math.sin(a) * r;
  }
};
// spurts through the gap on each tug, coins thrown back up off each pound
for (let k = 0; k < TUGS; k++) {
  const p = k / (TUGS - 1);
  addSplash(
    TUG_AT[k] + 30,
    0,
    GATE_Y + 10,
    Math.round(lerp(8, 20, p)),
    lerp(150, 250, p),
    Math.PI / 2,
    0.45,
    lerp(18, 22, p),
  );
}
for (let k = 0; k < POUNDS; k++)
  addSplash(POUND_AT[k], 0, 0, 18 + 6 * k, 200 + 50 * k, -Math.PI / 2, 1.2, 22);
addSplash(OPEN_AT, 0, 0, 70, 460, 0, Math.PI, 26);
addSplash(REWARD_AT, BX, BY, 50, 330, -Math.PI / 2, 1.8, 24);
SPLASH_FIRST.push(splashCoins);
const SPLASHES = SPLASH_AT.length;

const ORIGIN: Point = { x: 0, y: 0 };
const GATE_MID: Point = { x: 0, y: GATE_Y };
const BUTTON: Point = { x: BX, y: BY };
const shake: Point = { x: 0, y: 0 };
const wispSpot: Point = { x: 0, y: 0 };
const fallback: CoinBurstSprite = {
  kind: "coin",
  spinFrame: 0,
  axisAngle: 0,
  axisCos: 1,
  axisSin: 0,
};

interface State {
  charge: Charge;
  // the flash, from the lock's middle, and the lead's bend
  fx: number;
  fy: number;
  cx: number;
  cy: number;
}
const states = new WeakMap<Running, State>();
// the playing crit's state, for the wisp's path
let live: State | null = null;

// how far a tug at age ms has the doors open (0..1): a yank then a snap back
function tugAt(age: number): number {
  if (age < 0 || age >= TUG_MS) return 0;
  return age < 30 ? age / 30 : (1 - (age - 30) / (TUG_MS - 30)) ** 2;
}

// the doors' angle down off their posts before the burst, and their flare
let flare = 0;
function doorsAt(ms: number, c: number): number {
  let a = c * 0.05;
  flare = 0;
  for (let k = 0; k < TUGS; k++) {
    const e = tugAt(ms - TUG_AT[k]);
    if (e <= 0) continue;
    a += lerp(TUG_ANG[0], TUG_ANG[1], k / (TUGS - 1)) * e;
    if (e > flare) flare = e;
  }
  return a;
}

// the wisp: dashing in, gripping the doors' tips, riding the flood's front,
// hopping on the lock, then onto the button
function wispAt(ms: number): Point | null {
  if (ms < IN_MS || ms > REWARD_AT || !live) return null;
  const s = live;
  if (ms < LEAD_END) {
    const u = (ms - IN_MS) / LEAD_MS;
    const e = u * (1.3 - 0.3 * u);
    const v = 1 - e;
    wispSpot.x = v * v * s.fx + 2 * v * e * s.cx;
    wispSpot.y = v * v * s.fy + 2 * v * e * s.cy + e * e * (GATE_Y + GRIP);
    return wispSpot;
  }
  if (ms < BURST_AT) {
    const c = chargeAt(s.charge, ms);
    trembleAt(c, ms, TREMBLE, wispSpot);
    const a = doorsAt(ms, c);
    wispSpot.y += GATE_Y + GRIP + Math.sin(a) * HALF + YANK * flare;
    return wispSpot;
  }
  if (ms < HIT_LOCK) {
    const u = (ms - BURST_AT) / FALL_MS;
    wispSpot.x = 0;
    wispSpot.y = lerp(GATE_Y + GRIP, -RIDE, u * (0.45 + 0.55 * u));
    return wispSpot;
  }
  if (ms < OPEN_AT) {
    let k = POUNDS - 1;
    while (k > 0 && ms < POUND_AT[k]) k--;
    const next = k + 1 < POUNDS ? POUND_AT[k + 1] : OPEN_AT;
    const f = (ms - POUND_AT[k]) / (next - POUND_AT[k]);
    wispSpot.x = 0;
    wispSpot.y = -RIDE - HOP * (1 - 0.25 * k) * 4 * f * (1 - f);
    return wispSpot;
  }
  if (ms < FRONT_AT) {
    const u = (ms - OPEN_AT) / (FRONT_AT - OPEN_AT);
    wispSpot.x = BX * u;
    wispSpot.y = lerp(-RIDE, BY - RIDE, u) - ARCH * 4 * u * (1 - u);
    return wispSpot;
  }
  // pounded by the pour, plunging in as it ends
  const u = (ms - FRONT_AT) / (REWARD_AT - FRONT_AT);
  wispSpot.x = BX;
  wispSpot.y = BY - RIDE * (1 - u * u) + Math.sin(ms * 0.09) * 6;
  return wispSpot;
}

// one coin from the looks at coinSpot's x, y, radius, alpha and spin
function stampCoin(
  ctx: CanvasRenderingContext2D,
  i: number,
  base: DOMMatrix,
  batched: boolean,
): void {
  const p = i & (LOOKS - 1);
  coinSpot[4] += SPIN_OFF[p];
  coinSpot[5] = COS[p];
  coinSpot[6] = SIN[p];
  if (batched) {
    queueCoinSpot(ctx, BILL[p] === 1, base);
    return;
  }
  fallback.kind = BILL[p] === 1 ? "bill" : "coin";
  fallback.spinFrame = coinSpot[4];
  fallback.axisCos = COS[p];
  fallback.axisSin = SIN[p];
  ctx.globalAlpha = coinSpot[3];
  drawCoinBurstFrame(
    ctx,
    fallback,
    coinSpot[0],
    coinSpot[1],
    coinSpot[2],
    base,
  );
  ctx.globalAlpha = 1;
}

// the gate's two doors swung a radians down off their posts
function drawGate(
  ctx: CanvasRenderingContext2D,
  a: number,
  grow: number,
  alpha: number,
  glow: number,
): void {
  const half = HALF * grow;
  const dx = Math.cos(a) * half;
  const dy = Math.sin(a) * half;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-HALF, GATE_Y);
  ctx.lineTo(-HALF + dx, GATE_Y + dy);
  ctx.moveTo(HALF, GATE_Y);
  ctx.lineTo(HALF - dx, GATE_Y + dy);
  const w = 1 + 0.7 * glow;
  ctx.globalAlpha = alpha * 0.35;
  ctx.strokeStyle = "#ffb52e";
  ctx.lineWidth = 30 * w;
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.7;
  ctx.strokeStyle = "#ffe066";
  ctx.lineWidth = 13 * w;
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#fffbe6";
  ctx.lineWidth = 5 * w;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-HALF, GATE_Y, POST * w, 0, Math.PI * 2);
  ctx.moveTo(HALF + POST * w, GATE_Y);
  ctx.arc(HALF, GATE_Y, POST * w, 0, Math.PI * 2);
  ctx.fillStyle = "#ffe066";
  ctx.fill();
  ctx.restore();
}

// each tap also paying out the two open floors below
const floodTaps = defineTapPerk("Flood", (t) => {
  const k = t.floors.indexOf(t.floor);
  for (let d = 1; d <= 2; d++) {
    const below = t.floors[k - d];
    if (below?.unlocked) t.payout(below, 1);
  }
});

registerFloorCrit("floodgateCrit", {
  reward(t) {
    floodTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const fx = -bars[0].x;
    const fy = -bars[0].y;
    states.set(r, {
      charge: planCharge(LEAD_END, BURST_AT - LEAD_END, {
        bang: false,
        climaxShake: 0.8,
        shake: [0.05, 0.6],
        everyMs: [170, 50],
      }),
      fx,
      fy,
      cx: fx / 2,
      cy: Math.min(fy, FEED_Y) - BOW,
    });
    for (let k = 0; k < TUGS; k++) hit(0, TUG_AT[k] + 30, 0);
    hit(0, BURST_AT, 0);
    for (let k = 0; k < POUNDS; k++) hit(0, POUND_AT[k], 0);
    hit(0, OPEN_AT, 1);
    hit(0, FRONT_AT, 0);
    hit(0, REWARD_AT, 2);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    live = s;
    tickCharge(s.charge, ms, r.shake);
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    ctx.save();
    ctx.translate(lock.x, lock.y);
    const c = chargeAt(s.charge, ms);
    const doors = ms < BURST_AT ? doorsAt(ms, c) : doorsAt(BURST_AT, 1);
    const tug = ms < BURST_AT ? flare : 0;
    // how full the pool is, and how much of it has poured out
    const filled = clamp01((ms - FEED_START - FEED_FLY + 40) / FEED_SPAN) ** 2;
    const drained = clamp01((ms - BURST_AT) / (POUR_END - BURST_AT));
    const pooled = Math.floor(POOL_COINS * filled * (1 - drained));
    trembleAt(c, ms, TREMBLE, shake);
    const swell = 1 + SWELL * c;
    const sag = Math.sin(doors) * SAG;
    if (pooled > 0) {
      const h = (POOL_H * filled * swell + 20) * (1 - 0.6 * drained);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.2 + 0.25 * c;
      ctx.fillStyle = "#ffb52e";
      ctx.beginPath();
      ctx.ellipse(
        shake.x,
        GATE_Y - h / 2 + shake.y + sag * 0.5,
        (POOL_W / 2) * swell * (1 - 0.4 * drained) + 20,
        h / 2 + 10,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }
    const wisp = wispAt(ms);
    if (wisp && ms < OPEN_AT) drawChargeGlow(ctx, wisp, c, GLOW, now);
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    const batched = isCoinBatchOpen(ctx);
    const spin = ms * COIN_SPIN;
    // the river fed in from the flash
    if (ms >= FEED_START && ms < FEED_START + FEED_SPAN + FEED_FLY) {
      for (let i = 0; i < FEED_COINS; i++) {
        const age = ms - FEED_LAUNCH[i];
        if (age < 0) break;
        if (age >= FEED_FLY) continue;
        const u = age / FEED_FLY;
        const e = u * (0.6 + 0.4 * u);
        const v = 1 - e;
        coinSpot[0] =
          v * v * s.fx + 2 * v * e * s.cx + e * e * FEED_EX[i] + FEED_SX[i] * v;
        coinSpot[1] = v * v * s.fy + 2 * v * e * s.cy + e * e * FEED_Y;
        coinSpot[2] = FEED_COIN;
        coinSpot[3] = 1;
        coinSpot[4] = spin;
        stampCoin(ctx, FEED_LOOK + i, base, batched);
      }
    }
    // the pool behind the gate, sloshing harder as it strains, lurching on
    // each tug and sinking as it pours out
    const slosh = SLOSH * (0.4 + c + 1.5 * tug);
    const squeeze = 1 - 0.5 * drained;
    for (let i = 0; i < pooled; i++) {
      const ph = ms * SLOSH_F + POOL_PH[i];
      const up = POOL_UP[i] / POOL_H;
      coinSpot[0] =
        POOL_X[i] * swell * squeeze + Math.sin(ph) * slosh + shake.x;
      coinSpot[1] =
        GATE_Y -
        POOL_UP[i] * swell * (1 - 0.6 * drained) +
        Math.cos(ph * 1.3) * 6 +
        sag * (1 - up) +
        shake.y;
      coinSpot[2] = POOL_COIN;
      coinSpot[3] = 1;
      coinSpot[4] = spin * 0.6;
      stampCoin(ctx, POOL_LOOK + i, base, batched);
    }
    // the flood down onto the lock, then swinging onto the button
    if (ms >= BURST_AT && ms < REWARD_AT) {
      for (let i = 0; i < FLOOD_COINS; i++) {
        const at = FLOOD_LAUNCH[i];
        const age = ms - at;
        if (age < 0) break;
        const s0 = clamp01((at - SWING_START) / SWING_MS);
        const sw = s0 * s0 * (3 - 2 * s0);
        const flight = lerp(FALL_MS, TO_BTN_MS, sw);
        if (age >= flight) continue;
        const u = age / flight;
        const e = u * (0.45 + 0.55 * u);
        const tx = BX * sw + FLOOD_SIDE[i];
        coinSpot[0] = FLOOD_X[i] + (tx - FLOOD_X[i]) * u;
        coinSpot[1] =
          GATE_Y + (BY * sw - GATE_Y) * e - ARCH * 4 * u * (1 - u) * sw;
        coinSpot[2] = FLOOD_SIZE[i];
        coinSpot[3] = 1;
        coinSpot[4] = spin;
        stampCoin(ctx, FLOOD_LOOK + i, base, batched);
      }
    }
    // spurts through the gap, coins thrown off the lock and the button
    for (let k = 0; k < SPLASHES; k++) {
      const age = ms - SPLASH_AT[k];
      if (age < 0 || age >= SPLASH_MS) continue;
      const u = age / SPLASH_MS;
      const out = 1 - (1 - u) ** 3;
      const fall = DROP * u * u;
      const size = SPLASH_SIZE[k] * (1 - 0.3 * u);
      const alpha = 1 - u * u * u;
      const x = SPLASH_X[k];
      const y = SPLASH_Y[k];
      for (let j = SPLASH_FIRST[k]; j < SPLASH_FIRST[k + 1]; j++) {
        coinSpot[0] = x + SPLASH_DX[j] * out;
        coinSpot[1] = y + SPLASH_DY[j] * out + fall;
        coinSpot[2] = size;
        coinSpot[3] = alpha;
        coinSpot[4] = spin * 1.5;
        stampCoin(ctx, SPLASH_LOOK + j, base, batched);
      }
    }
    endCoinBatch(ctx);
    // the gate: growing in, flaring on each tug, flung open at the burst
    if (ms >= FEED_START && ms < BURST_AT + FLING_MS + FADE_MS) {
      const grow = clamp01((ms - FEED_START) / GATE_IN);
      if (ms < BURST_AT) drawGate(ctx, doors, grow, 1, tug + 0.3 * c);
      else {
        const u = clamp01((ms - BURST_AT) / FLING_MS);
        drawGate(
          ctx,
          lerp(doors, FLING_ANG, 1 - (1 - u) ** 2),
          1,
          1 - clamp01((ms - BURST_AT - FLING_MS) / FADE_MS),
          1,
        );
      }
    }
    const ride = clamp01((ms - BURST_AT) / (OPEN_AT - BURST_AT));
    drawWispBetween(
      ctx,
      wispAt,
      ms,
      now,
      WISP * (1 + 0.5 * c * (1 - ride) + 0.6 * ride),
      Math.max(c, ride),
      IN_MS,
      REWARD_AT,
    );
    // a white flash on the lock at each pound
    for (let k = 0; k < POUNDS; k++) {
      const age = ms - POUND_AT[k];
      if (age < 0 || age >= POUND_FLASH_MS) continue;
      const u = age / POUND_FLASH_MS;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (1 - u) * 0.8;
      ctx.fillStyle = "#fff6d0";
      ctx.beginPath();
      ctx.arc(0, 0, POUND_FLASH * (0.5 + u) * (1 + 0.3 * k), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawDetonation(ctx, GATE_MID, ms - BURST_AT, BURST_BLAST, now);
    drawDetonation(ctx, ORIGIN, ms - HIT_LOCK, POUND_BLAST, now);
    drawDetonation(ctx, ORIGIN, ms - OPEN_AT, OPEN_BLAST, now);
    drawDetonation(ctx, BUTTON, ms - REWARD_AT, REWARD_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
