// the "Golden Egg" event (charge; cash): it covers its crit, whose click
// freezes the screen while a big golden egg drops into the middle with a
// thud, then charges: trembling and glowing, light and coins streaking in off
// every floor in view, the rumble rising. Glowing cracks snap across its
// shell quicker and quicker, each a flash, a jolt and a spill of cash onto a
// floor, the egg rocking harder and burning white-hot; at the climax it
// hatches in one huge burst, shell shards flying, a flood of coins pouring out
// onto every floor in view with the hardest shake. Pays floor income × floor
// number × reward
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBarExplosionSound, playBoostEventStream } from "../../../../sound";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { clamp01, lerp, type Range } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { shakeScreen } from "../../../../shared/screenShake";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { ringTargets } from "../../../../shared/coinTargets";
import type { Point } from "../../../../shared/wisp";
import {
  getIncomeBarBox,
  getIncomeBarCenter,
} from "../../../../floors/incomePanel";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "goldenEgg";
// the egg's half width, of the screen's width (at most HEIGHT_CAP of its
// height), and its half height of that
const EGG_W = 0.2;
const HEIGHT_CAP = 0.15;
const EGG_TALL = 1.3;
// its glow GLOW and each crack's flash PULSE of the screen's width across,
// its streaks REACH across, trembling TREMBLE px
const GLOW = 0.34;
const PULSE = 0.26;
const REACH = 0.36;
const TREMBLE = 10;
// landing: squashed by SQUASH, springing back over SQUASH_MS
const SQUASH = 0.22;
const SQUASH_MS = 180;
// rocking ROCK rad either way at full charge, each crack jolting it JOLT rad
// over JOLT_MS
const ROCK = 0.16;
const JOLT = 0.24;
const JOLT_MS = 200;
const CRACK_POWER: Range = [0.5, 1];
const CRACK_SHAKE: Range = [0.7, 2.1];
const CRACK_BURST: Range = [0.35, 0.75];
const CRACK_RATE: Range = [0.9, 1.5];
// crack k lands ((k + 1) / (cracks + 1)) ** CRACK_CURVE of the way: closing up
const CRACK_CURVE = 0.6;
// each crack SEGS zigzags of STEP (of the egg's half size), drawn in over
// GROW_MS; its coins land within COIN_REACH of a floor's bar
const SEGS = 4;
const STEP = 0.22;
const GROW_MS = 70;
const FLASH_MS = 160;
const COIN_REACH: Range = [12, 80];
// streaks off each floor's bar: STREAM a bar, each trip CYCLE_MS at first,
// ACCEL times as many by the climax, LENGTH of the trip long
const STREAM = 4;
const CYCLE_MS = 520;
const ACCEL = 4;
const LENGTH = 0.16;
const STREAK_W = 8;
const COIN_SIZE = 22;
const MAX_FLOORS = 6;
// the hatch: SHARDS shell pieces flung out over SHARD_MS, falling at GRAVITY
const SHARDS = 18;
const SHARD_MS = 650;
const SHARD_SPEED: Range = [900, 1900];
const SHARD_SIZE: Range = [0.22, 0.42];
const GRAVITY = 2200;
const HATCH_FLASH_MS = 320;
// the flood: one river onto each floor, arcing up LIFT px out of the egg
const LIFT = 140;
const FLOOD: Pour = {
  coinsAlong: 140,
  width: 34,
  streamMs: 380,
  travelMs: 280,
};

// the egg sprites, built once per size at SCALE for crispness
const SCALE = 2;
const PAD = 4;
let spriteHw = 0;
let goldEgg: HTMLCanvasElement | null = null;
let hotEgg: HTMLCanvasElement | null = null;

// narrower on top: a taller top half over a squatter bottom one
function eggPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.1 * hh, hw, 1.1 * hh, 0, Math.PI, Math.PI * 2);
  ctx.ellipse(cx, cy + 0.1 * hh, hw, 0.9 * hh, 0, 0, Math.PI);
  ctx.closePath();
}

