// Cash Flood, a floor crit: the number sinks into the end of the top bar in
// view, where coins well up and hop higher and higher, trembling, until a
// river of hundreds of coins bursts out along the bar; it pours over the far
// end like a waterfall onto the next bar down, runs back along it the other
// way and spills onto the next, zigzagging down the bars, each one it lands
// on splashing and levelling with a flash and a jolt, the flood thicker and
// faster on every bar; the whole torrent then arcs onto its own bar, pooling
// into a swelling, trembling mound, and erupts in a geyser of coins with the
// big blast and the hardest shake
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, holeHash, ownLast } from "../../critPlayer/shared";

const IN_MS = 200;
// coins welling up at the top bar's end, WELL of them hopping up to WELL_H
// px, WELL_W px either side, until the burst
const WELL_FROM_MS = 120;
const BURST_AT = 440;
const WELL = 30;
const WELL_HOP_MS = 230;
const WELL_STAGGER = 37;
const WELL_H: [number, number] = [20, 130];
const WELL_W = 40;
const WELL_COIN = 18;
const WELL_TREMBLE = 6;
// the river runs END_IN px short of each bar's ends; each bar's run and each
// waterfall quickening from [0] to [1], all squeezed into LEGS_SPAN; a fall
// bows OVERHANG px out past the end, the last arcing CRASH_LIFT px up
const END_IN = 70;
const RUN_MS: [number, number] = [250, 110];
const FALL_MS: [number, number] = [160, 80];
const LEGS_SPAN = 1000;
const CRASH_MS = 170;
const OVERHANG = 120;
const CRASH_LIFT = 160;
// the river: COINS coins spread over RIVER_MS behind its head, thicker,
// bigger and denser as it goes
const COINS = 300;
const RIVER_MS = 300;
const COIN: [number, number] = [16, 26];
const THICK: [number, number] = [18, 56];
const DENSITY_FROM = 0.4;
const WAVE = 0.02;
const WAVE_H = 5;
const SPIN = 0.03;
// a splash where the flood lands on each bar, bigger down the bars
const SPLASH_BASE = 14;
const SPLASH_STEP = 5;
const SPLASH_MAX = 40;
const SPLASH_MS = 420;
const SPLASH_V: [number, number] = [0.9, 1.7];
const SPLASH_VX = 0.5;
const SPLASH_DRIFT = 0.25;
const SPLASH_COIN = 20;
const GRAVITY = 0.004;
const LAND_GLOW_MS = 240;
const LAND_GLOW = 200;
const HEAD_GLOW = 120;
// the pool on its own bar, POOL coins in a mound POOL_W px either side and
// POOL_H high, trembling harder as it fills
const POOL = 80;
const POOL_W = 170;
const POOL_H = 90;
const POOL_COIN = 22;
const TREMBLE_HZ = 0.09;
const TREMBLE = 10;
const POOL_GLOW = 260;
// the geyser: GEYSER coins shot up over GEYSER_STAGGER_MS
const GEYSER = 180;
const GEYSER_MS = 1000;
const GEYSER_STAGGER_MS = 140;
const GEYSER_V: [number, number] = [1.8, 3.3];
const GEYSER_VX = 0.9;
const GEYSER_COIN = 30;
const BOOM = 460;
const BOOM_GLOW = 520;
const BOOM_GLOW_MS = 320;
// shakes by step: a landing (stronger down the bars), the geyser
const SHAKES = [0.7, 0.9, 1.1, 1.4, 3.4];
const LAST_LEG_STEP = 3;
const GEYSER_STEP = 4;
const TAIL_MS = 1000;

// each coin's own scatter, shared by every flood
const JX = new Float32Array(COINS);
const JY = new Float32Array(COINS);
const SHOW = new Float32Array(COINS);
const SIZE = new Float32Array(COINS);
for (let i = 0; i < COINS; i++) {
  JX[i] = holeHash(i, 1401) * 2 - 1;
  JY[i] = holeHash(i, 1402);
  SHOW[i] = holeHash(i, 1403);
  SIZE[i] = lerp(0.75, 1.25, holeHash(i, 1404));
}

interface Flood {
  // the bars it runs along top to bottom, and which way along each
  legs: number[];
  dirs: number[];
  // segment 2k is the run along legs[k], 2k+1 the fall off its end onto the
  // next (the last onto its own bar)
  segAt: number[];
  segMs: number[];
  land: number;
  boom: number;
}
const floods = new WeakMap<Running, Flood>();
const sprite: CoinBurstSprite = { kind: "coin", spinFrame: 0, axisAngle: 0 };
const pos: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);

