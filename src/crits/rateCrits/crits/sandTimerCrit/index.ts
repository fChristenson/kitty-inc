// Sand Timer, a rate crit: hundreds of gold dots stream in from all round,
// faster and faster, drawing a giant hourglass left of the readouts: its
// frame (a flash and a click), its two glass bulbs (another), then the sand
// heaping up in the top bulb from the neck; it trembles, blazes and flips
// over in a squash and a white pop, then its sand pours out of the neck in
// streams of dots that swing down and out into every other bar's readout,
// quicker each, while the glass throbs ever faster and rumbles; the last of
// the sand and the glass and frame shatter into its own readout in a blast.
// The bar pays x`payout` for a while, every payout topping the time up
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  shapeFill,
  shapeOutline,
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
// the hourglass SIZE_K of a bar's half width (at most SIZE_MAX) from its
// neck to its top, SIDE of a bar's half width left of the bars' middle
const SIZE_K = 0.5;
const SIZE_MAX = 280;
const SIDE = 0.6;
// the glass's bulbs BULB wide at their ends (ENDS off the neck), NECK at it
const ENDS = 0.84;
const BULB = 0.5;
const NECK = 0.05;
const FRAME_DOTS = 130;
const GLASS_DOTS = 110;
const SAND_DOTS = 110;
const DOT = 0.05;
// each dot streaming in IN_FLY_MS from SRC_R away, landing from DRAW_FROM
// over DRAW_MS, quicker and quicker (its share of the time to DRAW_POW),
// popping POP bigger over POP_MS
const SRC_R: [number, number] = [2.0, 2.8];
const SRC_SPREAD = 1.2;
const IN_FLY_MS = 170;
const DRAW_FROM = 60;
const DRAW_MS = 780;
const DRAW_POW = 0.6;
const POP_MS = 70;
const POP = 0.9;
const TREMBLE = 6;
const OWN_TREMBLE = 11;
const TREMBLE_MS = 16;
const BEAT_MS = 110;
// blazing BLAZE_MS, then flipping over FLIP_MS, stretching FLIP_STRETCH wide
const BLAZE_MS = 130;
const FLIP_MS = 150;
const FLIP_STRETCH = 0.35;
const POP_FLASH_MS = 150;
// the pours: a chunk of sand per other bar, leaving over CHAIN_MS (closing
// up, CHAIN_POW), each spread over CHUNK_SPREAD_MS, sliding to the neck in
// NECK_MS, then flying FLY_MS (quicker each) down and out round POUR_DIP
const CHAIN_MS = 320;
const CHAIN_POW = 0.7;
const CHUNK_SPREAD_MS = 55;
const NECK_MS = 50;
const FLY_MS: [number, number] = [200, 130];
const POUR_DIP: [number, number] = [0.35, 0.8];
// the sand kept for its own bar
const OWN_SAND = 0.25;
// a readout READOUT of a bar's half width out, CONTACT_Y off its middle
const READOUT = 0.6;
const CONTACT_Y = -20;
const JITTER: [number, number] = [36, 18];
const HIT_FLASH = 120;
const HIT_FLASH_MS = 130;
// the glass throbbing PULSES times, quickening, and rumbling, then
// shattering in over SLAM_MS, flung SHATTER out first, OWN_AFTER after the
// last pour
const OWN_AFTER = 70;
const OWN_SPREAD_MS = 45;
const SLAM_MS = 160;
const SHATTER = 0.45;
const PULSES = 5;
const RUMBLES = 3;
const RUMBLE_SHAKE: [number, number] = [0.4, 1.1];
const OWN_BLAST = 340;
// shakes by step: -, a readout, its own
const SHAKES = [0.5, 0.7, 3.2];

const GOLD = COLOR.heavenlyGold;
const WHITE = COLOR.white;

// the glass's half width at y (unit box, neck at 0)
function glassW(y: number): number {
  const s = 1 - Math.min(1, Math.abs(y) / ENDS);
  return NECK + (BULB - NECK) * Math.sqrt(Math.max(0, 1 - s * s));
}

