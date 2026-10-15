// Dancing Waters, a lock crit: the number dives into a row of coin fountain
// jets on the floor below the lock; they dance up in quickening waves
// (sweeping left, sweeping right, criss-crossing, all together), each higher
// and faster, the tallest pounding the lock from below with a splash and a
// jolt; they sink trembling, then every jet shoots up at once into one column
// that bursts the lock open, and its coins rain down through the new floor's
// button onto the one below, leaving free taps there
import meta from "./meta";
import { addFreeTaps } from "../../../buttonCrits/buttonBonus";
import { critTarget } from "../../../critKit/target";
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
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { FLOOR_H } from "../../../../floors/constants";
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
const BTN = getButtonCenter(false);
// the new floor's button and the one under it, from the lock's middle
const NX = BTN.x - LOCK.x;
const NY = BTN.y - LOCK.y;
const DX = NX;
const DY = NY + FLOOR_H;

const IN_MS = 150;
const START_MS = 80;
const RAMP_MS = 150;
// the jets: JETS nozzles across the floor below, BASE under the lock
const JETS = 9;
const MID = (JETS - 1) / 2;
const SPAN = LOCK.x - 60;
const BASE = 560;
const IDLE = 90;
const COIN_R = 18;
const FLOW_N = 18;
const FLOW_SPEED = 1 / 210;
const CROWN_N = 8;
const CROWN_MS = 300;
const CROWN_SPREAD = 80;
const CROWN_UP = 90;
const CROWN_G = 320;
const SWAY = 30;
const SWAY_F = 0.012;
const GLOW_W = 30;
// the waves: crest under the lock at WAVE_AT, quickening, each higher and
// snappier; DIR sweeps them (0 = outer first), CROSS leans jets past the middle
const WAVES = 4;
const WAVE_AT = [330, 560, 750, 900];
const WAVE_DIR = [1, -1, 0, 0];
const STAGGER = [40, 34, 30, 0];
const RISE = [170, 140, 115, 90];
const FALL = [220, 190, 160, 140];
const PEAK = [110, 70, 35, 0];
const SIDE = [340, 290, 230, 170];
const CROSS = [0, 18, 46, 10];
// they sink trembling, then all shoot up into one column over the lock
const DIP_AT = 1010;
const DIP_H = 55;
const DIP_SHAKE = 10;
const COLUMN_AT = 1110;
const OPEN_AT = 1210;
const COLUMN_TOP = -420;
const CONVERGE = 0.86;
const HOLD_MS = 120;
const COLLAPSE_MS = 220;
// the rain: blown up off the lock, down into the new button, poured on down
const RAIN = 90;
const RAIN_STAGGER = 130;
const RAIN_ARC_MS = 260;
const RAIN_POUR_MS = 90;
const RAIN_UP: [number, number] = [260, 420];
const RAIN_WIDE = 360;
const TAPS_AT = OPEN_AT + RAIN_STAGGER * 0.8 + RAIN_ARC_MS + RAIN_POUR_MS;
const END_MS = OPEN_AT + RAIN_STAGGER + RAIN_ARC_MS + RAIN_POUR_MS;
// the lock's price jolted up by each wave, washed white
const JOLT: [number, number] = [22, 46];
const JOLT_MS = 140;
const TREMBLE = 9;
const GLOW = 260;
const SPLASH_MS = 400;
const DROP = 260;
const FLASH_MS = 110;
const OPEN_BLAST = 440;
const TAPS_BLAST = 220;
const COIN_SPIN = 0.03;
// shakes by step: a wave pounding the lock, the column bursting it, the rain
const SHAKES = [1, 3.2, 1.2];

