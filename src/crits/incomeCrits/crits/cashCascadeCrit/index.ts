// the cash cascade income crit: a nozzle beside the total trembles and glows,
// then a jet of hundreds of coins shoots up, arcs over and pours down onto
// the readout like water, crashing in surges that splash crowns of coins up
// off it, each a flash, a jolt and a share; the jet thickens, the surges
// quicken and a pool of coins sloshes round the readout, until one huge
// surge crashes down in the biggest splash, the pool bursting out in the blast
import { COLOR } from "../../../../palette";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { registerFloorCrit, type Point } from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawNumberShrink } from "../shared";

// the nozzle, from the total's middle: off its right end, a little below
const NOZZLE_X = 440;
const NOZZLE_Y = 190;
// the arc's pull, from the total's middle: up over its right half
const ARC_X = 240;
const ARC_Y = -300;
const ARC_JITTER_X = 30;
const ARC_JITTER_Y = 70;
// the charge: the nozzle trembling and glowing over OPEN_MS, then bursting
const OPEN_MS = 170;
const OPEN_BLAST = 150;
const TREMBLE = 8;
const TREMBLE_RATE = 0.9;
// the surges: SURGES of them, emitted from GAP_FIRST apart down to GAP_LAST,
// each thicker (more coins, wider, longer) than the one before
const SURGES = 7;
const GAP_FIRST = 200;
const GAP_LAST = 80;
const EMIT_FIRST = 60;
const EMIT_LAST = 110;
const COINS_FIRST = 32;
const COINS_LAST = 64;
// the last surge, FINALE_PAUSE_MS after the others, landing at its middle
const FINALE_PAUSE_MS = 150;
const FINALE_EMIT = 240;
const FINALE_COINS = 220;
const FINALE_LAND = 0.6;
// a thin stream between surges, so the jet never breaks
const TRICKLE = 110;
// a coin's flight from the nozzle onto the readout, then its splash
const FLIGHT_MS = 280;
const SPLASH_MS = 300;
const SPLASH_X = 120;
const SPLASH_H = 130;
const SPLASH_DROP = 50;
const COIN_SPIN = 0.025;
// the pool sloshing round the readout, filling as the surges land, bursting
// out in the last blast
const POOL = 150;
const POOL_RX = 370;
const POOL_RY = 72;
const POOL_DY = 10;
const POOL_COIN = 22;
const POOL_SPIN = 0.0035;
const SLOSH = 0.5;
const SLOSH_RATE = 0.011;
const SLOSH_WAVE = 9;
const KICK_MS = 160;
const KICK = 0.16;
const BURST_MS = 380;
const BURST = 2.6;
// each surge's flash on the readout, FLASH_MS long
const FLASH_MS = 200;
const FLASH_FIRST = 90;
const FLASH_STEP = 16;
const FINALE_FLASH = 300;
const FINALE_BLAST = 440;
const NOZZLE_GLOW = 34;
const NOZZLE_CHARGE = 56;
const NOZZLE_THROB = 40;
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);

// group g's landing: its middle and spread across the readout, its coin size
// and splash; groups 0..SURGES-1 are the surges, then the finale, then the
// trickle
const FINALE = SURGES;
const TRICKLE_GROUP = SURGES + 1;
const emitAt = new Float32Array(SURGES + 1);
const emitMs = new Float32Array(SURGES + 1);
const hitAt = new Float32Array(SURGES + 1);
const center = new Float32Array(SURGES + 2);
const spread = new Float32Array(SURGES + 2);
const size = new Float32Array(SURGES + 2);
const splash = new Float32Array(SURGES + 2);
const thick = new Float32Array(SURGES + 2);
let at = OPEN_MS;
for (let k = 0; k < SURGES; k++) {
  const p = k / (SURGES - 1);
  emitAt[k] = at;
  emitMs[k] = EMIT_FIRST + (EMIT_LAST - EMIT_FIRST) * p;
  hitAt[k] = at + emitMs[k] * 0.5 + FLIGHT_MS;
  center[k] = (holeHash(k, 351) * 2 - 1) * 200;
  spread[k] = 70 + 40 * p;
  size[k] = 22 + 7 * p;
  splash[k] = 0.8 + 0.6 * p;
  thick[k] = 0.5 + 0.5 * p;
  if (k < SURGES - 1)
    at += GAP_FIRST + (GAP_LAST - GAP_FIRST) * (k / (SURGES - 2));
}
emitAt[FINALE] = at + FINALE_PAUSE_MS;
emitMs[FINALE] = FINALE_EMIT;
const END_MS = emitAt[FINALE] + FINALE_EMIT * FINALE_LAND + FLIGHT_MS;
hitAt[FINALE] = END_MS;
center[FINALE] = 0;
spread[FINALE] = 290;
size[FINALE] = 32;
splash[FINALE] = 2.1;
thick[FINALE] = 1.3;
center[TRICKLE_GROUP] = 0;
spread[TRICKLE_GROUP] = 240;
size[TRICKLE_GROUP] = 17;
splash[TRICKLE_GROUP] = 0.4;
thick[TRICKLE_GROUP] = 0.3;
const JET_END = emitAt[FINALE] + FINALE_EMIT;