const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];
const FRAME: Shape = [
  rect(-0.7, -1, 0.7, -0.9),
  rect(-0.7, 0.9, 0.7, 1),
  rect(-0.66, -0.9, -0.6, 0.9),
  rect(0.6, -0.9, 0.66, 0.9),
];
const GLASS_SIDE = 24;
const glassLoop: Point[] = [];
for (let k = 0; k <= GLASS_SIDE; k++) {
  const y = -ENDS + (2 * ENDS * k) / GLASS_SIDE;
  glassLoop.push({ x: -glassW(y), y });
}
for (let k = GLASS_SIDE; k >= 0; k--) {
  const y = -ENDS + (2 * ENDS * k) / GLASS_SIDE;
  glassLoop.push({ x: glassW(y), y });
}
const GLASS: Shape = [glassLoop];
// the sand heaped in the top bulb: down its walls to the neck, a mound on top
const SAND_TOP = -0.5;
const SAND_PEAK = 0.13;
const SAND_IN = 0.8;
const sandLoop: Point[] = [];
for (let k = 0; k <= 10; k++) {
  const y = SAND_TOP + ((-0.04 - SAND_TOP) * k) / 10;
  sandLoop.push({ x: -glassW(y) * SAND_IN, y });
}
for (let k = 10; k >= 0; k--) {
  const y = SAND_TOP + ((-0.04 - SAND_TOP) * k) / 10;
  sandLoop.push({ x: glassW(y) * SAND_IN, y });
}
const sandHalf = glassW(SAND_TOP) * SAND_IN;
for (let k = 1; k < 12; k++) {
  const x = sandHalf * (1 - (2 * k) / 12);
  sandLoop.push({ x, y: SAND_TOP - SAND_PEAK * (1 - (x / sandHalf) ** 2) });
}
const SAND: Shape = [sandLoop];

// the frame top down, the glass bottom up, the sand heaping up from the neck
const UNIT: Point = { x: 0, y: 0 };
const frame = shapeOutline(FRAME, FRAME_DOTS, UNIT, 1).sort(
  (p, q) => p.y - q.y,
);
const glass = shapeOutline(GLASS, GLASS_DOTS, UNIT, 1).sort(
  (p, q) => q.y - p.y,
);
const sand = shapeFill(SAND, SAND_DOTS, UNIT, 1).sort(
  (p, q) => q.y - p.y || Math.abs(p.x) - Math.abs(q.x),
);
const pts = [...frame, ...glass, ...sand];
const GLASS_FROM = frame.length;
const SAND_FROM = GLASS_FROM + glass.length;
const N = pts.length;
const SAND_N = N - SAND_FROM;
const SAND_OUT = Math.round(SAND_N * (1 - OWN_SAND));

// each dot's spot and where it streams in from (unit box), its jitter on a
// readout (px), its shatter fling and when it lands
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
  const a =
    Math.atan2(UY[i], UX[i] || 0.01) + (holeHash(i, 7411) - 0.5) * SRC_SPREAD;
  const r = lerp(SRC_R[0], SRC_R[1], holeHash(i, 7412));
  SX[i] = Math.cos(a) * r;
  SY[i] = Math.sin(a) * r;
  JX[i] = (holeHash(i, 7413) - 0.5) * JITTER[0];
  JY[i] = (holeHash(i, 7414) - 0.5) * JITTER[1];
  LAND[i] = DRAW_FROM + IN_FLY_MS + DRAW_MS * (i / (N - 1)) ** DRAW_POW;
}
const FRAME_DONE = LAND[GLASS_FROM - 1];
const GLASS_DONE = LAND[SAND_FROM - 1];
const DRAWN = LAND[N - 1];
const FLIP_FROM = DRAWN + BLAZE_MS;
const STREAM = FLIP_FROM + FLIP_MS;

