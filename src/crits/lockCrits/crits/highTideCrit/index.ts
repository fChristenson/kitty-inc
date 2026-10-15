// High Tide, a lock crit: the number dives into a sea of coins rising up the
// building under the dark locked floor; wave after quickening wave surges up
// and slams the lock from below, each a splash of surf and a jolt, the sea
// rumbling higher, until the biggest wave crashes right over the lock and
// bursts it open; the tide then surges into the new floor's bar in quick
// waves, each one paying it out, and drains away
import meta from "./meta";
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
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const LOCK = getLockCenter();
const BOX = getIncomeBarBox(false);
// the new floor's bar, from the lock's middle
const BX = BOX.x + BOX.width / 2 - LOCK.x;
const BY = BOX.y + BOX.height / 2 - LOCK.y;

const IN_MS = 150;
// the sea's level (its surface's rest, from the lock's middle): deep below,
// rushing up to SEA_MID by the first wave, creeping up to SEA_HIGH (just under
// the locked floor) by the crash, then draining back down
const START_MS = 60;
const SEA_FROM = 1150;
const SEA_MID = 520;
const SEA_HIGH = 390;
const DEPTH = 300;
// the sea's coins: COLS columns of ROWS, packed towards the surface
const SEA_HALF = LOCK.x - 20;
const COLS = 28;
const ROWS = 14;
const COIN_R = 24;
const WOBBLE = 6;
const WOBBLE_F = 0.011;
const SWELL = 22;
const SWELL_K = 0.011;
const SWELL_F = 0.013;
const FADE_IN_MS = 120;
// the waves slamming the lock: gaps quickening, each rising faster, cresting
// closer up under the lock
const WAVES = 4;
const FIRST_WAVE = 360;
const WAVE_GAPS: [number, number] = [250, 130];
const WAVE_RISE: [number, number] = [180, 110];
const WAVE_FALL = 200;
const WAVE_PEAK: [number, number] = [55, 15];
const WAVE_WIDTH: [number, number] = [220, 270];
// the big one, cresting right over the lock
const BIG_GAP = 200;
const BIG_RISE = 190;
const BIG_FALL = 260;
const BIG_PEAK = -260;
const BIG_WIDTH = 300;
// the surges into the new bar
const PAY_DELAY = 170;
const PAY_GAP = 100;
const SURGE_RISE = 90;
const SURGE_FALL = 130;
const SURGE_WIDTH = 200;
const DRAIN_DELAY = 60;
const DRAIN_MS = 240;
// the lock's price jolted up by each wave, washed white
const JOLT: [number, number] = [22, 46];
const JOLT_MS = 140;
const TREMBLE = 9;
const GLOW = 260;
// splashes: SPLASH_MS long, falling DROP px
const SPLASH_MS = 420;
const DROP = 260;
const FLASH_MS = 110;
const OPEN_BLAST = 440;
const REWARD_BLAST = 240;
const COIN_SPIN = 0.03;
// shakes by step: a wave slamming the lock, it bursting open, a surge
const SHAKES = [1, 3.2, 1.1];

// the timeline
const WAVE_AT = new Float32Array(WAVES);
let clock = FIRST_WAVE;
for (let k = 0; k < WAVES; k++) {
  WAVE_AT[k] = clock;
  if (k < WAVES - 1) clock += lerp(WAVE_GAPS[0], WAVE_GAPS[1], k / (WAVES - 2));
}
const OPEN_AT = clock + BIG_GAP;
const PAYOUTS = meta.values.payouts;
const PAY_AT = new Float32Array(PAYOUTS);
for (let k = 0; k < PAYOUTS; k++) PAY_AT[k] = OPEN_AT + PAY_DELAY + k * PAY_GAP;
const DRAIN_AT = PAY_AT[PAYOUTS - 1] + DRAIN_DELAY;
const END_MS = DRAIN_AT + DRAIN_MS;