// each jet's nozzle, and per wave its crest's height, delay and lean
const JET_X = new Float32Array(JETS);
const JET_PHASE = new Float32Array(JETS);
const W_H = new Float32Array(WAVES * JETS);
const W_DELAY = new Float32Array(WAVES * JETS);
const W_LEAN = new Float32Array(WAVES * JETS);
for (let j = 0; j < JETS; j++) {
  const off = (j - MID) / MID;
  JET_X[j] = SPAN * off;
  JET_PHASE[j] = holeHash(j, 9201);
  const centre = 1 - Math.abs(off);
  for (let k = 0; k < WAVES; k++) {
    const i = k * JETS + j;
    W_H[i] = BASE - lerp(SIDE[k], PEAK[k], centre * centre);
    W_DELAY[i] =
      WAVE_DIR[k] === 0
        ? -Math.abs(j - MID) * STAGGER[k]
        : (j - MID) * STAGGER[k] * WAVE_DIR[k];
    W_LEAN[i] = (MID - j) * CROSS[k];
  }
}
const MAX_H = BASE - COLUMN_TOP;
// this frame's jets: tip and height
const TIP_X = new Float32Array(JETS);
const TIP_Y = new Float32Array(JETS);
const JET_H = new Float32Array(JETS);

// each coin's look, by its index into the pool
const LOOKS = 1024;
const BILL = new Uint8Array(LOOKS);
const COS = new Float32Array(LOOKS);
const SIN = new Float32Array(LOOKS);
const SPIN_OFF = new Float32Array(LOOKS);
const JIT = new Float32Array(LOOKS);
for (let i = 0; i < LOOKS; i++) {
  BILL[i] = holeHash(i, 9211) < 0.15 ? 1 : 0;
  const a = (holeHash(i, 9212) - 0.5) * Math.PI;
  COS[i] = Math.cos(a);
  SIN[i] = Math.sin(a);
  SPIN_OFF[i] = holeHash(i, 9213) * 12;
  JIT[i] = holeHash(i, 9214) - 0.5;
}
const CROWN_LOOK = JETS * FLOW_N;
const RAIN_LOOK = CROWN_LOOK + JETS * CROWN_N;
const SPLASH_LOOK = RAIN_LOOK + RAIN;

// the rain's coins: when each leaves, where from and how high it's blown
const RAIN_T0 = new Float32Array(RAIN);
const RAIN_SX = new Float32Array(RAIN);
const RAIN_CX = new Float32Array(RAIN);
const RAIN_CY = new Float32Array(RAIN);
const RAIN_EX = new Float32Array(RAIN);
for (let i = 0; i < RAIN; i++) {
  RAIN_T0[i] = OPEN_AT + RAIN_STAGGER * holeHash(i, 9221);
  RAIN_SX[i] = (holeHash(i, 9222) - 0.5) * 120;
  RAIN_CX[i] = (holeHash(i, 9223) - 0.5) * 2 * RAIN_WIDE;
  RAIN_CY[i] = -lerp(RAIN_UP[0], RAIN_UP[1], holeHash(i, 9224));
  RAIN_EX[i] = NX + (holeHash(i, 9225) - 0.5) * 50;
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
  spread: number,
  size: number,
) => {
  SPLASH_AT.push(at);
  SPLASH_X.push(x);
  SPLASH_Y.push(y);
  SPLASH_FIRST.push(splashCoins);
  SPLASH_SIZE.push(size);
  for (let j = 0; j < n && splashCoins < SPLASH_DX.length; j++) {
    const a = -Math.PI / 2 + (holeHash(splashCoins, 9231) - 0.5) * 2 * spread;
    const r = reach * (0.35 + 0.65 * holeHash(splashCoins, 9232));
    SPLASH_DX[splashCoins] = Math.cos(a) * r;
    SPLASH_DY[splashCoins] = Math.sin(a) * r;
    splashCoins++;
  }
};
// off the crest under the lock each wave, the column bursting it, the pour
// landing on the button below
for (let k = 0; k < WAVES; k++) {
  const p = k / (WAVES - 1);
  addSplash(
    WAVE_AT[k],
    0,
    BASE - W_H[k * JETS + MID],
    Math.round(lerp(18, 34, p)),
    lerp(200, 320, p),
    lerp(0.8, 1.2, p),
    lerp(19, 24, p),
  );
}
addSplash(OPEN_AT, 0, 0, 100, 560, 1.6, 26);
addSplash(TAPS_AT, DX, DY, 40, 260, 1.2, 22);
SPLASH_FIRST.push(splashCoins);
const SPLASHES = SPLASH_AT.length;

const ORIGIN: Point = { x: 0, y: 0 };
const BELOW: Point = { x: DX, y: DY };
const shiver: Point = { x: 0, y: 0 };
const fallback: CoinBurstSprite = {
  kind: "coin",
  spinFrame: 0,
  axisAngle: 0,
  axisCos: 1,
  axisSin: 0,
};

