// Four-Leaf Clover, a rate crit: hundreds of gold-green dots stream in from
// all round, faster and faster, drawing a giant four-leaf clover left of the
// readouts, leaf by leaf (each a flash and a click), then its stem and heart;
// it trembles, blazes and pops; its leaves peel off in showers of dots into
// every other bar's readout, quicker each, while the stem and heart throb
// ever faster and rumble, then slam into its own readout in a blast. The
// bar's next payouts each pay the multiplier of the crit tier armed on its
// floor's upgrade button when they land
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import { getCritTier } from "../../../floorCrits/upgradeCrit";
import { CRIT_TIER_CONFIG } from "../../../critTypes";
import type { Floor } from "../../../../gameState";
import {
  SHAPES,
  shapeFill,
  type Shape,
} from "../../../../shared/animationStyles/drawing";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSpinTick } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import {
  bottomBarY,
  holeHash,
  ownLast,
  topBarY,
} from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the clover SIZE_K of a bar's half width (at most SIZE_MAX) from its heart
// to its tips, SIDE of a bar's half width left of the bars' middle
const SIZE_K = 0.42;
const SIZE_MAX = 240;
const SIDE = 0.55;
// each leaf a heart LEAF across, its tip TIP_GAP off the middle, about
// LEAF_DOTS dots; the stem STEM_DOTS pairs STEM_W apart; the heart a ring
const LEAF = 0.42;
const TIP_GAP = 0.03;
const LEAF_DOTS = 64;
const LEAF_MID = 0.4;
const STEM_DOTS = 26;
const STEM_W = 0.022;
const HEART_RING = 8;
const HEART_R = 0.07;
const DOT = 0.06;
// each dot streaming in IN_FLY_MS from SRC_R away, landing from DRAW_FROM
// over DRAW_MS, quicker and quicker (its share of the time to DRAW_POW),
// popping POP bigger over POP_MS
const SRC_R: [number, number] = [2.1, 2.9];
const SRC_SPREAD = 1.1;
const IN_FLY_MS = 170;
const DRAW_FROM = 60;
const DRAW_MS = 820;
const DRAW_POW = 0.6;
const POP_MS = 70;
const POP = 0.9;
const TREMBLE = 7;
const OWN_TREMBLE = 12;
const TREMBLE_MS = 16;
const BEAT_MS = 110;
const BLAZE_MS = 180;
const BLAZE_POP_MS = 150;
// the leaves' showers: a chunk of dots per other bar, leaving over CHAIN_MS
// (closing up, CHAIN_POW), each spread over CHUNK_SPREAD_MS, flying FLY_MS
// (quicker each) on an ARC
const CHAIN_MS = 300;
const CHAIN_POW = 0.7;
const CHUNK_SPREAD_MS = 50;
const FLY_MS: [number, number] = [210, 140];
const ARC = 70;
// a readout READOUT of a bar's half width out, CONTACT_Y off its middle
const READOUT = 0.6;
const CONTACT_Y = -20;
const JITTER: [number, number] = [36, 18];
const HIT_FLASH = 120;
const HIT_FLASH_MS = 130;
// the stem and heart throbbing PULSES times, quickening, and rumbling, then
// slamming in over SLAM_MS, the stem's tip first, OWN_AFTER after the last
// shower
const OWN_AFTER = 70;
const OWN_SPREAD_MS = 45;
const SLAM_MS = 150;
const PULSES = 5;
const RUMBLES = 3;
const RUMBLE_SHAKE: [number, number] = [0.4, 1.1];
const OWN_BLAST = 340;
const LEAF_SHAKE = [0.3, 0.45, 0.6, 0.8];
const LEAF_TICK = [1, 1.1, 1.2, 1.3];
// shakes by step: -, a readout, its own
const SHAKES = [0.5, 0.7, 3.2];

const GOLD = COLOR.heavenlyGold;
const GREEN = COLOR.potionGreen;
const LIGHT = COLOR.potionGreenLight;

// the clover in a unit box: leaves top left, top right, bottom right,
// bottom left, each filling from its tip out; then the stem; then the heart
const LEAF_DIRS = [-0.75, -0.25, 0.25, 0.75].map((k) => k * Math.PI);
const UNIT: Point = { x: 0, y: 0 };

// the heart turned to point along a, its tip at the middle
function leafShape(a: number): Shape {
  const ct = Math.cos(a + Math.PI / 2);
  const st = Math.sin(a + Math.PI / 2);
  const gx = Math.cos(a) * TIP_GAP;
  const gy = Math.sin(a) * TIP_GAP;
  return SHAPES.heart.map((loop) =>
    loop.map((p) => {
      const x = p.x * LEAF;
      const y = (p.y - 0.9) * LEAF;
      return { x: gx + x * ct - y * st, y: gy + x * st + y * ct };
    }),
  );
}