// every coin: its group, when it leaves the nozzle, its jitters
let coins = TRICKLE + FINALE_COINS;
for (let k = 0; k < SURGES; k++)
  coins += Math.round(
    COINS_FIRST + ((COINS_LAST - COINS_FIRST) * k) / (SURGES - 1),
  );
const COINS = coins;
const group = new Uint8Array(COINS);
const born = new Float32Array(COINS);
const land = new Float32Array(COINS);
const landY = new Float32Array(COINS);
const arcX = new Float32Array(COINS);
const arcY = new Float32Array(COINS);
const splashX = new Float32Array(COINS);
const splashH = new Float32Array(COINS);
const sprites: CoinBurstSprite[] = [];
let n = 0;
const addCoin = (g: number, t: number) => {
  group[n] = g;
  born[n] = t;
  land[n] = holeHash(n, 352) * 2 - 1;
  landY[n] = (holeHash(n, 353) - 0.5) * 30;
  arcX[n] = (holeHash(n, 354) * 2 - 1) * ARC_JITTER_X;
  arcY[n] = (holeHash(n, 355) * 2 - 1) * ARC_JITTER_Y;
  splashX[n] = holeHash(n, 356) * 2 - 1;
  splashH[n] = 0.4 + 0.6 * holeHash(n, 357);
  sprites.push({
    kind: n % 5 === 0 ? "bill" : "coin",
    spinFrame: 0,
    axisAngle: (holeHash(n, 358) - 0.5) * Math.PI,
  });
  n++;
};
for (let k = 0; k <= SURGES; k++) {
  const count =
    k === FINALE
      ? FINALE_COINS
      : Math.round(
          COINS_FIRST + ((COINS_LAST - COINS_FIRST) * k) / (SURGES - 1),
        );
  for (let i = 0; i < count; i++)
    addCoin(k, emitAt[k] + (i / count) * emitMs[k]);
}
for (let i = 0; i < TRICKLE; i++)
  addCoin(TRICKLE_GROUP, OPEN_MS + (i / TRICKLE) * (JET_END - OPEN_MS));

const poolAngle = Float32Array.from(
  { length: POOL },
  (_, i) => (i / POOL) * Math.PI * 2 + holeHash(i, 359) * 0.3,
);
const poolSprites: CoinBurstSprite[] = Array.from({ length: POOL }, (_, i) => ({
  kind: i % 6 === 0 ? "bill" : "coin",
  spinFrame: 0,
  axisAngle: (holeHash(i, 360) - 0.5) * Math.PI,
}));

const nozzle: Point = { x: 0, y: 0 };
const flashAt: Point = { x: 0, y: 0 };
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