function planFlood(bars: Point[]): Flood {
  const order = ownLast(bars);
  const legs = order.length > 1 ? order.slice(0, -1) : [0];
  const n = legs.length;
  let raw = 0;
  for (let k = 0; k < n; k++) {
    const q = n > 1 ? k / (n - 1) : 0;
    raw += lerp(...RUN_MS, q) + (k < n - 1 ? lerp(...FALL_MS, q) : 0);
  }
  const scale = raw > LEGS_SPAN ? LEGS_SPAN / raw : 1;
  const dirs: number[] = [];
  const segAt: number[] = [];
  const segMs: number[] = [];
  let clock = BURST_AT;
  for (let k = 0; k < n; k++) {
    const q = n > 1 ? k / (n - 1) : 0;
    dirs.push(k % 2 === 0 ? 1 : -1);
    const run = Math.max(1, lerp(...RUN_MS, q) * scale);
    segAt.push(clock);
    segMs.push(run);
    clock += run;
    const fall =
      k < n - 1 ? Math.max(1, lerp(...FALL_MS, q) * scale) : CRASH_MS;
    segAt.push(clock);
    segMs.push(fall);
    clock += fall;
  }
  return { legs, dirs, segAt, segMs, land: clock, boom: clock + RIVER_MS };
}

// the river's line at u 0..1 through segment s, into pos
function pathAt(f: Flood, bars: Point[], end: number, s: number, u: number) {
  const k = s >> 1;
  const a = bars[f.legs[k]];
  const d = f.dirs[k];
  const topA = a.y - BAR_HALF_H;
  if ((s & 1) === 0) {
    pos.x = a.x + d * end * (2 * u - 1);
    pos.y = topA;
    return;
  }
  const sx = a.x + d * end;
  const cx = sx + d * OVERHANG;
  let ex: number;
  let ey: number;
  let cy: number;
  if (k < f.legs.length - 1) {
    const c = bars[f.legs[k + 1]];
    ex = c.x + d * end;
    ey = c.y - BAR_HALF_H;
    cy = topA;
  } else {
    const c = bars[0];
    ex = c.x;
    ey = c.y - BAR_HALF_H;
    cy = Math.min(topA, ey) - CRASH_LIFT;
  }
  // gathering speed as it falls
  const p = u * (0.6 + 0.4 * u);
  const m = 1 - p;
  pos.x = m * m * sx + 2 * m * p * cx + p * p * ex;
  pos.y = m * m * topA + 2 * m * p * cy + p * p * ey;
}