const pts: Point[] = [];
const srcDir: number[] = [];
const LEAF_END = new Int16Array(4);
LEAF_DIRS.forEach((a, l) => {
  const dots = shapeFill(leafShape(a), LEAF_DOTS, UNIT, 1);
  dots.sort((p, q) => p.x * p.x + p.y * p.y - (q.x * q.x + q.y * q.y));
  for (const d of dots) {
    pts.push(d);
    srcDir.push(a);
  }
  LEAF_END[l] = pts.length - 1;
});
const STEM_FROM = pts.length;
for (let j = 0; j < STEM_DOTS; j++) {
  const p = j / (STEM_DOTS - 1);
  const x = 2 * (1 - p) * p * 0.06 + p * p * 0.32;
  const y = (1 - p) ** 2 * 0.08 + 2 * (1 - p) * p * 0.6 + p * p * 0.98;
  pts.push({ x: x - STEM_W, y }, { x: x + STEM_W, y });
  srcDir.push(Math.PI / 2, Math.PI / 2);
}
const HEART_FROM = pts.length;
for (let k = 0; k < HEART_RING; k++) {
  const a = (k / HEART_RING) * Math.PI * 2;
  pts.push({ x: Math.cos(a) * HEART_R, y: Math.sin(a) * HEART_R });
  srcDir.push(a);
}
pts.push({ x: 0, y: 0 });
srcDir.push(-Math.PI / 2);
const N = pts.length;
const LEAVES = LEAF_END[3] + 1;

// each dot's spot and where it streams in from (unit box), its jitter on a
// readout (px), and when it lands
const UX = new Float32Array(N);
const UY = new Float32Array(N);
const SX = new Float32Array(N);
const SY = new Float32Array(N);
const JX = new Float32Array(N);
const JY = new Float32Array(N);
const LAND = new Float32Array(N);
for (let i = 0; i < N; i++) {
  UX[i] = pts[i].x;
  UY[i] = pts[i].y;
  const a = srcDir[i] + (holeHash(i, 7311) - 0.5) * SRC_SPREAD;
  const r = lerp(SRC_R[0], SRC_R[1], holeHash(i, 7312));
  SX[i] = Math.cos(a) * r;
  SY[i] = Math.sin(a) * r;
  JX[i] = (holeHash(i, 7313) - 0.5) * JITTER[0];
  JY[i] = (holeHash(i, 7314) - 0.5) * JITTER[1];
  LAND[i] = DRAW_FROM + IN_FLY_MS + DRAW_MS * (i / (N - 1)) ** DRAW_POW;
}
const LEAF_X = new Float32Array(4);
const LEAF_Y = new Float32Array(4);
for (let l = 0; l < 4; l++) {
  LEAF_X[l] = Math.cos(LEAF_DIRS[l]) * LEAF_MID;
  LEAF_Y[l] = Math.sin(LEAF_DIRS[l]) * LEAF_MID;
}
const STEM_DONE = LAND[HEART_FROM - 1];
const DRAWN = LAND[N - 1];
const STREAM = DRAWN + BLAZE_MS;

// the green glimmers painted now, at load, not mid-crit
{
  const warm = document.createElement("canvas");
  warm.width = warm.height = 1;
  const g = warm.getContext("2d");
  if (g)
    for (const color of [GREEN, LIGHT])
      for (const size of [6, 40, 400]) stampGlimmer(g, 0, 0, size, 0, color);
}