// the swells: the waves, the big one and the surges, each rising to its
// crest at AT and falling back, a bell BUMP_X wide across
const BUMPS = WAVES + 1 + PAYOUTS;
const BUMP_AT = new Float32Array(BUMPS);
const BUMP_RISE = new Float32Array(BUMPS);
const BUMP_FALL = new Float32Array(BUMPS);
const BUMP_X = new Float32Array(BUMPS);
const BUMP_INV = new Float32Array(BUMPS);
const BUMP_PEAK = new Float32Array(BUMPS);
const addBump = (
  k: number,
  at: number,
  rise: number,
  fall: number,
  x: number,
  width: number,
  peak: number,
) => {
  BUMP_AT[k] = at;
  BUMP_RISE[k] = rise;
  BUMP_FALL[k] = fall;
  BUMP_X[k] = x;
  BUMP_INV[k] = 1 / (width * width);
  BUMP_PEAK[k] = peak;
};
for (let k = 0; k < WAVES; k++) {
  const p = k / (WAVES - 1);
  addBump(
    k,
    WAVE_AT[k],
    lerp(WAVE_RISE[0], WAVE_RISE[1], p),
    WAVE_FALL,
    0,
    lerp(WAVE_WIDTH[0], WAVE_WIDTH[1], p),
    lerp(WAVE_PEAK[0], WAVE_PEAK[1], p),
  );
}
addBump(WAVES, OPEN_AT, BIG_RISE, BIG_FALL, 0, BIG_WIDTH, BIG_PEAK);
for (let k = 0; k < PAYOUTS; k++)
  addBump(
    WAVES + 1 + k,
    PAY_AT[k],
    SURGE_RISE,
    SURGE_FALL,
    BX,
    SURGE_WIDTH,
    BY,
  );
// the swells up this frame and how far up each is
const ACTIVE = new Int32Array(BUMPS);
const ACTIVE_UP = new Float32Array(BUMPS);

// each coin's look, by its index into the pool
const LOOKS = 1024;
const BILL = new Uint8Array(LOOKS);
const COS = new Float32Array(LOOKS);
const SIN = new Float32Array(LOOKS);
const SPIN_OFF = new Float32Array(LOOKS);
const PHASE = new Float32Array(LOOKS);
for (let i = 0; i < LOOKS; i++) {
  BILL[i] = holeHash(i, 9101) < 0.2 ? 1 : 0;
  const a = (holeHash(i, 9102) - 0.5) * Math.PI;
  COS[i] = Math.cos(a);
  SIN[i] = Math.sin(a);
  SPIN_OFF[i] = holeHash(i, 9103) * 12;
  PHASE[i] = holeHash(i, 9104) * Math.PI * 2;
}
const SPLASH_LOOK = COLS * ROWS;

// the sea's columns and its coins' places down them
const COL_X = new Float32Array(COLS);
for (let c = 0; c < COLS; c++)
  COL_X[c] = -SEA_HALF + (2 * SEA_HALF * c) / (COLS - 1);
const COIN_DX = new Float32Array(COLS * ROWS);
for (let i = 0; i < COLS * ROWS; i++)
  COIN_DX[i] = (holeHash(i, 9111) - 0.5) * 18;
const ROW_T = new Float32Array(ROWS);
const ROW_ALPHA = new Float32Array(ROWS);
for (let r = 0; r < ROWS; r++) {
  ROW_T[r] = (r / (ROWS - 1)) ** 1.5;
  ROW_ALPHA[r] = Math.min(1, (ROWS - r) / 3.5);
}
const SURF = new Float32Array(COLS);

// the splashes: when, where, and each coin's flight out
const SPLASH_AT: number[] = [];
const SPLASH_X: number[] = [];
const SPLASH_Y: number[] = [];
const SPLASH_FIRST: number[] = [];
const SPLASH_SIZE: number[] = [];
const SPLASH_DX = new Float32Array(400);
const SPLASH_DY = new Float32Array(400);
let splashCoins = 0;
const addSplash = (
  at: number,
  x: number,
  y: number,
  n: number,
  reach: number,
  spread: number,
  size: number,
) => {
  SPLASH_AT.push(at);
  SPLASH_X.push(x);
  SPLASH_Y.push(y);
  SPLASH_FIRST.push(splashCoins);
  SPLASH_SIZE.push(size);
  for (let j = 0; j < n && splashCoins < SPLASH_DX.length; j++) {
    const a = -Math.PI / 2 + (holeHash(splashCoins, 9121) - 0.5) * 2 * spread;
    const r = reach * (0.35 + 0.65 * holeHash(splashCoins, 9122));
    SPLASH_DX[splashCoins] = Math.cos(a) * r;
    SPLASH_DY[splashCoins] = Math.sin(a) * r;
    splashCoins++;
  }
};
// surf thrown off each wave's crest under the lock, the big wave crashing
// over it both ways, spray off the bar on each surge
for (let k = 0; k < WAVES; k++) {
  const p = k / (WAVES - 1);
  addSplash(
    WAVE_AT[k],
    0,
    BUMP_PEAK[k],
    Math.round(lerp(16, 30, p)),
    lerp(190, 320, p),
    lerp(0.8, 1.2, p),
    lerp(20, 25, p),
  );
}
addSplash(OPEN_AT, 0, BIG_PEAK + 60, 90, 540, 1.55, 27);
for (let k = 0; k < PAYOUTS; k++)
  addSplash(PAY_AT[k], BX, BY, 18 + 4 * k, 220 + 30 * k, 1.1, 22);