function buildEgg(hw: number, hh: number, hot: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil((2 * hw + 2 * PAD) * SCALE);
  canvas.height = Math.ceil((2 * hh + 2 * PAD) * SCALE);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  const cx = hw + PAD;
  const cy = hh + PAD;
  const fill = ctx.createRadialGradient(
    cx - 0.35 * hw,
    cy - 0.45 * hh,
    0,
    cx - 0.35 * hw,
    cy - 0.45 * hh,
    1.7 * hh,
  );
  fill.addColorStop(0, hot ? COLOR.white : "#FFF4B0");
  fill.addColorStop(0.45, hot ? "#FFF7D6" : COLOR.heavenlyGold);
  fill.addColorStop(1, hot ? "#FFD24A" : COLOR.goldStandardAmber);
  eggPath(ctx, cx, cy, hw, hh);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = hot ? "#FFE38A" : COLOR.coinOutline;
  ctx.stroke();
  ctx.fillStyle = COLOR.white;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.ellipse(
    cx - 0.4 * hw,
    cy - 0.48 * hh,
    0.2 * hw,
    0.32 * hh,
    0.45,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(cx - 0.12 * hw, cy - 0.78 * hh, 0.07 * hw, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function eggSprites(hw: number, hh: number): void {
  const key = Math.round(hw);
  if (goldEgg && spriteHw === key) return;
  spriteHw = key;
  goldEgg = buildEgg(hw, hh, false);
  hotEgg = buildEgg(hw, hh, true);
}

const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const egg: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

export const forceGoldenEggEvent = registerWispEvent(
  KEY,
  meta.label,
  () => meta.chance,
  (floor, context, area) => {
    const { dropMs, chargeMs, cracks, crackCoins, reward, holdMs, mergeMs } =
      meta.values;
    const width = area.right - area.left;
    const hw = Math.min(width * EGG_W, (area.bottom - area.top) * HEIGHT_CAP);
    const hh = hw * EGG_TALL;
    eggSprites(hw, hh);
    const gold = goldEgg!;
    const hot = hotEgg!;
    const home: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const startY = area.top - hh * 1.5;
    const climaxMs = dropMs + chargeMs;
    const charge = planCharge(dropMs, chargeMs, {
      shake: [0.05, 0.4],
      climaxShake: 3.8,
      bang: false,
    });

    // the floors in view: their bars' middles, and the streaks' sources
    const onScreen = context.getOnScreenFloors?.() ?? [];
    const top = onScreen.find((entry) => entry.floor === floor)?.top ?? 0;
    const barX: number[] = [];
    const barY: number[] = [];
    const sourceX: number[] = [];
    const sourceY: number[] = [];
    for (const entry of onScreen) {
      if (barX.length >= MAX_FLOORS) break;
      const isGround = context.floors.indexOf(entry.floor) === 0;
      const center = getIncomeBarCenter(isGround);
      const bar = getIncomeBarBox(isGround);
      const y = center.y + entry.top - top;
      if (y < area.top || y > area.bottom) continue;
      barX.push(center.x);
      barY.push(y);
      for (let i = 0; i < STREAM; i++) {
        sourceX.push(bar.x + bar.width * hash01(i, sourceX.length + 5520));
        sourceY.push(y);
      }
    }
    if (barX.length === 0) {
      const total = totalSpot(area);
      barX.push(total.x);
      barY.push(total.y);
    }
    // warped time: the streaks' trips come quicker and quicker
    const trips = (ms: number) => {
      const t = Math.max(0, ms - dropMs);
      return (t + ((ACCEL - 1) * t * t) / (2 * chargeMs)) / CYCLE_MS;
    };

    // the cracks: when, how hard, their zigzags (in the egg's half sizes)
    // and the spot each spills its cash from
    const crackAt: number[] = [];
    const crackPower: number[] = [];
    const crackU = new Float32Array(cracks * (SEGS + 1));
    const crackV = new Float32Array(cracks * (SEGS + 1));
    const spillX: number[] = [];
    const spillY: number[] = [];
    for (let k = 0; k < cracks; k++) {
      crackAt.push(dropMs + chargeMs * ((k + 1) / (cracks + 1)) ** CRACK_CURVE);
      crackPower.push(lerp(CRACK_POWER, k / (cracks - 1)));
      let u = (hash01(k, 5510) - 0.5) * 0.9;
      let v = (hash01(k, 5511) - 0.5) * 1.1;
      let a = hash01(k, 5512) * Math.PI * 2;
      for (let s = 0; s <= SEGS; s++) {
        crackU[k * (SEGS + 1) + s] = u;
        crackV[k * (SEGS + 1) + s] = v;
        a += (hash01(k * 7 + s, 5513) - 0.5) * 1.6;
        u += Math.cos(a) * STEP;
        v += Math.sin(a) * STEP;
        const r = Math.hypot(u, v);
        if (r > 0.9) {
          u *= 0.9 / r;
          v *= 0.9 / r;
        }
      }
      const end = k * (SEGS + 1) + SEGS;
      spillX.push(home.x + crackU[end] * hw);
      spillY.push(home.y + crackV[end] * hh);
    }

    // the shell's shards: where on the shell, their flight, spin and shape
    const shardOx = new Float32Array(SHARDS);
    const shardOy = new Float32Array(SHARDS);
    const shardVx = new Float32Array(SHARDS);
    const shardVy = new Float32Array(SHARDS);
    const shardSpin = new Float32Array(SHARDS);
    const shardPts = new Float32Array(SHARDS * 6);
    const shardX = new Float32Array(SHARDS);
    const shardY = new Float32Array(SHARDS);
    for (let i = 0; i < SHARDS; i++) {
      const a = (i / SHARDS) * Math.PI * 2 + (hash01(i, 5530) - 0.5) * 0.4;
      const speed = lerp(SHARD_SPEED, hash01(i, 5531));
      shardOx[i] = Math.cos(a) * hw * 0.7;
      shardOy[i] = Math.sin(a) * hh * 0.7;
      shardVx[i] = Math.cos(a) * speed;
      shardVy[i] = Math.sin(a) * speed - 450;
      shardSpin[i] = (hash01(i, 5532) - 0.5) * 24;
      const size = lerp(SHARD_SIZE, hash01(i, 5533)) * hw;
      for (let j = 0; j < 3; j++) {
        const b = j * 2.1 + (hash01(i * 3 + j, 5534) - 0.5) * 0.8;
        const r = size * (j === 0 ? 1 : 0.55 + 0.4 * hash01(i * 3 + j, 5535));
        shardPts[i * 6 + j * 2] = Math.cos(b) * r;
        shardPts[i * 6 + j * 2 + 1] = Math.sin(b) * r;
      }
    }

    // the flood: a river arcing out of the egg onto each floor's bar
    const floodLines: Point[][] = [];
    for (let j = 0; j < barX.length; j++) {
      const bx = barX[j];
      const by = barY[j];
      const cx = (home.x + bx) / 2 + (bx - home.x) * 0.2;
      const cy = Math.min(home.y, by) - LIFT;
      floodLines.push(
        sampleLine((u) => {
          const w = 1 - u;
          return {
            x: w * w * home.x + 2 * w * u * cx + u * u * bx,
            y: w * w * home.y + 2 * w * u * cy + u * u * by,
          };
        }, 30),
      );
    }

    // the latest crack's jolt (0..1) and which way it throws the egg
    let kick = 0;
    let kickSide = 1;
    const kickAt = (ms: number) => {
      kick = 0;
      for (let k = 0; k < cracks; k++) {
        const age = ms - crackAt[k];
        if (age < 0) break;
        if (age < JOLT_MS) {
          const f = 1 - age / JOLT_MS;
          kick = f * f * crackPower[k];
          kickSide = k % 2 ? -1 : 1;
        }
      }
    };
    // the egg's middle: dropping in, then trembling on the spot
    const eggAt = (ms: number, c: number) => {
      if (ms < dropMs) {
        const f = ms / dropMs;
        egg.x = home.x;
        egg.y = startY + (home.y - startY) * f * f;
        return;
      }
      trembleAt(c, ms, TREMBLE, shiver);
      egg.x = home.x + shiver.x;
      egg.y = home.y + shiver.y;
    };

    const thud = createBeats(
      [dropMs],
      (t) => t,
      () => {
        from.x = home.x;
        from.y = home.y + hh;
        cover!.burst(from, 0.8);
        if (!cover!.isLive()) return;
        shakeScreen(1.5);
        playBarExplosionSound(0.6);
      },
    );
    const cracking = createBeats(
      crackAt,
      (t) => t,
      (_, k) => {
        const t = k / (cracks - 1);
        const at = { x: spillX[k], y: spillY[k] };
        cover!.burst(at, lerp(CRACK_BURST, t));
        const j = k % barX.length;
        to.x = barX[j];
        to.y = barY[j];
        cover!.launchFrom(at, ringTargets(to, crackCoins, COIN_REACH));
        if (!cover!.isLive()) return;
        shakeScreen(lerp(CRACK_SHAKE, t));
        playBarExplosionSound(lerp(CRACK_RATE, t));
      },
    );
    const hatching = createBeats(
      [climaxMs],
      (t) => t,
      () => {
        cover!.blast(home);
        for (let j = 0; j < floodLines.length; j++)
          pourLine(cover!, floodLines[j], FLOOD);
      },
    );

    const drawStreaks = (ctx: CanvasRenderingContext2D, ms: number) => {
      const trip = trips(ms);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < sourceX.length; i++) {
        const seed = hash01(i, 5521);
        // not set off yet: its first trip would have begun before the start
        if (trip + seed < 1) continue;
        const u = (trip + seed) % 1;
        const e = u * u;
        const b = Math.max(0, u - LENGTH) ** 2;
        from.x = sourceX[i] + (egg.x - sourceX[i]) * b;
        from.y = sourceY[i] + (egg.y - sourceY[i]) * b;
        to.x = sourceX[i] + (egg.x - sourceX[i]) * e;
        to.y = sourceY[i] + (egg.y - sourceY[i]) * e;
        drawBeam(ctx, from, to, STREAK_W, 0.35 + 0.55 * u);
        stampGlimmer(ctx, to.x, to.y, COIN_SIZE, i, COLOR.heavenlyGold);
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    };

    // the glowing cracks, in the egg's frame (its foot at 0, 0); the newest
    // one zigzagging in
    const drawCracks = (ctx: CanvasRenderingContext2D, ms: number) => {
      ctx.beginPath();
      let any = false;
      for (let k = 0; k < cracks; k++) {
        const age = ms - crackAt[k];
        if (age < 0) break;
        any = true;
        const grown = Math.min(SEGS, (age / GROW_MS) * SEGS);
        const base = k * (SEGS + 1);
        ctx.moveTo(crackU[base] * hw, (crackV[base] - 1) * hh);
        for (let s = 1; s <= SEGS; s++) {
          const f = Math.min(1, grown - (s - 1));
          if (f <= 0) break;
          const u0 = crackU[base + s - 1];
          const v0 = crackV[base + s - 1];
          ctx.lineTo(
            (u0 + (crackU[base + s] - u0) * f) * hw,
            (v0 + (crackV[base + s] - v0) * f - 1) * hh,
          );
        }
      }
      if (!any) return;
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = COLOR.white;
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    };

    const drawEgg = (ctx: CanvasRenderingContext2D, ms: number, c: number) => {
      const landed = ms - dropMs;
      const s = landed < 0 ? 0 : clamp01(1 - landed / SQUASH_MS);
      const squash = SQUASH * s * s;
      const swell = 1 + 0.06 * kick;
      const rock =
        ROCK * c * Math.sqrt(c) * Math.sin(ms * (0.018 + 0.03 * c)) +
        JOLT * kick * kickSide;
      ctx.save();
      ctx.translate(egg.x, egg.y + hh);
      ctx.rotate(rock);
      ctx.scale((1 + squash) * swell, (1 - squash) * swell);
      const x = -hw - PAD;
      const y = -2 * hh - PAD;
      const w = 2 * hw + 2 * PAD;
      const h = 2 * hh + 2 * PAD;
      ctx.drawImage(gold, x, y, w, h);
      const heat = Math.min(1, 0.9 * c * Math.sqrt(c) + 0.35 * kick);
      if (heat > 0.01) {
        ctx.globalAlpha = heat;
        ctx.drawImage(hot, x, y, w, h);
        ctx.globalAlpha = 1;
      }
      drawCracks(ctx, ms);
      ctx.restore();
    };

    const drawShards = (ctx: CanvasRenderingContext2D, age: number) => {
      const t = age / 1000;
      const f = age / SHARD_MS;
      ctx.save();
      ctx.globalAlpha = 1 - f * f;
      ctx.beginPath();
      for (let i = 0; i < SHARDS; i++) {
        const x = home.x + shardOx[i] + shardVx[i] * t;
        const y = home.y + shardOy[i] + shardVy[i] * t + 0.5 * GRAVITY * t * t;
        shardX[i] = x;
        shardY[i] = y;
        const cos = Math.cos(shardSpin[i] * t);
        const sin = Math.sin(shardSpin[i] * t);
        const p = i * 6;
        ctx.moveTo(
          x + shardPts[p] * cos - shardPts[p + 1] * sin,
          y + shardPts[p] * sin + shardPts[p + 1] * cos,
        );
        for (let j = 2; j < 6; j += 2)
          ctx.lineTo(
            x + shardPts[p + j] * cos - shardPts[p + j + 1] * sin,
            y + shardPts[p + j] * sin + shardPts[p + j + 1] * cos,
          );
        ctx.closePath();
      }
      ctx.fillStyle = COLOR.coinGold;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeStyle = COLOR.coinOutline;
      ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < SHARDS; i++)
        stampGlimmer(ctx, shardX[i], shardY[i], 30 * (1 - f), i, COLOR.white);
      endLightBatch(ctx);
      ctx.restore();
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(climaxMs, FLOOD),
          climaxMs + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: reward,
        tick: (ms, now) => {
          if (cover?.isLive()) tickCharge(charge, ms);
          thud.tick(ms, now);
          cracking.tick(ms, now);
          hatching.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms >= climaxMs) return;
          const c = chargeAt(charge, ms);
          kickAt(ms);
          eggAt(ms, c);
          if (ms >= dropMs) {
            drawStreaks(ctx, ms);
            drawChargeStreaks(ctx, egg, c, width * REACH, ms);
            drawChargeGlow(
              ctx,
              egg,
              Math.min(1, c + 0.35 * kick),
              width * GLOW,
              now,
            );
          }
          drawEgg(ctx, ms, c);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < climaxMs) {
            const latest = cracking.latest();
            if (!latest) return;
            const age = now - latest.at;
            if (age >= FLASH_MS) return;
            to.x = spillX[latest.index];
            to.y = spillY[latest.index];
            drawChargeGlow(ctx, to, 1 - age / FLASH_MS, width * PULSE, now);
            return;
          }
          const age = ms - climaxMs;
          if (age < HATCH_FLASH_MS)
            drawChargeGlow(
              ctx,
              home,
              1 - age / HATCH_FLASH_MS,
              width * 0.9,
              now,
            );
          if (age < SHARD_MS) drawShards(ctx, age);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
