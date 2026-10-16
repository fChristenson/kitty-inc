// Merry-Go-Round, a lock crit: the number arcs out over the dark locked floor
// and turns into a wisp that swoops down onto a tilted ring round the lock;
// six more, each its own colour, fall in after it one by one, bobbing up and
// down like carousel horses, the ring spinning faster with every new rider (a
// flash and a jolt as each joins) till their trails blur into glowing loops;
// then it spins to a blur, tightens, and they all slam into the lock at once,
// bursting the floor open, and scatter over it, hopping where they land:
// every worker on the opened floor goes on a long boost
import meta from "./meta";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWisp, drawWispTrail, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { playBloop, playSwoosh } from "../../../../sound";
import { activateBoosted } from "../../../../gameState";
import { FLOOR_X_MAX, FLOOR_X_MIN } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  getRenderedWorkerCount,
  WORKER_FEET_Y,
  wiggleWorkerBoost,
} from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";

const N = 7;
// the number arcing out to LEAD_FROM (from the lock) over ARC_MS
const ARC_MS = 170;
const ARC_RISE = 120;
const LEAD_FROM: Point = { x: -520, y: -300 };
// the others falling in from FROM px out round the top, each SWOOP_MS onto
// the ring, joining at JOINS (quickening)
const FROM: Point = { x: 640, y: 440 };
const SWOOP_MS = 200;
const SWOOP_BOW = 0.22;
const JOINS = [370, 560, 720, 850, 950, 1030, 1100];
// the ring: RX by RY px, tilted TILT; one rider turns it once in TURN_MS,
// each more GROW times faster, then it spins up BLUR_GROW more while
// tightening to TIGHT of its size, and slams in
const RX = 250;
const RY = 72;
const TILT = -0.2;
const COS_T = Math.cos(TILT);
const SIN_T = Math.sin(TILT);
const TURN_MS = 1600;
const GROW = 1.38;
const BLUR_GROW = 3.5;
const TIGHT = 0.45;
const BLUR_FROM = JOINS[N - 1];
const SLAM_FROM = 1380;
const OPEN_AT = 1450;
const BLUR_MS = OPEN_AT - BLUR_FROM;
// bobbing BOB px like a carousel horse, trembling TREMBLE px as it tightens
const BOB = 26;
const BOB_RATE = 0.012;
const TREMBLE = 10;
// each rider's glowing loop: ARC_TRAIL_MS of its turn behind it
const ARC_TRAIL_MS = 90;
const MAX_SWEEP = Math.PI * 1.7;
// scattering over the floor (each SCATTER_STEP_MS behind the last), bowed
// SCATTER_BOW px, then hopping HOP px every HOP_MS for SETTLE_MS
const SCATTER_MS = 170;
const SCATTER_STEP_MS = 22;
const SCATTER_BOW = 120;
const FEET_LIFT = 40;
const HOP = 40;
const HOP_MS = 120;
const SETTLE_MS = 240;
const TRAIL_FADE_MS = 350;
const WISP = WISP_SIZE * 1.1;
const HALO = 70;
// flashes: each rider joining, each landing, the lock charging
const JOIN_FLASH_MS = 150;
const JOIN_GLOW = 170;
const LAND_FLASH_MS = 140;
const LAND_GLOW = 100;
const LOCK_GLOW: [number, number] = [80, 290];
const OPEN_BLAST = 400;
// shakes by step: a rider joining, the lock bursting, the scatter landing;
// and the spin-up
const SHAKES = [0.6, 3.2, 1.4];
const SPIN_SHAKE = 0.9;
const FIRST_LAND = OPEN_AT + SCATTER_MS;
const LAST_END = FIRST_LAND + (N - 1) * SCATTER_STEP_MS + SETTLE_MS;

const RIDER_COLORS = [
  COLOR.peppermintPink,
  COLOR.cyan,
  COLOR.heavenlyGold,
  COLOR.purple,
  COLOR.moneyGreen,
  COLOR.orange,
  COLOR.pairBlue,
];
const RIDER_STOPS = RIDER_COLORS.map(glowStops);
const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);
const LOCK: Point = { x: 0, y: 0 };

