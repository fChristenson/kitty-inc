// Powder Trail, a rate crit: the number bursts into lit bombs dropping onto
// every readout at once, fuses fizzing, throbbing and trembling ever faster
// while a trail of powder pours down the building from readout to readout;
// a spark races along it lighting it, and each bomb it reaches blows, bigger
// and quicker than the last; its own bar's bomb blows last into a cluster of
// blasts round it, then the biggest. Each bar runs faster for a while by how
// far down the chain it was: x2, x3 ... its own the most
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { defineBarEffect } from "../../rateBonus";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/animationStyles/explosion";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
} from "../../../../shared/wisp";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

// the number popping into bombs, dropping DROP_MS onto the readouts
const IN_MS = 110;
const POP_BLAST = 110;
const DROP_MS = 200;
const LAND = IN_MS + DROP_MS;
const ARC = 120;
const BOMB = WISP_SIZE * 1.1;
const FUSE = 70;
const SWELL = 0.5;
const TREMBLE = 8;
// the powder poured down over POUR_MS; lit FUSE_MS after the landing, a lead
// LEAD px over the first readout, the spark reaching it LEAD_MS later
const POUR_MS = 300;
const FUSE_MS = 380;
const IGNITE = LAND + FUSE_MS;
const LEAD = 140;
const LEAD_MS = 90;
// the spark's runs between bombs, closing up, all fitted into CHAIN_MAX_MS
const GAP_MS: [number, number] = [240, 110];
const CHAIN_MAX_MS = 820;
// the readouts READOUT of a bar's half width out; the trail bowing BOW px
const READOUT = 0.6;
const BOW = 70;
const POWDER = 9;
const BURN = 16;
const BURN_CORE = 5;
const FRONT = 55;
const SPARK = WISP_SIZE * 0.8;
const TRAIL_FADE_MS = 300;
// the blasts, growing down the chain; its own a cluster then the biggest
const BLAST: [number, number] = [110, 210];
const OWN_BLAST = 240;
const CLUSTER = 5;
const CLUSTER_EVERY = 50;
const CLUSTER_REACH: [number, number] = [90, 160];
const CLUSTER_BLAST: [number, number] = [120, 170];
const HUGE_BLAST = 340;
// only the newest FULL blasts draw whole; older ones fade as a flash
const FULL = 3;
const LAND_SHAKE = 0.6;
const RUMBLES = 6;
const RUMBLE_SHAKE: [number, number] = [0.15, 0.6];
const BLOW_SHAKE: [number, number] = [0.2, 1.4];
// shakes by step: a cluster blast, a bar's bomb, its own biggest
const SHAKES = [0.6, 0.8, 3.2];
// a chain's rewards count up while they keep landing this close together
const STALE_MS = 2000;

const BLINK = fadeStops(COLOR.heavenlyGold);

interface Blast {
  // -1: the flash's middle
  bar: number;
  dx: number;
  dy: number;
  at: number;
  size: number;
}
interface State {
  half: number;
  // the chain, top to bottom, its own last, and when each bomb blows
  order: number[];
  blows: number[];
  bows: number[];
  blasts: Blast[];
  kicks: number[];
  powers: number[];
  drop: ((ms: number) => Point | null)[];
  stuck: ((ms: number) => Point)[];
  end: number;
}
const states = new WeakMap<Running, State>();
let frameBars: Point[] = [];
let cur: State | null = null;
const A: Point = { x: 0, y: 0 };
const B: Point = { x: 0, y: 0 };
const C: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const spark: Point = { x: 0, y: 0 };

// a bar running `speed` times as fast till `until`
const fused = defineBarEffect<{ speed: number; until: number }>({
  speed: (f) => f.speed,
  ended: (f, now) => now >= f.until,
});
// each run's rewards landed so far, by its own floor
const chains = new WeakMap<Floor, { n: number; at: number }>();

function readout(bar: number, out: Point): Point {
  out.x = frameBars[bar].x + cur!.half * READOUT;
  out.y = frameBars[bar].y;
  return out;
}

// trail segment k into A (from), C (bow) and B (onto bomb k)
function segment(k: number): void {
  const s = cur!;
  readout(s.order[k], B);
  if (k === 0) {
    A.x = B.x;
    A.y = B.y - LEAD;
  } else readout(s.order[k - 1], A);
  C.x = (A.x + B.x) / 2 + s.bows[k];
  C.y = (A.y + B.y) / 2;
}