interface State {
  // each dot's bar (0: its own, shattering), when it leaves the hourglass
  // and how long it flies
  dest: Int16Array;
  leave: Float32Array;
  fly: Float32Array;
  // each pour's bar and when it hits
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

// paying x`payout` till `until`, every payout adding `topUpMs`, never past
// `cap`
interface Timer {
  until: number;
  cap: number;
}
const timers = defineBarEffect<Timer>({
  payout: () => meta.values.payout,
  onPayout: (v) => {
    v.until = Math.min(v.cap, v.until + meta.values.topUpMs);
    return v;
  },
  ended: (v, now) => now >= v.until,
});

registerFloorCrit("sandTimerCrit", {
  reward(t) {
    t.flipRate();
    const { ms, ownMs, maxMs, payout } = meta.values;
    const until = t.now + (t.own ? ownMs : ms);
    const v = timers.get(t.floor);
    if (v) {
      v.until = Math.max(v.until, until);
      v.cap = Math.max(v.cap, t.now + maxMs);
    } else timers.set(t.floor, { until, cap: t.now + maxMs });
    t.punch(`x${payout}`);
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const m = order.length - 1;
    const chunkBar = new Int16Array(m);
    const chunkHit = new Float32Array(m);
    const launchOf = (j: number) => STREAM + CHAIN_MS * (j / m) ** CHAIN_POW;
    const flyOf = (j: number) =>
      NECK_MS + lerp(FLY_MS[0], FLY_MS[1], m > 1 ? j / (m - 1) : 0);
    let lastOther = STREAM;
    for (let j = 0; j < m; j++) {
      chunkBar[j] = order[j];
      chunkHit[j] = launchOf(j) + CHUNK_SPREAD_MS + flyOf(j);
      hit(order[j], chunkHit[j], 1);
      lastOther = Math.max(lastOther, chunkHit[j]);
    }
    const ownLaunch = Math.max(
      STREAM + CHAIN_MS * 0.5,
      lastOther + OWN_AFTER - OWN_SPREAD_MS - SLAM_MS,
    );
    const ownHit = ownLaunch + OWN_SPREAD_MS + SLAM_MS;
    hit(0, ownHit, 2);
    const dest = new Int16Array(N);
    const leave = new Float32Array(N);
    const fly = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const k = i - SAND_FROM;
      if (k >= 0 && k < SAND_OUT && m > 0) {
        const at = (k * m) / SAND_OUT;
        const j = Math.floor(at);
        dest[i] = order[j];
        leave[i] = launchOf(j) + CHUNK_SPREAD_MS * (at - j);
        fly[i] = flyOf(j);
      } else {
        dest[i] = 0;
        leave[i] = ownLaunch + OWN_SPREAD_MS * holeHash(i, 7415);
        fly[i] = SLAM_MS;
      }
    }
    const kicks: { at: number; shake: number; tick: number }[] = [
      { at: FRAME_DONE, shake: 0.4, tick: 1 },
      { at: GLASS_DONE, shake: 0.6, tick: 1.15 },
      { at: DRAWN, shake: 0.9, tick: 1.3 },
      { at: FLIP_FROM + FLIP_MS * 0.5, shake: 1.6, tick: 1.6 },
    ];
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
      const ox = shiver * (holeHash(f, 7401) * 2 - 1);
      const oy = shiver * (holeHash(f, 7402) * 2 - 1);
      const blaze = clamp01((ms - DRAWN) / BLAZE_MS);
      // the flip: squashed flat and stretched wide halfway, then back
      const flip = clamp01((ms - FLIP_FROM) / FLIP_MS);
      const fy = Math.abs(Math.cos(Math.PI * flip));
      const fx = 1 + FLIP_STRETCH * Math.sin(Math.PI * flip);
      const white = ms >= DRAWN + BLAZE_MS * 0.5 && ms < STREAM + POP_FLASH_MS;
      const dot = size * DOT;
      const neckY = cy + oy;
      const neckX = cx + ox;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < N; i++) {
        const land = LAND[i];
        if (ms < land - IN_FLY_MS) break;
        const leave = s.leave[i];
        const hx = cx + UX[i] * size * fx + ox;
        const hy = cy + UY[i] * size * fy + oy;
        let x: number;
        let y: number;
        let sz = dot;
        if (ms < land) {
          const u = (ms - land + IN_FLY_MS) / IN_FLY_MS;
          const e = u * u;
          x = cx + lerp(SX[i], UX[i], e) * size;
          y = cy + lerp(SY[i], UY[i], e) * size;
        } else if (ms < leave) {
          x = hx;
          y = hy;
          const pop = 1 - (ms - land) / POP_MS;
          sz = dot * (1 + 0.9 * blaze + (pop > 0 ? POP * pop : 0));
        } else {
          const fly = s.fly[i];
          const u = (ms - leave) / fly;
          const b = s.dest[i];
          if (u >= 1 || b >= n) continue;
          const tx = bars[b].x + readX + JX[i];
          const ty = bars[b].y + CONTACT_Y + JY[i];
          if (b === 0) {
            // shattering: flung out, then slammed into its own readout
            const e = u * u * u;
            const kick = SHATTER * size * Math.sin(Math.PI * u);
            x = lerp(hx, tx, e) + UX[i] * kick;
            y = lerp(hy, ty, e) + UY[i] * kick;
            sz = dot * (1.7 - 0.6 * e);
          } else {
            const nf = NECK_MS / fly;
            if (u < nf) {
              const e = (u / nf) ** 2;
              x = lerp(hx, neckX, e);
              y = lerp(hy, neckY, e);
            } else {
              // out of the neck, swinging down and out onto the readout
              const e = ((u - nf) / (1 - nf)) ** 2;
              const kx = neckX + size * POUR_DIP[0];
              const ky = neckY + size * POUR_DIP[1];
              const a = 1 - e;
              x = a * a * neckX + 2 * a * e * kx + e * e * tx;
              y = a * a * neckY + 2 * a * e * ky + e * e * ty;
            }
            sz = dot * 1.3;
          }
        }
        stampGlimmer(
          ctx,
          x,
          y,
          sz,
          i + ms * 0.004,
          white || (i < SAND_FROM && i % 3 === 0) ? WHITE : GOLD,
        );
      }
      // the frame and the glass flashing as they're done
      const frameSince = ms - FRAME_DONE;
      if (frameSince >= 0 && frameSince < BEAT_MS)
        stampGlimmer(
          ctx,
          cx + ox,
          cy + oy,
          size * 1.1 * (1 - frameSince / BEAT_MS),
          1,
          GOLD,
        );
      const glassSince = ms - GLASS_DONE;
      if (glassSince >= 0 && glassSince < BEAT_MS)
        stampGlimmer(
          ctx,
          cx + ox,
          cy + oy,
          size * 1.3 * (1 - glassSince / BEAT_MS),
          2,
          WHITE,
        );
      // the blaze swelling, then popping white as it flips
      if (ms >= DRAWN && ms < STREAM)
        stampGlimmer(
          ctx,
          cx + ox,
          cy + oy,
          size * (0.7 + 1.1 * blaze),
          3,
          GOLD,
        );
      const popSince = ms - (FLIP_FROM + FLIP_MS * 0.5);
      if (popSince >= 0 && popSince < POP_FLASH_MS)
        stampGlimmer(
          ctx,
          cx,
          cy,
          size * 2.4 * (1 - popSince / POP_FLASH_MS),
          4,
          WHITE,
        );
      // the neck throbbing quicker and quicker as it pours
      if (ms >= STREAM && ms < s.ownLaunch + OWN_SPREAD_MS) {
        const p = clamp01((ms - STREAM) / (s.ownLaunch - STREAM));
        const beat = PULSES * p ** 1.6;
        stampGlimmer(
          ctx,
          neckX,
          neckY,
          size * (0.3 + 0.5 * p) * (1.4 - (beat - Math.floor(beat))),
          5,
          GOLD,
        );
      }
      // each pour hitting its readout
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
          WHITE,
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