registerFloorCrit("cashFloodCrit", {
  // the flood lands on each bar once
  levels: (count) => count,
  plan(r, bars, hit) {
    const f = planFlood(bars);
    floods.set(r, f);
    for (let k = 0; k < f.legs.length; k++)
      hit(f.legs[k], f.segAt[2 * k], Math.min(k, LAST_LEG_STEP));
    hit(0, f.boom, GEYSER_STEP);
  },
  draw(ctx, r, ms, bars) {
    const f = floods.get(r);
    if (!f) return;
    const now = r.startedAt + ms;
    const end = Math.max(0, r.play.barHalfWidth - END_IN);
    const n = f.legs.length;
    const segs = n * 2;
    const top = bars[f.legs[0]];
    const srcX = top.x - f.dirs[0] * end;
    const srcY = top.y - BAR_HALF_H;
    const own = bars[0];
    const ownTop = own.y - BAR_HALF_H;
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, srcX, p),
        lerp(0, srcY, p),
        r.flashFont * lerp(1, 0.3, p),
        { alpha: 1 - p },
      );
    }
    if (ms >= BURST_AT && r.kicked < 1) {
      r.kicked = 1;
      playSwoosh();
    }
    if (ms >= f.boom && r.kicked < 2) {
      r.kicked = 2;
      playExplosion();
    }
    const prog = clamp01((ms - BURST_AT) / (f.land - BURST_AT));
    const charge = clamp01((ms - WELL_FROM_MS) / (BURST_AT - WELL_FROM_MS));
    const fill = clamp01((ms - f.land) / (f.boom - f.land));
    const tremble = Math.sin(ms * TREMBLE_HZ * 3) * WELL_TREMBLE * charge;

    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    // the coins welling up at the top bar's end, hopping higher and higher
    if (ms >= WELL_FROM_MS && ms < BURST_AT) {
      const count = Math.ceil(WELL * charge);
      const h = lerp(...WELL_H, charge * charge);
      for (let j = 0; j < count; j++) {
        const t = ((ms + j * WELL_STAGGER) % WELL_HOP_MS) / WELL_HOP_MS;
        sprite.spinFrame = ms * SPIN + j;
        drawCoinBurstFrame(
          ctx,
          sprite,
          srcX + JX[j] * WELL_W + tremble,
          srcY - h * 4 * t * (1 - t) * (0.5 + 0.5 * JY[j]),
          WELL_COIN * SIZE[j],
          base,
        );
      }
    }
    // the river, its coins from the head back
    if (ms >= BURST_AT) {
      const thick = lerp(...THICK, prog);
      const size = lerp(...COIN, prog);
      const density = lerp(DENSITY_FROM, 1, prog);
      let s = segs - 1;
      for (let i = 0; i < COINS; i++) {
        const tc = ms - (RIVER_MS * i) / COINS;
        if (tc < BURST_AT) break;
        if (tc >= f.land || SHOW[i] > density) continue;
        while (s > 0 && tc < f.segAt[s]) s--;
        pathAt(f, bars, end, s, clamp01((tc - f.segAt[s]) / f.segMs[s]));
        let x = pos.x;
        let y = pos.y;
        if ((s & 1) === 0) {
          x += JX[i] * thick * 0.6;
          y -= JY[i] * thick + size * 0.5 + Math.sin(ms * WAVE + i) * WAVE_H;
        } else {
          x += JX[i] * thick * 0.5;
          y += (JY[i] - 0.5) * thick * 0.8;
        }
        sprite.spinFrame = ms * SPIN + i;
        drawCoinBurstFrame(ctx, sprite, x, y, size * SIZE[i], base);
      }
    }
    // a splash where it lands on each bar
    for (let k = 0; k < n; k++) {
      const age = ms - f.segAt[2 * k];
      if (age < 0 || age >= SPLASH_MS) continue;
      const bar = bars[f.legs[k]];
      const d = f.dirs[k];
      const lx = bar.x - d * end;
      const ly = bar.y - BAR_HALF_H;
      const count = Math.min(SPLASH_MAX, SPLASH_BASE + k * SPLASH_STEP);
      for (let j = 0; j < count; j++) {
        const idx = (j * 7 + k * 11) % COINS;
        const vx = JX[idx] * SPLASH_VX + d * SPLASH_DRIFT;
        const vy = lerp(...SPLASH_V, JY[idx]);
        sprite.spinFrame = ms * SPIN + idx;
        drawCoinBurstFrame(
          ctx,
          sprite,
          lx + vx * age,
          ly - vy * age + GRAVITY * age * age,
          SPLASH_COIN * SIZE[idx],
          base,
        );
      }
    }
    // the pool on its own bar, swelling and trembling
    if (ms >= f.land && ms < f.boom) {
      const shake = Math.sin(ms * TREMBLE_HZ) * TREMBLE * fill;
      for (let j = 0; j < POOL; j++) {
        if (SHOW[j] > fill) continue;
        sprite.spinFrame = ms * SPIN + j;
        drawCoinBurstFrame(
          ctx,
          sprite,
          own.x + JX[j] * POOL_W * (0.5 + 0.5 * fill) + shake * JY[j],
          ownTop - (1 - JX[j] * JX[j]) * JY[j] * POOL_H * fill,
          POOL_COIN * SIZE[j],
          base,
        );
      }
    }
    // the geyser
    const geyserAge = ms - f.boom;
    if (geyserAge >= 0 && geyserAge < GEYSER_MS) {
      for (let j = 0; j < GEYSER; j++) {
        const idx = (j * 3 + 5) % COINS;
        const t = geyserAge - SHOW[idx] * GEYSER_STAGGER_MS;
        if (t < 0) continue;
        const vy = lerp(...GEYSER_V, JY[(idx + 1) % COINS]);
        sprite.spinFrame = ms * SPIN + idx;
        drawCoinBurstFrame(
          ctx,
          sprite,
          own.x + JX[idx] * GEYSER_VX * t,
          ownTop - vy * t + GRAVITY * t * t,
          GEYSER_COIN * SIZE[idx],
          base,
        );
      }
    }
    endCoinBatch(ctx);

    // the light: the welling end, the river's head, each landing, the pool
    // and the geyser's flash
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (ms >= WELL_FROM_MS && ms < BURST_AT) {
      ctx.globalAlpha = 0.4 + 0.5 * charge;
      drawGlow(
        ctx,
        GOLD,
        srcX + tremble,
        srcY,
        HEAD_GLOW * (0.5 + charge),
        0.7,
      );
    }
    if (ms >= BURST_AT && ms < f.land) {
      let s = segs - 1;
      while (s > 0 && ms < f.segAt[s]) s--;
      pathAt(f, bars, end, s, clamp01((ms - f.segAt[s]) / f.segMs[s]));
      ctx.globalAlpha = 0.6;
      drawGlow(ctx, GOLD, pos.x, pos.y, HEAD_GLOW * (0.7 + 0.6 * prog));
    }
    for (let k = 0; k < n; k++) {
      const age = ms - f.segAt[2 * k];
      if (age < 0 || age >= LAND_GLOW_MS) continue;
      const bar = bars[f.legs[k]];
      const fade = 1 - age / LAND_GLOW_MS;
      ctx.globalAlpha = fade;
      drawGlow(
        ctx,
        WHITE,
        bar.x - f.dirs[k] * end,
        bar.y - BAR_HALF_H,
        LAND_GLOW * (1 + k * 0.15) * (0.5 + 0.5 * fade),
        0.6,
      );
    }
    if (ms >= f.land && ms < f.boom) {
      ctx.globalAlpha = 0.4 + 0.6 * fill;
      drawGlow(ctx, GOLD, own.x, ownTop, POOL_GLOW * (0.4 + fill), 0.6);
    }
    if (geyserAge >= 0 && geyserAge < BOOM_GLOW_MS) {
      const fade = 1 - geyserAge / BOOM_GLOW_MS;
      ctx.globalAlpha = fade;
      drawGlow(ctx, WHITE, own.x, ownTop, BOOM_GLOW * (0.6 + 0.4 * fade));
    }
    ctx.globalAlpha = 1;
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    spot.x = own.x;
    spot.y = ownTop;
    drawDetonation(ctx, spot, geyserAge, BOOM, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