// the trail from its start up to `upTo` segments along
function traceTrail(ctx: CanvasRenderingContext2D, upTo: number): void {
  ctx.beginPath();
  const n = cur!.order.length;
  for (let k = 0; k < n && k < upTo; k++) {
    segment(k);
    if (k === 0) ctx.moveTo(A.x, A.y);
    const u = Math.min(1, upTo - k);
    if (u >= 1) {
      ctx.quadraticCurveTo(C.x, C.y, B.x, B.y);
      continue;
    }
    const v = 1 - u;
    ctx.quadraticCurveTo(
      lerp(A.x, C.x, u),
      lerp(A.y, C.y, u),
      v * v * A.x + 2 * v * u * C.x + u * u * B.x,
      v * v * A.y + 2 * v * u * C.y + u * u * B.y,
    );
  }
}

// how many segments the spark has burned by ms
function burnAt(ms: number): number {
  const { blows } = cur!;
  if (ms <= IGNITE) return 0;
  for (let k = 0; k < blows.length; k++) {
    if (ms >= blows[k]) continue;
    const from = k === 0 ? IGNITE : blows[k - 1];
    return k + (ms - from) / (blows[k] - from);
  }
  return blows.length;
}

// the spark on the trail at ms: a pure function of ms, so its trail follows
function sparkAt(ms: number): Point | null {
  const s = cur!;
  if (ms < IGNITE || ms > s.end) return null;
  const n = s.order.length;
  const burnt = burnAt(ms);
  const k = Math.min(n - 1, Math.floor(burnt));
  const u = burnt - k;
  segment(k);
  const v = 1 - u;
  spark.x = v * v * A.x + 2 * v * u * C.x + u * u * B.x;
  spark.y = v * v * A.y + 2 * v * u * C.y + u * u * B.y;
  return spark;
}