const charges = new WeakMap<Running, Charge>();

// how far up (0..1) a crest is age ms from its peak: snapping up, falling away
function pulseAt(age: number, rise: number, fall: number): number {
  if (age < 0) {
    const u = 1 + age / rise;
    return u <= 0 ? 0 : u * u;
  }
  const f = age / fall;
  return f >= 1 ? 0 : (1 - f) ** 2;
}

// each jet's tip and height at ms
function placeJets(ms: number, c: number): void {
  const ramp = clamp01((ms - START_MS) / RAMP_MS);
  for (let j = 0; j < JETS; j++) {
    const x = JET_X[j];
    let h = 0;
    let lean = 0;
    if (ms < DIP_AT) {
      h = IDLE * ramp;
      let up = 0;
      for (let k = 0; k < WAVES; k++) {
        const i = k * JETS + j;
        const u = pulseAt(ms - WAVE_AT[k] - W_DELAY[i], RISE[k], FALL[k]);
        if (u <= 0) continue;
        const wh = W_H[i] * u;
        if (wh > h) h = wh;
        lean += W_LEAN[i] * u;
        if (u > up) up = u;
      }
      lean +=
        SWAY * Math.sin(ms * SWAY_F + JET_PHASE[j] * 6.28) * (0.4 + 0.6 * up);
    } else if (ms < COLUMN_AT) {
      h = DIP_H;
      lean = Math.sin(ms * 0.09 + j * 2.1) * DIP_SHAKE * (0.5 + c);
    } else if (ms < OPEN_AT) {
      const u = (ms - COLUMN_AT) / (OPEN_AT - COLUMN_AT);
      const e = u * u;
      h = lerp(DIP_H, MAX_H, e);
      lean = -x * CONVERGE * e;
    } else {
      const u = clamp01((ms - OPEN_AT - HOLD_MS) / COLLAPSE_MS);
      h = MAX_H * (1 - u) * (1 - u);
      lean = -x * CONVERGE * (1 - u);
    }
    JET_H[j] = h;
    TIP_X[j] = x + lean;
    TIP_Y[j] = BASE - h;
  }
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

// a white-gold flash where a crest pounds the lock, age ms after it
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

registerFloorCrit("dancingWatersCrit", {
  // free taps on the open floor under the one it opened, its button flipping
  reward(t) {
    const below = t.floors[t.floors.indexOf(t.floor) - 1];
    if (!below?.unlocked) return;
    addFreeTaps(below, meta.values.taps);
    critTarget({
      floor: below,
      ownFloor: t.ownFloor,
      floors: t.floors,
      step: t.step,
      tier: t.tier,
      count: t.count,
      color: t.color,
      price: t.price,
      index: t.index,
    }).flipButton();
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
    hit(0, TAPS_AT, 2);
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
      // the lock's price, quaking as the show builds, knocked up by each crest
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

    const showing = ms >= START_MS && ms < OPEN_AT + HOLD_MS + COLLAPSE_MS;
    if (showing) {
      placeJets(ms, c);
      // the jets' glow, under their coins
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.24 * clamp01((ms - START_MS) / RAMP_MS);
      ctx.strokeStyle = "#ffb52e";
      ctx.lineWidth = GLOW_W;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let j = 0; j < JETS; j++) {
        if (JET_H[j] < 8) continue;
        ctx.moveTo(JET_X[j], BASE);
        ctx.quadraticCurveTo(
          JET_X[j],
          BASE - JET_H[j] * 0.55,
          TIP_X[j],
          TIP_Y[j],
        );
      }
      ctx.stroke();
      ctx.restore();
    }

    const base = ctx.getTransform();
    const spin = ms * COIN_SPIN;
    beginCoinBatch(ctx);
    const batched = isCoinBatchOpen(ctx);
    if (showing) {
      const fade = clamp01((ms - START_MS) / RAMP_MS);
      const flow = ms * FLOW_SPEED;
      const crown = ms / CROWN_MS;
      for (let j = 0; j < JETS; j++) {
        const h = JET_H[j];
        if (h < 8) continue;
        const x0 = JET_X[j];
        const cy = BASE - h * 0.55;
        const tx = TIP_X[j];
        const ty = TIP_Y[j];
        // the stream: coins racing up the jet's curve
        for (let n = 0; n < FLOW_N; n++) {
          const i = j * FLOW_N + n;
          let s = flow + n / FLOW_N + JET_PHASE[j];
          s -= Math.floor(s);
          const a = (1 - s) * (1 - s);
          const b = 2 * (1 - s) * s;
          const d = s * s;
          coinSpot[0] = a * x0 + b * x0 + d * tx + JIT[i] * 14;
          coinSpot[1] = a * BASE + b * cy + d * ty;
          coinSpot[2] = COIN_R * (0.85 + 0.3 * s);
          coinSpot[3] = fade;
          coinSpot[4] = spin + SPIN_OFF[i];
          stampCoin(ctx, i, base, batched);
        }
        // the crown: coins thrown off the tip, tumbling back down
        const scale = Math.min(1.4, 0.3 + h / (BASE - PEAK[0]));
        const side = tx - x0;
        for (let n = 0; n < CROWN_N; n++) {
          const i = CROWN_LOOK + j * CROWN_N + n;
          let p = crown + n / CROWN_N + JET_PHASE[j];
          p -= Math.floor(p);
          const dir = n & 1 ? 1 : -1;
          coinSpot[0] =
            tx + (dir * CROWN_SPREAD * (0.6 + JIT[i]) * scale + side * 0.3) * p;
          coinSpot[1] = ty - CROWN_UP * scale * p + CROWN_G * p * p;
          coinSpot[2] = COIN_R;
          coinSpot[3] = fade * (1 - p * p);
          coinSpot[4] = spin * 1.4 + SPIN_OFF[i];
          stampCoin(ctx, i, base, batched);
        }
      }
    }
    // the rain: blown up off the burst lock, into the new button, poured on
    // down into the one below
    if (ms >= OPEN_AT && ms < END_MS) {
      for (let i = 0; i < RAIN; i++) {
        const age = ms - RAIN_T0[i];
        if (age < 0) continue;
        let x: number;
        let y: number;
        if (age < RAIN_ARC_MS) {
          const s = age / RAIN_ARC_MS;
          const a = (1 - s) * (1 - s);
          const b = 2 * (1 - s) * s;
          const d = s * s;
          x = a * RAIN_SX[i] + b * RAIN_CX[i] + d * RAIN_EX[i];
          y = b * RAIN_CY[i] + d * NY;
        } else if (age < RAIN_ARC_MS + RAIN_POUR_MS) {
          const s = (age - RAIN_ARC_MS) / RAIN_POUR_MS;
          x = lerp(RAIN_EX[i], DX, s);
          y = lerp(NY, DY, s * s);
        } else continue;
        const look = RAIN_LOOK + i;
        coinSpot[0] = x;
        coinSpot[1] = y;
        coinSpot[2] = COIN_R * 1.1;
        coinSpot[3] = 1;
        coinSpot[4] = spin * 1.6 + SPIN_OFF[look];
        stampCoin(ctx, look, base, batched);
      }
    }
    // spray off each crest, the burst, the landing
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

    // a flash where each crest pounds the lock, and the new button as the
    // rain pours through it
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#fff3b0";
    for (let k = 0; k < WAVES; k++)
      drawFlash(
        ctx,
        0,
        BASE - W_H[k * JETS + MID] - COIN_R,
        ms - WAVE_AT[k],
        lerp(90, 160, k / (WAVES - 1)),
      );
    drawFlash(ctx, NX, NY, ms - OPEN_AT - RAIN_ARC_MS, 110);
    drawFlash(ctx, NX, NY, ms - TAPS_AT + RAIN_POUR_MS, 120);
    ctx.restore();
    drawDetonation(ctx, ORIGIN, ms - OPEN_AT, OPEN_BLAST, now);
    drawDetonation(ctx, BELOW, ms - TAPS_AT, TAPS_BLAST, now);
    ctx.restore();

    // the number diving into the jets
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      const e = u * u;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, lock.x, e),
        lerp(0, lock.y + BASE, e),
        r.flashFont * (1 - 0.6 * e),
        { alpha: u < 0.7 ? 1 : (1 - u) / 0.3 },
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