// each rider's seat round the ring, spread so joins land all round it
const BASE: number[] = [];
for (let i = 0; i < N; i++) BASE.push((((i * 3) % N) / N) * Math.PI * 2);
// the ring's speed with k+1 riders on, and how far it's turned by JOINS[k]
const OMEGA: number[] = [];
const SEG_PHASE: number[] = [];
for (let k = 0; k < N; k++) {
  OMEGA.push(((Math.PI * 2) / TURN_MS) * GROW ** k);
  SEG_PHASE.push(
    k === 0 ? 0 : SEG_PHASE[k - 1] + OMEGA[k - 1] * (JOINS[k] - JOINS[k - 1]),
  );
}
const W_TOP = OMEGA[N - 1];

function segment(ms: number): number {
  let k = 0;
  while (k < N - 1 && JOINS[k + 1] <= ms) k++;
  return k;
}

function omegaAt(ms: number): number {
  if (ms < BLUR_FROM) return OMEGA[segment(ms)];
  return W_TOP * (1 + (BLUR_GROW - 1) * clamp01((ms - BLUR_FROM) / BLUR_MS));
}

function phaseAt(ms: number): number {
  if (ms < BLUR_FROM) {
    const k = segment(ms);
    return SEG_PHASE[k] + OMEGA[k] * (ms - JOINS[k]);
  }
  const s = Math.min(ms, OPEN_AT) - BLUR_FROM;
  return (
    SEG_PHASE[N - 1] +
    W_TOP * s +
    (W_TOP * (BLUR_GROW - 1) * s * s) / (2 * BLUR_MS)
  );
}

function scaleAt(ms: number): number {
  if (ms < BLUR_FROM) return 1;
  if (ms < SLAM_FROM) {
    const u = (ms - BLUR_FROM) / (SLAM_FROM - BLUR_FROM);
    return lerp(1, TIGHT, u * u);
  }
  const u = clamp01((ms - SLAM_FROM) / (OPEN_AT - SLAM_FROM));
  return TIGHT * (1 - u * u);
}

// 1 while bobbing freely, 0 once it's pulled tight
const calmAt = (ms: number) =>
  ms < BLUR_FROM ? 1 : clamp01(1 - (ms - BLUR_FROM) / (SLAM_FROM - BLUR_FROM));

const bobAt = (i: number, ms: number) =>
  BOB * calmAt(ms) * Math.sin(ms * BOB_RATE + i * 1.9);

// rider i on the ring at ms, into out
function ringAt(out: Point, i: number, ms: number): Point {
  const a = BASE[i] + phaseAt(ms);
  const s = scaleAt(ms);
  const ex = Math.cos(a) * RX * s;
  const ey = Math.sin(a) * RY * s;
  const shiver = ms < SLAM_FROM ? (1 - calmAt(ms)) * TREMBLE : 0;
  out.x = ex * COS_T - ey * SIN_T + Math.sin(ms * 0.11 + i * 1.7) * shiver;
  out.y =
    ex * SIN_T + ey * COS_T - bobAt(i, ms) + Math.cos(ms * 0.13 + i) * shiver;
  return out;
}

interface State {
  runners: ((ms: number) => Point | null)[];
  starts: number[];
  ends: number[];
  lands: number[];
  joinX: number[];
  joinY: number[];
  spots: Point[];
}
const states = new WeakMap<Running, State>();