interface State {
  // each dot's bar, when it leaves the clover and how long it flies
  dest: Int16Array;
  leave: Float32Array;
  fly: Float32Array;
  // each shower's bar and when it hits
  chunkBar: Int16Array;
  chunkHit: Float32Array;
  ownLaunch: number;
  ownHit: number;
  // shakes and ticks kicked by the crit itself, in time order
  kickAt: Float32Array;
  kickShake: Float32Array;
  kickTick: Float32Array;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const TEXT = { alpha: 1 };

// payouts left, each paying the tier armed on its floor's button; the floor
// kept off the value so a floor's clone never reads the original's button
interface Lucky {
  left: number;
}
const luckyFloor = new WeakMap<Lucky, Floor>();
function luckyPays(v: Lucky): number {
  const floor = luckyFloor.get(v);
  const tier = floor ? getCritTier(floor) : null;
  return Math.max(
    meta.values.min,
    tier ? CRIT_TIER_CONFIG[tier].multiplier : 0,
  );
}
const lucky = defineBarEffect<Lucky>({
  payout: luckyPays,
  onPayout: (v) => {
    if (v.left <= 1) return undefined;
    v.left--;
    return v;
  },
});

registerFloorCrit("fourLeafCloverCrit", {
  reward(t) {
    t.flipRate();
    const add = t.own ? meta.values.ownPayouts : meta.values.payouts;
    let v = lucky.get(t.floor);
    if (v) v.left += add;
    else {
      v = { left: add };
      lucky.set(t.floor, v);
    }
    luckyFloor.set(v, t.floor);
    t.punch(`x${Math.round(luckyPays(v) * 100) / 100}`);
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const m = order.length - 1;
    const chunkBar = new Int16Array(m);
    const chunkHit = new Float32Array(m);
    const launchOf = (j: number) => STREAM + CHAIN_MS * (j / m) ** CHAIN_POW;
    const flyOf = (j: number) =>
      lerp(FLY_MS[0], FLY_MS[1], m > 1 ? j / (m - 1) : 0);
    let lastOther = STREAM;
    for (let j = 0; j < m; j++) {
      chunkBar[j] = order[j];
      chunkHit[j] = launchOf(j) + CHUNK_SPREAD_MS + flyOf(j);
      hit(order[j], chunkHit[j], 1);
      lastOther = Math.max(lastOther, chunkHit[j]);
    }
    const ownLaunch = Math.max(
      STREAM + CHAIN_MS,
      lastOther + OWN_AFTER - OWN_SPREAD_MS - SLAM_MS,
    );
    const ownHit = ownLaunch + OWN_SPREAD_MS + SLAM_MS;
    hit(0, ownHit, 2);
    const dest = new Int16Array(N);
    const leave = new Float32Array(N);
    const fly = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      if (i < LEAVES && m > 0) {
        const at = (i * m) / LEAVES;
        const j = Math.floor(at);
        dest[i] = order[j];
        leave[i] = launchOf(j) + CHUNK_SPREAD_MS * (at - j);
        fly[i] = flyOf(j);
      } else {
        // the leaves (when it's alone), the stem from its tip, the heart last
        const q =
          i >= HEART_FROM
            ? 1
            : i >= STEM_FROM
              ? 1 - (i - STEM_FROM) / (HEART_FROM - STEM_FROM)
              : i / LEAVES;
        dest[i] = 0;
        leave[i] = ownLaunch + OWN_SPREAD_MS * q;
        fly[i] = SLAM_MS;
      }
    }
    const kicks: { at: number; shake: number; tick: number }[] = [];
    for (let l = 0; l < 4; l++)
      kicks.push({
        at: LAND[LEAF_END[l]],
        shake: LEAF_SHAKE[l],
        tick: LEAF_TICK[l],
      });
    kicks.push({ at: STEM_DONE, shake: 0.9, tick: 1.4 });
    kicks.push({ at: DRAWN, shake: 1.1, tick: 1.5 });
    kicks.push({ at: STREAM, shake: 1.6, tick: 1.7 });
    for (let k = 1; k <= RUMBLES; k++)
      kicks.push({
        at: lerp(STREAM, ownLaunch, k / (RUMBLES + 1)),
        shake: lerp(RUMBLE_SHAKE[0], RUMBLE_SHAKE[1], k / RUMBLES),
        tick: 0,
      });
    kicks.sort((a, b) => a.at - b.at);
    states.set(r, {
      dest,
      leave,
      fly,
      chunkBar,
      chunkHit,
      ownLaunch,
      ownHit,
      kickAt: Float32Array.from(kicks, (k) => k.at),
      kickShake: Float32Array.from(kicks, (k) => k.shake),
      kickTick: Float32Array.from(kicks, (k) => k.tick),
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS) {
      TEXT.alpha = 1 - ms / IN_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + (0.4 * ms) / IN_MS),
        TEXT,
      );
    }
    while (r.kicked < s.kickAt.length && ms >= s.kickAt[r.kicked]) {
      const k = r.kicked;
      if (s.kickShake[k] > 0) r.shake(s.kickShake[k]);
      if (s.kickTick[k] > 0) playSpinTick(s.kickTick[k]);
      r.kicked++;
    }
    const n = bars.length;
    const half = r.play.barHalfWidth;
    const readX = half * READOUT;
    spot.x = bars[0].x + readX;
    spot.y = bars[0].y + CONTACT_Y;
    if (ms < s.ownHit + HIT_FLASH_MS) {
      const size = Math.min(SIZE_MAX, half * SIZE_K);
      const cx = bars[0].x - half * SIDE;
      const cy = (topBarY(bars) + bottomBarY(bars)) / 2;
      const f = Math.floor(ms / TREMBLE_MS);
      const shiver =
        ms < STREAM
          ? TREMBLE * clamp01((ms - DRAW_FROM) / (STREAM - DRAW_FROM)) ** 2
          : OWN_TREMBLE * clamp01((ms - STREAM) / (s.ownLaunch - STREAM));
      const ox = shiver * (holeHash(f, 7301) * 2 - 1);
      const oy = shiver * (holeHash(f, 7302) * 2 - 1);
      const blaze = clamp01((ms - DRAWN) / BLAZE_MS);
      const white = ms >= DRAWN + BLAZE_MS * 0.5 && ms < STREAM + BLAZE_POP_MS;
      const dot = size * DOT;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < N; i++) {
        const land = LAND[i];
        if (ms < land - IN_FLY_MS) break;
        const leave = s.leave[i];
        let x: number;
        let y: number;
        let sz = dot;
        if (ms < land) {
          const u = (ms - land + IN_FLY_MS) / IN_FLY_MS;
          const e = u * u;
          x = cx + lerp(SX[i], UX[i], e) * size;
          y = cy + lerp(SY[i], UY[i], e) * size;
        } else if (ms < leave) {
          x = cx + UX[i] * size + ox;
          y = cy + UY[i] * size + oy;
          const pop = 1 - (ms - land) / POP_MS;
          sz = dot * (1 + 0.9 * blaze + (pop > 0 ? POP * pop : 0));
        } else {
          const u = (ms - leave) / s.fly[i];
          const b = s.dest[i];
          if (u >= 1 || b >= n) continue;
          const own = b === 0;
          const e = own ? u * u * u : u * u;
          x = lerp(cx + UX[i] * size, bars[b].x + readX + JX[i], e);
          y =
            lerp(cy + UY[i] * size, bars[b].y + CONTACT_Y + JY[i], e) -
            ARC * 4 * u * (1 - u) * (own ? 0.3 : 1);
          sz = dot * (1.6 - 0.5 * e);
        }
        const c = i % 3;
        stampGlimmer(
          ctx,
          x,
          y,
          sz,
          i + ms * 0.004,
          c === 0 ? GOLD : c === 1 ? GREEN : white ? COLOR.white : LIGHT,
        );
      }
      // each leaf, the stem and the heart flashing as they're done
      for (let l = 0; l < 4; l++) {
        const since = ms - LAND[LEAF_END[l]];
        if (since >= 0 && since < BEAT_MS)
          stampGlimmer(
            ctx,
            cx + LEAF_X[l] * size + ox,
            cy + LEAF_Y[l] * size + oy,
            size * 0.8 * (1 + 0.15 * l) * (1 - since / BEAT_MS),
            l,
            LIGHT,
          );
      }
      const stemSince = ms - STEM_DONE;
      if (stemSince >= 0 && stemSince < BEAT_MS)
        stampGlimmer(
          ctx,
          cx + 0.14 * size + ox,
          cy + 0.55 * size + oy,
          size * (1 - stemSince / BEAT_MS),
          4,
          LIGHT,
        );
      // the blaze swelling, then popping
      if (ms >= DRAWN && ms < STREAM)
        stampGlimmer(
          ctx,
          cx + ox,
          cy + oy,
          size * (0.7 + 1.1 * blaze),
          5,
          GREEN,
        );
      const popSince = ms - STREAM;
      if (popSince >= 0 && popSince < BLAZE_POP_MS)
        stampGlimmer(
          ctx,
          cx,
          cy,
          size * 2.4 * (1 - popSince / BLAZE_POP_MS),
          6,
          COLOR.white,
        );
      // the stem and heart throbbing quicker and quicker
      if (ms >= STREAM && ms < s.ownLaunch + OWN_SPREAD_MS) {
        const p = clamp01((ms - STREAM) / (s.ownLaunch - STREAM));
        const beat = PULSES * p ** 1.6;
        stampGlimmer(
          ctx,
          cx + ox,
          cy + oy,
          size * (0.3 + 0.5 * p) * (1.4 - (beat - Math.floor(beat))),
          7,
          GREEN,
        );
      }
      // each shower hitting its readout
      for (let j = 0; j < s.chunkHit.length; j++) {
        const since = ms - s.chunkHit[j];
        const b = s.chunkBar[j];
        if (since < 0 || since >= HIT_FLASH_MS || b >= n) continue;
        stampGlimmer(
          ctx,
          bars[b].x + readX,
          bars[b].y + CONTACT_Y,
          HIT_FLASH * (1 - since / HIT_FLASH_MS),
          j,
          LIGHT,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    drawDetonation(ctx, spot, ms - s.ownHit, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