registerFloorCrit("powderTrailCrit", {
  reward(t) {
    t.flipRate();
    const { ms, maxSpeed } = meta.values;
    let speed = maxSpeed;
    if (t.own) chains.delete(t.ownFloor);
    else {
      let chain = chains.get(t.ownFloor);
      if (!chain || t.now - chain.at > STALE_MS) {
        chain = { n: 0, at: t.now };
        chains.set(t.ownFloor, chain);
      }
      chain.n++;
      chain.at = t.now;
      speed = Math.min(maxSpeed, 1 + chain.n);
    }
    fused.set(t.floor, { speed, until: t.now + ms });
    t.punch(`x${speed} Speed`);
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const n = order.length;
    const gaps: number[] = [];
    let sum = 0;
    for (let k = 0; k < n - 1; k++) {
      const gap = lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, n - 2));
      gaps.push(gap);
      sum += gap;
    }
    const fit = sum > CHAIN_MAX_MS ? CHAIN_MAX_MS / sum : 1;
    const blows: number[] = [];
    const bows: number[] = [];
    let t = IGNITE + LEAD_MS;
    for (let k = 0; k < n; k++) {
      blows.push(t);
      bows.push(k === 0 ? 0 : k % 2 ? BOW : -BOW);
      if (k < n - 1) t += gaps[k] * fit;
    }
    const blasts: Blast[] = [
      { bar: -1, dx: 0, dy: 0, at: IN_MS, size: POP_BLAST },
    ];
    const kicks = [LAND];
    const powers = [LAND_SHAKE];
    for (let k = 1; k <= RUMBLES; k++) {
      kicks.push(
        LAND + (blows[0] - LAND) * (1 - (1 - k / (RUMBLES + 1)) ** 1.8),
      );
      powers.push(lerp(RUMBLE_SHAKE[0], RUMBLE_SHAKE[1], k / RUMBLES));
    }
    const drop: ((ms: number) => Point | null)[] = [];
    const stuck: ((ms: number) => Point)[] = [];
    for (let k = 0; k < n; k++) {
      const bar = order[k];
      const own = k === n - 1;
      const g = k / Math.max(1, n - 1);
      blasts.push({
        bar,
        dx: 0,
        dy: 0,
        at: blows[k],
        size: own ? OWN_BLAST : lerp(BLAST[0], BLAST[1], g),
      });
      hit(bar, blows[k], own ? 0 : 1);
      kicks.push(blows[k]);
      powers.push(lerp(BLOW_SHAKE[0], BLOW_SHAKE[1], g));
      const fall: Point = { x: 0, y: 0 };
      drop.push((ms) => {
        if (ms < IN_MS || ms > LAND) return null;
        const u = (ms - IN_MS) / DROP_MS;
        const e = u ** 1.6;
        readout(bar, fall);
        fall.x *= e;
        fall.y = fall.y * e - ARC * 4 * u * (1 - u);
        return fall;
      });
      const sat: Point = { x: 0, y: 0 };
      const blow = blows[k];
      stuck.push((ms) => {
        readout(bar, sat);
        const burn = clamp01((ms - LAND) / (blow - LAND));
        const shiver = TREMBLE * burn * burn;
        sat.x += Math.sin(ms * 0.9 + k * 2) * shiver;
        sat.y += Math.cos(ms * 1.1 + k) * shiver;
        return sat;
      });
    }
    // its own: a cluster of blasts bursting out round it, then the biggest
    const ownBlow = blows[n - 1];
    for (let c = 0; c < CLUSTER; c++) {
      const u = c / (CLUSTER - 1);
      const a = (c / CLUSTER) * Math.PI * 2 + 0.3;
      const reach = lerp(CLUSTER_REACH[0], CLUSTER_REACH[1], u);
      const at = ownBlow + (c + 1) * CLUSTER_EVERY;
      blasts.push({
        bar: 0,
        dx: Math.cos(a) * reach,
        dy: Math.sin(a) * reach * 0.6,
        at,
        size: lerp(CLUSTER_BLAST[0], CLUSTER_BLAST[1], u),
      });
      hit(0, at, 0);
    }
    const huge = ownBlow + (CLUSTER + 1) * CLUSTER_EVERY;
    blasts.push({ bar: 0, dx: 0, dy: 0, at: huge, size: HUGE_BLAST });
    hit(0, huge, 2);
    states.set(r, {
      half: r.play.barHalfWidth,
      order,
      blows,
      bows,
      blasts,
      kicks,
      powers,
      drop,
      stuck,
      end: ownBlow,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    frameBars = bars;
    cur = s;
    while (r.kicked < s.kicks.length && ms >= s.kicks[r.kicked])
      r.shake(s.powers[r.kicked++]);
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * lerp(1, 0.4, (ms / IN_MS) ** 2),
      );
    const n = s.order.length;
    // the powder, poured down, burning gold behind the spark
    const pour = clamp01((ms - LAND) / POUR_MS) * n;
    const fade = 1 - clamp01((ms - s.end) / TRAIL_FADE_MS);
    if (pour > 0 && fade > 0) {
      const burnt = burnAt(ms);
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = fade;
      traceTrail(ctx, pour);
      ctx.strokeStyle = COLOR.coinOutline;
      ctx.lineWidth = POWDER;
      ctx.stroke();
      if (burnt > 0) {
        ctx.globalCompositeOperation = "lighter";
        traceTrail(ctx, burnt);
        ctx.strokeStyle = COLOR.heavenlyGold;
        ctx.lineWidth = BURN;
        ctx.globalAlpha = 0.45 * fade;
        ctx.stroke();
        ctx.strokeStyle = COLOR.white;
        ctx.lineWidth = BURN_CORE;
        ctx.globalAlpha = 0.8 * fade;
        ctx.stroke();
      }
      ctx.restore();
    }
    // the bombs dropping, then fizzing on the readouts till they blow
    for (let k = 0; k < n; k++) {
      drawWispBetween(ctx, s.drop[k], ms, now, BOMB, 0.5, IN_MS, LAND);
      const blow = s.blows[k];
      if (ms < LAND || ms >= blow) continue;
      const burn = (ms - LAND) / (blow - LAND);
      const at = s.stuck[k](ms);
      drawLitFuse(ctx, at, burn, FUSE * (1 + 0.4 * burn), now);
      drawWispHead(
        ctx,
        s.stuck[k],
        ms,
        now,
        BOMB * (1 + SWELL * burn * burn),
        burn,
      );
    }
    // the spark racing along, a fizz of light at the burning front
    const front = sparkAt(ms);
    if (front) {
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.8;
      drawGlow(
        ctx,
        BLINK,
        front.x,
        front.y,
        FRONT * (1 + 0.3 * Math.sin(ms * 0.08)),
      );
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = prev;
    }
    drawWispBetween(ctx, sparkAt, ms, now, SPARK, 1, IGNITE, s.end);
    // the blasts: the newest whole, older ones fading as a flash
    const { blasts } = s;
    let fired = 0;
    while (fired < blasts.length && blasts[fired].at <= ms) fired++;
    for (let i = 0; i < fired; i++) {
      const b = blasts[i];
      const since = ms - b.at;
      if (since >= DETONATION_MS) continue;
      if (b.bar < 0) {
        spot.x = b.dx;
        spot.y = b.dy;
      } else {
        readout(b.bar, spot);
        spot.x += b.dx;
        spot.y += b.dy;
      }
      if (i >= fired - FULL) {
        drawDetonation(ctx, spot, since, b.size, now);
        continue;
      }
      const age = since / DETONATION_MS;
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.8 * (1 - age) * (1 - age);
      drawGlow(ctx, BLINK, spot.x, spot.y, b.size * 0.45 * (1 + age));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = prev;
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