registerFloorCrit("merryGoRoundCrit", {
  // every worker on the floor it opened boosted for a long ride
  reward(t) {
    const { boostSeconds } = meta.values;
    const count = getRenderedWorkerCount(t.floor);
    for (let i = 0; i < count; i++) {
      wiggleWorkerBoost(t.floor, i, t.now);
      activateBoosted(t.floor, i, t.now, boostSeconds * 1000);
    }
    if (count > 0) playBloop();
    t.punch(`Joyride ${boostSeconds}s`);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const width = FLOOR_X_MAX - FLOOR_X_MIN;
    const feetY = WORKER_FEET_Y - lock.y - FEET_LIFT;
    const runners: ((ms: number) => Point | null)[] = [];
    const starts: number[] = [];
    const ends: number[] = [];
    const lands: number[] = [];
    const joinX: number[] = [];
    const joinY: number[] = [];
    const spots: Point[] = [];
    const seat: Point = { x: 0, y: 0 };
    for (let i = 0; i < N; i++) {
      const join = JOINS[i];
      const start = join - SWOOP_MS;
      ringAt(seat, i, join);
      const jx = seat.x;
      const jy = seat.y;
      const angle = -Math.PI / 2 + (((i * 0.37) % 1) - 0.5) * 2.6;
      const from =
        i === 0
          ? LEAD_FROM
          : { x: Math.cos(angle) * FROM.x, y: Math.sin(angle) * FROM.y };
      const dx = jx - from.x;
      const dy = jy - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const swoopSide = (i % 2 ? 1 : -1) * SWOOP_BOW * len;
      const slot = (i * 3) % N;
      const spot = {
        x: FLOOR_X_MIN + width * (0.1 + (0.8 * slot) / (N - 1)) - lock.x,
        y: feetY,
      };
      const scatterMs = SCATTER_MS + i * SCATTER_STEP_MS;
      const land = OPEN_AT + scatterMs;
      const end = land + SETTLE_MS;
      const spotLen = Math.hypot(spot.x, spot.y) || 1;
      const scatterSide = (i % 2 ? -1 : 1) * SCATTER_BOW;
      const at: Point = { x: 0, y: 0 };
      runners.push((ms) => {
        if (ms < start || ms > end) return null;
        if (ms >= land) {
          const s = ms - land;
          at.x = spot.x;
          at.y =
            spot.y -
            HOP *
              (1 - s / SETTLE_MS) *
              Math.abs(Math.sin((Math.PI * s) / HOP_MS));
          return at;
        }
        if (ms >= OPEN_AT) {
          const u = (ms - OPEN_AT) / scatterMs;
          const bow = scatterSide * Math.sin(Math.PI * u);
          at.x = spot.x * u - (spot.y / spotLen) * bow;
          at.y = spot.y * u + (spot.x / spotLen) * bow;
          return at;
        }
        if (ms >= join) return ringAt(at, i, ms);
        const u = (ms - start) / SWOOP_MS;
        const bow = swoopSide * Math.sin(Math.PI * u);
        at.x = from.x + dx * u - (dy / len) * bow;
        at.y = from.y + dy * u + (dx / len) * bow;
        return at;
      });
      starts.push(start);
      ends.push(end);
      lands.push(land);
      joinX.push(jx);
      joinY.push(jy);
      spots.push(spot);
      hit(0, join, 0);
    }
    hit(0, OPEN_AT, 1);
    hit(0, FIRST_LAND, 2);
    states.set(r, { runners, starts, ends, lands, joinX, joinY, spots });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        (lock.x + LEAD_FROM.x) * p,
        (lock.y + LEAD_FROM.y) * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
        { alpha: 1 - p * p },
      );
    }
    if (r.kicked === 0 && ms >= BLUR_FROM) {
      r.kicked = 1;
      r.shake(SPIN_SHAKE);
    }
    if (r.kicked === 1 && ms >= SLAM_FROM) {
      r.kicked = 2;
      playSwoosh();
    }
    let riders = 0;
    while (riders < N && JOINS[riders] <= ms) riders++;
    const blur = ms < BLUR_FROM ? 0 : clamp01((ms - BLUR_FROM) / BLUR_MS);
    ctx.save();
    ctx.translate(lock.x, lock.y);
    ctx.globalCompositeOperation = "lighter";
    if (ms >= ARC_MS && ms < OPEN_AT) {
      const charge = (0.6 * riders) / N + 0.4 * blur;
      ctx.globalAlpha = 0.25 + 0.6 * charge;
      drawGlow(ctx, GOLD, 0, 0, lerp(LOCK_GLOW[0], LOCK_GLOW[1], charge));
      if (blur > 0) {
        ctx.globalAlpha = blur;
        drawGlow(ctx, WHITE, 0, 0, LOCK_GLOW[0] * 1.6 * blur);
      }
      if (riders > 0) {
        const s = scaleAt(ms);
        const rx = Math.max(0, RX * s);
        const ry = Math.max(0, RY * s);
        // the whole ring, glowing brighter as it spins up
        ctx.lineCap = "round";
        ctx.strokeStyle = COLOR.heavenlyGold;
        ctx.globalAlpha = 0.12 + (0.15 * riders) / N + 0.5 * blur;
        ctx.lineWidth = lerp(4, 26, blur);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, TILT, 0, Math.PI * 2);
        ctx.stroke();
        if (blur > 0) {
          ctx.strokeStyle = COLOR.white;
          ctx.globalAlpha = 0.8 * blur;
          ctx.lineWidth = lerp(2, 8, blur);
          ctx.stroke();
        }
        // each rider's loop of light behind it
        const a0 = phaseAt(ms);
        const sweep = Math.min(MAX_SWEEP, omegaAt(ms) * ARC_TRAIL_MS);
        for (let i = 0; i < riders; i++) {
          const a = BASE[i] + a0;
          const bob = bobAt(i, ms);
          ctx.beginPath();
          ctx.ellipse(0, -bob, rx, ry, TILT, a - sweep, a);
          ctx.strokeStyle = RIDER_COLORS[i];
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 12;
          ctx.stroke();
          ctx.strokeStyle = COLOR.white;
          ctx.globalAlpha = 0.6;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    }
    for (let i = 0; i < riders; i++) {
      const s = ms - JOINS[i];
      if (s >= JOIN_FLASH_MS) continue;
      const f = 1 - s / JOIN_FLASH_MS;
      ctx.globalAlpha = f;
      const x = state.joinX[i];
      const y = state.joinY[i];
      drawGlow(ctx, RIDER_STOPS[i], x, y, JOIN_GLOW * (0.5 + 0.5 * f));
      drawGlow(ctx, WHITE, x, y, JOIN_GLOW * 0.45 * f);
      ctx.globalAlpha = 0.5 * f;
      drawGlow(ctx, GOLD, 0, 0, LOCK_GLOW[1] * 0.7 * f);
    }
    for (let i = 0; i < N; i++) {
      const s = ms - state.lands[i];
      if (s < 0 || s >= LAND_FLASH_MS) continue;
      const f = 1 - s / LAND_FLASH_MS;
      ctx.globalAlpha = f;
      const spot = state.spots[i];
      drawGlow(
        ctx,
        RIDER_STOPS[i],
        spot.x,
        spot.y,
        LAND_GLOW * (0.6 + 0.4 * f),
      );
    }
    // each rider's own colour round its head
    for (let i = 0; i < N; i++) {
      if (ms < state.starts[i] || ms > state.ends[i]) continue;
      const p = state.runners[i](ms);
      if (!p) continue;
      ctx.globalAlpha = 0.7;
      drawGlow(ctx, RIDER_STOPS[i], p.x, p.y, HALO * (1 + 0.5 * blur));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    drawDetonation(ctx, LOCK, ms - OPEN_AT, OPEN_BLAST, now);
    const heat = ms < OPEN_AT ? 0.3 + 0.7 * blur : 0.4;
    for (let i = 0; i < N; i++) {
      const runner = state.runners[i];
      const end = state.ends[i];
      if (ms < state.starts[i]) continue;
      if (ms <= end) drawWisp(ctx, runner, ms, now, WISP, heat);
      else if (ms < end + TRAIL_FADE_MS)
        drawWispTrail(
          ctx,
          runner,
          ms,
          now,
          WISP,
          1 - (ms - end) / TRAIL_FADE_MS,
        );
    }
    ctx.restore();
  },
  tailMs: Math.max(
    DETONATION_MS - SCATTER_MS,
    LAST_END + TRAIL_FADE_MS - FIRST_LAND,
  ),
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