SPLASH_FIRST.push(splashCoins);
const SPLASHES = SPLASH_AT.length;

const ORIGIN: Point = { x: 0, y: 0 };
const BAR: Point = { x: BX, y: BY };
const shiver: Point = { x: 0, y: 0 };
const fallback: CoinBurstSprite = {
  kind: "coin",
  spinFrame: 0,
  axisAngle: 0,
  axisCos: 1,
  axisSin: 0,
};

const charges = new WeakMap<Running, Charge>();

// how far up (0..1) swell k is at ms: snapping up to its crest, falling away
function swellAt(k: number, ms: number): number {
  const age = ms - BUMP_AT[k];
  if (age < 0) {
    const u = 1 + age / BUMP_RISE[k];
    return u <= 0 ? 0 : u * u;
  }
  const f = age / BUMP_FALL[k];
  return f >= 1 ? 0 : (1 - f) ** 2;
}

// the sea's resting level at ms
function levelAt(ms: number): number {
  if (ms < START_MS) return SEA_FROM;
  if (ms < FIRST_WAVE) {
    const u = (ms - START_MS) / (FIRST_WAVE - START_MS);
    return lerp(SEA_FROM, SEA_MID, 1 - (1 - u) ** 2);
  }
  if (ms < OPEN_AT)
    return lerp(SEA_MID, SEA_HIGH, (ms - FIRST_WAVE) / (OPEN_AT - FIRST_WAVE));
  if (ms < DRAIN_AT) return SEA_HIGH;
  const u = clamp01((ms - DRAIN_AT) / DRAIN_MS);
  return lerp(SEA_HIGH, SEA_FROM, u * u);
}

// one coin from the looks at coinSpot's x, y, radius, alpha and spin
function stampCoin(
  ctx: CanvasRenderingContext2D,
  i: number,
  base: DOMMatrix,
  batched: boolean,
): void {
  const p = i & (LOOKS - 1);
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

// a white-gold flash where a wave or surge hits, age ms after it
function drawFlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  age: number,
  size: number,
): void {
  if (age < 0 || age >= FLASH_MS) return;
  const u = age / FLASH_MS;
  ctx.globalAlpha = (1 - u) * 0.8;
  ctx.beginPath();
  ctx.arc(x, y, size * (0.5 + 0.5 * u), 0, Math.PI * 2);
  ctx.fill();
}

