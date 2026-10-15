// Water Cannon, a lock crit: the number arcs up beside the dark locked floor
// and becomes a wisp that drinks: rivers of coins stream up into it from the
// bar below, a trickle then a flood, the wisp swelling, trembling and glowing
// hotter; then it fires the river into the lock as a jet, in pulses that hit
// harder and quicker, each slamming coins back off the lock and kicking the
// wisp back, until one full-pressure blast bursts the floor open and the jet
// swings on into its new button with a final blast: each of its next taps
// also levels the floor below it
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
import { FLOOR_H } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
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

const IN_MS = 140;
const ARC_RISE = 110;
// the wisp hovers here, from the lock's middle
const WX = -330;
const WY = -150;
// drinking: DRINK_COINS coins set off from the bar below over DRINK_SPAN,
// thickening (a trickle, then a flood), each DRINK_FLY ms up to the wisp
const DRINK_START = 120;
const DRINK_SPAN = 440;
const DRINK_FLY = 210;
const DRINK_COINS = 260;
const DRINK_COIN = 24;
// the rivers: where they leave the bar (its share across) and how far each
// bows out on the way up
const RIVER_AT = [0.15, 0.5, 0.85];
const RIVER_BOW = [-260, -60, 170];
const SOURCE_JITTER = 50;
const RIVER_WIDTH = 26;
// firing: PULSES slugs of coins, gaps quickening PULSE_GAPS, each fired over
// SLUG_MS; the jet's flight onto the lock and (once swung) onto the button
const PULSES = 4;
const PULSE_GAPS: [number, number] = [190, 100];
const SLUG_MS = 50;
const SLUG_COINS: [number, number] = [16, 36];
const SLUG_COIN: [number, number] = [20, 27];
const JET_LOCK_MS = 100;
const JET_BUTTON_MS = 170;
const JET_ARCH = 40;
const JET_SPREAD = 22;
// then a steady full-pressure stream: BLAST_MS hammering the lock until it
// bursts, SWING_MS swinging onto the button, POUR_MS pouring into it
const BLAST_MS = 170;
const STREAM_EVERY = 3.2;
const STREAM_COIN = 30;
const SWING_MS = 120;
const POUR_MS = 160;
const COIN_SPIN = 0.03;
// the wisp: its size swelling as it drinks, trembling, kicked back RECOIL px
// by each pulse
const WISP = WISP_SIZE * 1.2;
const SWELL = 1.4;
const TREMBLE = 14;
const RECOIL = 40;
const RECOIL_MS = 110;
const GLOW = 240;
// coins slammed back off what the jet hits, SPLASH_MS long, falling DROP px
const SPLASH_MS = 420;
const DROP = 220;
const MUZZLE: [number, number] = [50, 90];
const IMPACT: [number, number] = [80, 170];
const BLAST_HIT = 180;
const OPEN_BLAST = 440;
const REWARD_BLAST = 260;
// shakes by step: a pulse on the lock, it bursting open, the button
const SHAKES = [0.9, 3.2, 1.5];

const LOCK = getLockCenter();
const BOX = getIncomeBarBox(false);
const BELOW_Y = BOX.y + BOX.height / 2 - LOCK.y + FLOOR_H;
const BTN = getButtonCenter(false);
const BX = BTN.x - LOCK.x;
const BY = BTN.y - LOCK.y;
const JET_LEN = Math.hypot(WX, WY);
// the jet's way onto the lock, and across it
const DX = -WX / JET_LEN;
const DY = -WY / JET_LEN;

// the timeline
const PULSE_AT = new Float32Array(PULSES);
const PULSE_HIT = new Float32Array(PULSES);
let clock = DRINK_START + DRINK_SPAN + DRINK_FLY;
for (let k = 0; k < PULSES; k++) {
  PULSE_AT[k] = clock;
  PULSE_HIT[k] = clock + SLUG_MS / 2 + JET_LOCK_MS;
  clock += lerp(PULSE_GAPS[0], PULSE_GAPS[1], k / (PULSES - 1));
}
const BLAST_START = clock;
const OPEN_AT = BLAST_START + JET_LOCK_MS + BLAST_MS;
const SWING_START = OPEN_AT - JET_LOCK_MS;
const POUR_END = SWING_START + SWING_MS + POUR_MS;
const REWARD_AT = POUR_END + JET_BUTTON_MS;