registerFloorCrit("cashCascadeCrit", {
  plan(_r, _bars, hit) {
    for (let k = 0; k <= SURGES; k++) hit(0, hitAt[k], k);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    nozzle.x = to.x + NOZZLE_X;
    nozzle.y = to.y + NOZZLE_Y;
    const charge = clamp01(ms / OPEN_MS);
    if (ms < OPEN_MS) {
      const shake = Math.sin(ms * TREMBLE_RATE) * TREMBLE * charge;
      nozzle.x += shake;
      nozzle.y += Math.cos(ms * TREMBLE_RATE * 1.3) * TREMBLE * 0.5 * charge;
    }
    // the latest surge in: the pool kicks with it
    let lastHit = -1e9;
    for (let k = 0; k <= SURGES; k++) if (hitAt[k] <= ms) lastHit = hitAt[k];
    const kick = clamp01(1 - (ms - lastHit) / KICK_MS);
    // the latest surge out of the nozzle: it throbs with it
    let lastEmit = -1e9;
    for (let k = 0; k <= SURGES; k++) if (emitAt[k] <= ms) lastEmit = emitAt[k];
    const throb = clamp01(1 - (ms - lastEmit) / KICK_MS);

    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    // the pool round the readout, back half first
    const fill = clamp01((ms - hitAt[0]) / (END_MS - hitAt[0]));
    const shown = Math.ceil(fill * POOL);
    const burst = ms > END_MS ? (ms - END_MS) / BURST_MS : 0;
    if (shown > 0 && burst < 1) {
      const out = 1 + KICK * kick + BURST * (1 - (1 - burst) ** 3);
      const slosh = ms * POOL_SPIN + SLOSH * Math.sin(ms * SLOSH_RATE);
      for (let side = 0; side < 2; side++)
        for (let i = 0; i < shown; i++) {
          const a = poolAngle[i] + slosh;
          const sin = Math.sin(a);
          if (sin > 0 !== (side === 1)) continue;
          const coin = poolSprites[i];
          coin.spinFrame = ms * COIN_SPIN + i;
          drawCoinBurstFrame(
            ctx,
            coin,
            to.x + Math.cos(a) * POOL_RX * out,
            to.y +
              POOL_DY +
              sin * POOL_RY * out +
              Math.sin(a * 3 + ms * 0.02) * SLOSH_WAVE * (1 + kick),
            POOL_COIN * (0.8 + 0.1 * (sin + 1)) * (1 - burst),
            base,
          );
        }
    }
    // the jet: each coin flying its arc, then splashing up off the readout
    for (let i = 0; i < COINS; i++) {
      const t = ms - born[i];
      if (t < 0 || t >= FLIGHT_MS + SPLASH_MS) continue;
      const g = group[i];
      const lx = to.x + center[g] + land[i] * spread[g];
      const ly = to.y + landY[i];
      const coin = sprites[i];
      coin.spinFrame = ms * COIN_SPIN + i;
      let x: number;
      let y: number;
      let s = size[g];
      if (t < FLIGHT_MS) {
        const u = t / FLIGHT_MS;
        const v = 1 - u;
        const cx = to.x + ARC_X + arcX[i] * thick[g];
        const cy = to.y + ARC_Y + arcY[i] * thick[g];
        x = v * v * nozzle.x + 2 * u * v * cx + u * u * lx;
        y = v * v * nozzle.y + 2 * u * v * cy + u * u * ly;
      } else {
        const p = (t - FLIGHT_MS) / (SPLASH_MS * (g === FINALE ? 1.3 : 1));
        if (p >= 1) continue;
        const m = splash[g];
        x = lx + splashX[i] * SPLASH_X * m * p;
        y =
          ly -
          SPLASH_H * m * splashH[i] * 4 * p * (1 - p) +
          p * p * SPLASH_DROP;
        s *= 1 - 0.6 * p;
      }
      drawCoinBurstFrame(ctx, coin, x, y, s, base);
    }
    endCoinBatch(ctx);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // the nozzle: charging, then throbbing with each surge out of it
    if (ms < JET_END + KICK_MS) {
      const fade = ms < JET_END ? 1 : 1 - (ms - JET_END) / KICK_MS;
      ctx.globalAlpha = fade;
      const radius =
        NOZZLE_GLOW + NOZZLE_CHARGE * charge * charge + NOZZLE_THROB * throb;
      drawGlow(ctx, GOLD, nozzle.x, nozzle.y, radius * 1.8);
      drawGlow(ctx, WHITE, nozzle.x, nozzle.y, radius * 0.7);
    }
    // each surge's flash where it crashes down
    for (let k = 0; k <= SURGES; k++) {
      const since = ms - hitAt[k];
      if (since < 0 || since >= FLASH_MS) continue;
      const p = since / FLASH_MS;
      const radius = k === FINALE ? FINALE_FLASH : FLASH_FIRST + FLASH_STEP * k;
      flashAt.x = to.x + center[k];
      flashAt.y = to.y;
      ctx.globalAlpha = 1 - p;
      drawGlow(ctx, GOLD, flashAt.x, flashAt.y, radius * (1.3 + 0.8 * p), 0.6);
      drawGlow(ctx, WHITE, flashAt.x, flashAt.y, radius * (0.5 + 0.3 * p), 0.6);
    }
    ctx.restore();

    drawDetonation(ctx, nozzle, ms - OPEN_MS, OPEN_BLAST, now);
    drawDetonation(ctx, to, ms - END_MS, FINALE_BLAST, now);
  },
  tailMs: DETONATION_MS,
  // the surges jolting harder as they quicken; the last the hardest
  shake: (step) => (step >= SURGES ? 2.7 : 0.45 + 0.13 * step),
});