registerFloorCrit("highTideCrit", {
  // each surge pays the opened floor out the crit's multiple once more
  reward(t) {
    t.payPayouts(t.count);
    t.punch(`x${t.index + 1} Payout`);
  },
  plan(r, _bars, hit) {
    charges.set(
      r,
      planCharge(START_MS, OPEN_AT - START_MS, {
        bang: false,
        climaxShake: 0.8,
        shake: [0.05, 0.6],
        everyMs: [180, 50],
      }),
    );
    r.play.hideBars?.([0]);
    for (let k = 0; k < WAVES; k++) hit(0, WAVE_AT[k], 0);
    hit(0, OPEN_AT, 1);
    for (let k = 0; k < PAYOUTS; k++) hit(0, PAY_AT[k], 2);
  },
  draw(ctx, r, ms, bars) {
    const charge = charges.get(r);
    if (!charge) return;
    tickCharge(charge, ms, r.shake);
    const now = r.startedAt + ms;
    const lock = bars[0];
    const c = chargeAt(charge, ms);

    ctx.save();
    ctx.translate(lock.x, lock.y);
    if (ms < OPEN_AT) {
      drawChargeGlow(ctx, ORIGIN, c, GLOW, now);
      // the lock's price, quaking as the sea climbs, knocked up by each wave
      trembleAt(c, ms, TREMBLE, shiver);
      let jolt = 0;
      let wash = 0.4 * c;
      for (let k = 0; k < WAVES; k++) {
        const age = ms - WAVE_AT[k];
        if (age < 0 || age >= JOLT_MS) continue;
        const f = (1 - age / JOLT_MS) ** 2;
        jolt += lerp(JOLT[0], JOLT[1], k / (WAVES - 1)) * f;
        if (f > wash) wash = f;
      }
      ctx.save();
      ctx.translate(shiver.x, shiver.y - jolt);
      r.play.drawBar?.(ctx, 0, wash);
      ctx.restore();
    }

    const base = ctx.getTransform();
    const spin = ms * COIN_SPIN;
    beginCoinBatch(ctx);
    const batched = isCoinBatchOpen(ctx);
    // the sea: its surface heaved up by the swells, its coins packed under it
    if (ms >= START_MS && ms < END_MS) {
      const level = levelAt(ms);
      const drain = clamp01((ms - DRAIN_AT) / DRAIN_MS);
      const alpha = clamp01((ms - START_MS) / FADE_IN_MS) * (1 - drain * drain);
      const swell = SWELL * (ms < OPEN_AT ? 0.6 + c : 1);
      let up = 0;
      for (let k = 0; k < BUMPS; k++) {
        const s = swellAt(k, ms);
        if (s <= 0) continue;
        ACTIVE[up] = k;
        ACTIVE_UP[up++] = s;
      }
      for (let col = 0; col < COLS; col++) {
        const x = COL_X[col];
        const rest = level + swell * Math.sin(x * SWELL_K + ms * SWELL_F);
        let top = rest;
        for (let j = 0; j < up; j++) {
          const k = ACTIVE[j];
          const d = x - BUMP_X[k];
          const y =
            rest +
            (BUMP_PEAK[k] - rest) *
              ACTIVE_UP[j] *
              Math.exp(-d * d * BUMP_INV[k]);
          if (y < top) top = y;
        }
        SURF[col] = top;
      }
      // its glow, under the coins
      const bottom = level + DEPTH;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.22 * alpha;
      ctx.fillStyle = "#ffb52e";
      ctx.beginPath();
      ctx.moveTo(COL_X[0] - COIN_R, bottom + DEPTH * 0.3);
      for (let col = 0; col < COLS; col++) ctx.lineTo(COL_X[col], SURF[col]);
      ctx.lineTo(COL_X[COLS - 1] + COIN_R, bottom + DEPTH * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // past the screen's foot
      const limit = r.viewportWidth * 1.1 - lock.y;
      const wobble = ms * WOBBLE_F;
      for (let col = 0; col < COLS; col++) {
        const top = SURF[col];
        const span = Math.max(top, level) + DEPTH - top;
        const x = COL_X[col];
        for (let row = 0; row < ROWS; row++) {
          const i = col * ROWS + row;
          const ph = wobble + PHASE[i];
          const y = top + span * ROW_T[row] + Math.cos(ph * 1.3) * WOBBLE;
          if (y > limit) break;
          coinSpot[0] = x + COIN_DX[i] + Math.sin(ph) * WOBBLE;
          coinSpot[1] = y;
          coinSpot[2] = COIN_R;
          coinSpot[3] = alpha * ROW_ALPHA[row];
          coinSpot[4] = spin + SPIN_OFF[i];
          stampCoin(ctx, i, base, batched);
        }
      }
    }
    // surf off the crests, the crash over the lock, spray off the bar
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
        const look = SPLASH_LOOK + j;
        coinSpot[0] = x + SPLASH_DX[j] * out;
        coinSpot[1] = y + SPLASH_DY[j] * out + fall;
        coinSpot[2] = size;
        coinSpot[3] = alpha;
        coinSpot[4] = spin * 1.5 + SPIN_OFF[look & (LOOKS - 1)];
        stampCoin(ctx, look, base, batched);
      }
    }
    endCoinBatch(ctx);

    // the hits: a flash where each wave slams the lock and each surge the bar
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#fff3b0";
    for (let k = 0; k < WAVES; k++)
      drawFlash(
        ctx,
        0,
        BUMP_PEAK[k] - COIN_R,
        ms - WAVE_AT[k],
        lerp(90, 150, k / (WAVES - 1)),
      );
    for (let k = 0; k < PAYOUTS; k++)
      drawFlash(ctx, BX, BY, ms - PAY_AT[k], 120);
    ctx.restore();
    drawDetonation(ctx, ORIGIN, ms - OPEN_AT, OPEN_BLAST, now);
    drawDetonation(ctx, BAR, ms - PAY_AT[PAYOUTS - 1], REWARD_BLAST, now);
    ctx.restore();

    // the number diving into the sea
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      const e = u * u;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, lock.x, e),
        lerp(0, lock.y + SEA_MID, e),
        r.flashFont * (1 - 0.6 * e),
        { alpha: u < 0.7 ? 1 : (1 - u) / 0.3 },
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