// each coin's look, by its index into the pool
const POOL = 1024;
const BILL = new Uint8Array(POOL);
const COS = new Float32Array(POOL);
const SIN = new Float32Array(POOL);
const SPIN_OFF = new Float32Array(POOL);
for (let i = 0; i < POOL; i++) {
  BILL[i] = holeHash(i, 7301) < 0.2 ? 1 : 0;
  const a = (holeHash(i, 7302) - 0.5) * Math.PI;
  COS[i] = Math.cos(a);
  SIN[i] = Math.sin(a);
  SPIN_OFF[i] = holeHash(i, 7303) * 12;
}

// the drinking coins: when each sets off, its river and its place in it
const DRINK_LAUNCH = new Float32Array(DRINK_COINS);
const DRINK_SX = new Float32Array(DRINK_COINS);
const DRINK_CX = new Float32Array(DRINK_COINS);
const DRINK_SIDE = new Float32Array(DRINK_COINS);
const DRINK_CY = (BELOW_Y + WY) / 2;
for (let i = 0; i < DRINK_COINS; i++) {
  DRINK_LAUNCH[i] = DRINK_START + DRINK_SPAN * Math.sqrt(i / DRINK_COINS);
  const river = i % RIVER_AT.length;
  const sx =
    BOX.x -
    LOCK.x +
    BOX.width * RIVER_AT[river] +
    (holeHash(i, 7311) - 0.5) * 2 * SOURCE_JITTER;
  DRINK_SX[i] = sx;
  DRINK_CX[i] = (sx + WX) / 2 + RIVER_BOW[river];
  DRINK_SIDE[i] = (holeHash(i, 7312) - 0.5) * 2 * RIVER_WIDTH;
}

// the jet's coins: when each fires, how big, and how far off the jet's line
const JET_MAX = 320;
const JET_LAUNCH = new Float32Array(JET_MAX);
const JET_COIN = new Float32Array(JET_MAX);
const JET_SIDE = new Float32Array(JET_MAX);
let jetCoins = 0;
const addJet = (at: number, size: number) => {
  JET_LAUNCH[jetCoins] = at;
  JET_COIN[jetCoins] = size;
  JET_SIDE[jetCoins] = (holeHash(jetCoins, 7321) - 0.5) * 2 * JET_SPREAD;
  jetCoins++;
};
for (let k = 0; k < PULSES; k++) {
  const p = k / (PULSES - 1);
  const n = Math.round(lerp(SLUG_COINS[0], SLUG_COINS[1], p));
  const size = lerp(SLUG_COIN[0], SLUG_COIN[1], p);
  for (let j = 0; j < n; j++) addJet(PULSE_AT[k] + (SLUG_MS * j) / n, size);
}
for (let at = BLAST_START; at < POUR_END && jetCoins < JET_MAX; ) {
  addJet(at, STREAM_COIN);
  at += STREAM_EVERY;
}
const JET_COINS = jetCoins;

// the splashes: when, where, and each coin's flight out
const SPLASH_AT: number[] = [];
const SPLASH_X: number[] = [];
const SPLASH_Y: number[] = [];
const SPLASH_FIRST: number[] = [];
const SPLASH_SIZE: number[] = [];
const SPLASH_DX = new Float32Array(512);
const SPLASH_DY = new Float32Array(512);
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
    const a = aim + (holeHash(splashCoins, 7331) - 0.5) * 2 * spread;
    const r = reach * (0.35 + 0.65 * holeHash(splashCoins, 7332));
    SPLASH_DX[splashCoins] = Math.cos(a) * r;
    SPLASH_DY[splashCoins] = Math.sin(a) * r;
  }
};
// back off the lock towards the wisp, tipped up
const BACK = Math.atan2(WY, WX) + 0.3;
for (let k = 0; k < PULSES; k++) {
  const p = k / (PULSES - 1);
  addSplash(
    PULSE_HIT[k],
    0,
    0,
    Math.round(lerp(14, 30, p)),
    lerp(200, 320, p),
    BACK,
    1.4,
    lerp(18, 24, p),
  );
}
addSplash(OPEN_AT, 0, 0, 70, 460, 0, Math.PI, 26);
addSplash(REWARD_AT, BX, BY, 50, 340, -Math.PI / 2, 1.9, 24);
SPLASH_FIRST.push(splashCoins);
const SPLASHES = SPLASH_AT.length;

const ORIGIN: Point = { x: 0, y: 0 };
const MOUTH: Point = { x: WX, y: WY };
const BUTTON: Point = { x: BX, y: BY };
const wispSpot: Point = { x: 0, y: 0 };
const fallback: CoinBurstSprite = {
  kind: "coin",
  spinFrame: 0,
  axisAngle: 0,
  axisCos: 1,
  axisSin: 0,
};

const charges = new WeakMap<Running, Charge>();
// the playing crit's charge, for the wisp's path
let live: Charge | null = null;

// how much it has drunk (0..1) and how much of that it has fired since opening
const drunkAt = (ms: number) =>
  clamp01((ms - DRINK_START - DRINK_FLY) / DRINK_SPAN) ** 2;
const spentAt = (ms: number) => clamp01((ms - OPEN_AT) / (POUR_END - OPEN_AT));

// the wisp, trembling as it charges and kicked back by every pulse
function wispAt(ms: number): Point | null {
  if (ms < IN_MS || ms > POUR_END) return null;
  trembleAt(live ? chargeAt(live, ms) : 0, ms, TREMBLE, wispSpot);
  let kick = ms >= BLAST_START ? RECOIL * 0.6 : 0;
  for (let k = 0; k < PULSES; k++) {
    const age = ms - PULSE_AT[k];
    if (age >= 0 && age < RECOIL_MS)
      kick +=
        RECOIL * (0.6 + (0.4 * k) / (PULSES - 1)) * (1 - age / RECOIL_MS) ** 2;
  }
  wispSpot.x += WX - DX * kick;
  wispSpot.y += WY - DY * kick;
  return wispSpot;
}

// one coin from the pool at coinSpot's x, y, radius, alpha and spin
function stampCoin(
  ctx: CanvasRenderingContext2D,
  i: number,
  base: DOMMatrix,
  batched: boolean,
): void {
  const p = i & (POOL - 1);
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

// each tap also levelling the floor below
const cannonTaps = defineTapPerk("Cannon", (t) => {
  const below = t.floors[t.floors.indexOf(t.floor) - 1];
  if (below?.unlocked) t.levelUp(below, 1, "+1 Lvl");
});

registerFloorCrit("waterCannonCrit", {
  reward(t) {
    cannonTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    charges.set(
      r,
      planCharge(DRINK_START, OPEN_AT - DRINK_START, {
        bang: false,
        climaxShake: 0.6,
        shake: [0.05, 0.7],
        everyMs: [180, 45],
      }),
    );
    for (let k = 0; k < PULSES; k++) hit(0, PULSE_HIT[k], 0);
    hit(0, OPEN_AT, 1);
    hit(0, REWARD_AT, 2);
  },
  draw(ctx, r, ms, bars) {
    const charge = charges.get(r);
    if (!charge) return;
    live = charge;
    tickCharge(charge, ms, r.shake);
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        (lock.x + WX) * p,
        (lock.y + WY) * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
        { alpha: u < 0.7 ? 1 : (1 - u) / 0.3 },
      );
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    const drunk = drunkAt(ms);
    const spent = spentAt(ms);
    const wisp = wispAt(ms);
    if (wisp) {
      const c = chargeAt(charge, ms) * (1 - 0.7 * spent);
      drawChargeGlow(ctx, wisp, c, GLOW, now);
    }
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    const batched = isCoinBatchOpen(ctx);
    const spin = ms * COIN_SPIN;
    // the rivers up from the bar below into the wisp
    if (ms >= DRINK_START && ms < DRINK_START + DRINK_SPAN + DRINK_FLY) {
      const wx = wisp ? wisp.x : WX;
      const wy = wisp ? wisp.y : WY;
      for (let i = 0; i < DRINK_COINS; i++) {
        const age = ms - DRINK_LAUNCH[i];
        if (age < 0) break;
        if (age >= DRINK_FLY) continue;
        const u = age / DRINK_FLY;
        const e = u * (0.6 + 0.4 * u);
        const v = 1 - e;
        const a = v * v;
        const b = 2 * v * e;
        const c = e * e;
        coinSpot[0] =
          a * DRINK_SX[i] + b * DRINK_CX[i] + c * wx + DRINK_SIDE[i] * v;
        coinSpot[1] = a * BELOW_Y + b * DRINK_CY + c * wy;
        coinSpot[2] = DRINK_COIN * (1 - 0.45 * e);
        coinSpot[3] = 1;
        coinSpot[4] = spin + SPIN_OFF[i & (POOL - 1)];
        stampCoin(ctx, i, base, batched);
      }
    }
    // the jet, onto the lock, then swinging onto the button
    if (ms >= PULSE_AT[0] && ms < REWARD_AT) {
      for (let i = 0; i < JET_COINS; i++) {
        const at = JET_LAUNCH[i];
        const age = ms - at;
        if (age < 0) break;
        const s0 = clamp01((at - SWING_START) / SWING_MS);
        const s = s0 * s0 * (3 - 2 * s0);
        const flight = lerp(JET_LOCK_MS, JET_BUTTON_MS, s);
        if (age >= flight) continue;
        const u = age / flight;
        const tx = BX * s;
        const ty = BY * s;
        const side = JET_SIDE[i] * u;
        coinSpot[0] = WX + (tx - WX) * u - DY * side;
        coinSpot[1] =
          WY + (ty - WY) * u + DX * side - JET_ARCH * 4 * u * (1 - u);
        coinSpot[2] = JET_COIN[i];
        coinSpot[3] = 1;
        coinSpot[4] = spin + SPIN_OFF[(i + DRINK_COINS) & (POOL - 1)];
        stampCoin(ctx, i + DRINK_COINS, base, batched);
      }
    }
    // coins slammed back off the lock and the button
    for (let s = 0; s < SPLASHES; s++) {
      const age = ms - SPLASH_AT[s];
      if (age < 0 || age >= SPLASH_MS) continue;
      const u = age / SPLASH_MS;
      const out = 1 - (1 - u) ** 3;
      const fall = DROP * u * u;
      const size = SPLASH_SIZE[s] * (1 - 0.3 * u);
      const alpha = 1 - u * u * u;
      const x = SPLASH_X[s];
      const y = SPLASH_Y[s];
      for (let j = SPLASH_FIRST[s]; j < SPLASH_FIRST[s + 1]; j++) {
        coinSpot[0] = x + SPLASH_DX[j] * out;
        coinSpot[1] = y + SPLASH_DY[j] * out + fall;
        coinSpot[2] = size;
        coinSpot[3] = alpha;
        coinSpot[4] = spin * 1.5 + SPIN_OFF[(j + 600) & (POOL - 1)];
        stampCoin(ctx, j + 600, base, batched);
      }
    }
    endCoinBatch(ctx);
    drawWispBetween(
      ctx,
      wispAt,
      ms,
      now,
      WISP * (1 + SWELL * drunk) * (1 - 0.6 * spent),
      drunk,
      IN_MS,
      POUR_END,
    );
    for (let k = 0; k < PULSES; k++) {
      const p = k / (PULSES - 1);
      const muzzle = lerp(MUZZLE[0], MUZZLE[1], p);
      const impact = lerp(IMPACT[0], IMPACT[1], p);
      drawDetonation(ctx, MOUTH, ms - PULSE_AT[k], muzzle, now);
      drawDetonation(ctx, ORIGIN, ms - PULSE_HIT[k], impact, now);
    }
    drawDetonation(ctx, ORIGIN, ms - BLAST_START - JET_LOCK_MS, BLAST_HIT, now);
    drawDetonation(ctx, ORIGIN, ms - OPEN_AT, OPEN_BLAST, now);
    drawDetonation(ctx, BUTTON, ms - REWARD_AT, REWARD_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
