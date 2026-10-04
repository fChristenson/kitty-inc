// clutter for events: a mess spread over the whole screen (evenly or in a
// pattern), then cleaned up for real: by a broom sweeping it in brisk
// strokes, a wisp ploughing through it, a gravity hole pulling it in or an
// invisible force blowing it together, into lines and heaps. Plan and
// simulate everything at arm; drawing is stateless
import { COLOR } from "../../palette";
import { drawBeam } from "../beam";
import { clamp01, lerp, smoothstep } from "../easing";
import { drawGlow, type FadeStops } from "../glowSprite";
import { drawGlitterLight, type Point } from "../wisp";

// how thick the mess piles up in front of the broom
export const SWEEP_DEPTH: [number, number] = [4, 34];
// simulation step, ms
const STEP = 8;

// one drag of the broom: its front's centre from and to, the way it pushes
// (radians) and its head's length across that
export interface SweepStroke {
  from: Point;
  to: Point;
  heading: number;
  length: number;
}

export interface BroomState {
  x: number;
  y: number;
  heading: number;
  length: number;
  pushing: boolean;
}

export interface Sweep {
  strokes: SweepStroke[];
  // when each stroke starts dragging, and when the last drag ends
  starts: number[];
  startMs: number;
  endMs: number;
  dragMs: number;
  // the broom at ms: dragging, or lifted and swung to the next stroke
  at: (ms: number, into: BroomState) => BroomState | null;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// a mess's spots spread evenly over a box: one per cell of a jittered grid
export function scatterEvenly(box: Box, count: number): Point[] {
  const w = box.right - box.left;
  const h = box.bottom - box.top;
  const cols = Math.max(1, Math.round(Math.sqrt((count * w) / h)));
  const rows = Math.ceil(count / cols);
  const spots: Point[] = [];
  for (let i = 0; i < count; i++)
    spots.push({
      x: box.left + ((i % cols) + Math.random()) * (w / cols),
      y: box.top + (Math.floor(i / cols) + Math.random()) * (h / rows),
    });
  return spots;
}

// how loosely patterned spots lie off their lines
const PATTERN_JITTER = 7;
const TAU = Math.PI * 2;

// spots spread evenly over the box, each pulled onto the nearest line of a
// pattern, so the pattern covers the whole box as densely everywhere
function scatterSnapped(
  box: Box,
  count: number,
  snap: (p: Point, cx: number, cy: number) => void,
): Point[] {
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  const spots: Point[] = [];
  for (let tries = 0; spots.length < count && tries < count * 20; tries++) {
    const p = {
      x: box.left + Math.random() * (box.right - box.left),
      y: box.top + Math.random() * (box.bottom - box.top),
    };
    snap(p, cx, cy);
    p.x += (Math.random() * 2 - 1) * PATTERN_JITTER;
    p.y += (Math.random() * 2 - 1) * PATTERN_JITTER;
    if (
      p.x >= box.left &&
      p.x <= box.right &&
      p.y >= box.top &&
      p.y <= box.bottom
    )
      spots.push(p);
  }
  return spots;
}

// a mess laid in `arms` spiral arms `gap` px apart, wound out from the
// box's centre to its corners
export function scatterSpiral(
  box: Box,
  count: number,
  arms = 3,
  gap = 70,
): Point[] {
  return scatterSnapped(box, count, (p, cx, cy) => {
    const r = Math.hypot(p.x - cx, p.y - cy);
    const turn = (Math.atan2(p.y - cy, p.x - cx) + Math.PI) / TAU;
    let on = gap * (Math.round(r / gap - arms * turn) + arms * turn);
    if (on < 0) on += gap;
    const k = on / Math.max(1, r);
    p.x = cx + (p.x - cx) * k;
    p.y = cy + (p.y - cy) * k;
  });
}

// a mess laid in rings `gap` px apart round the box's centre
export function scatterRings(box: Box, count: number, gap = 60): Point[] {
  return scatterSnapped(box, count, (p, cx, cy) => {
    const r = Math.hypot(p.x - cx, p.y - cy);
    const k = (gap * (Math.round(r / gap - 0.5) + 0.5)) / Math.max(1, r);
    p.x = cx + (p.x - cx) * k;
    p.y = cy + (p.y - cy) * k;
  });
}

// a mess laid in wavy rows `gap` px apart, each wave `amplitude` px high
// and `wavelength` px long, every row shifted along from the last
export function scatterWaves(
  box: Box,
  count: number,
  gap = 70,
  amplitude = 22,
  wavelength = 160,
): Point[] {
  return scatterSnapped(box, count, (p) => {
    const row = Math.round((p.y - box.top) / gap - 0.5);
    p.y =
      box.top +
      (row + 0.5) * gap +
      amplitude * Math.sin((TAU * (p.x - box.left)) / wavelength + row);
  });
}

// a mess laid in `rays` spokes out from the box's centre
export function scatterRays(box: Box, count: number, rays = 12): Point[] {
  return scatterSnapped(box, count, (p, cx, cy) => {
    const r = Math.hypot(p.x - cx, p.y - cy);
    const step = TAU / rays;
    const angle = Math.round(Math.atan2(p.y - cy, p.x - cx) / step) * step;
    p.x = cx + Math.cos(angle) * r;
    p.y = cy + Math.sin(angle) * r;
  });
}

// a mess lying only on the dark squares of a checkerboard `cell` px square
export function scatterChecker(box: Box, count: number, cell = 80): Point[] {
  return scatterSnapped(box, count, (p) => {
    const col = Math.floor((p.x - box.left) / cell);
    const row = Math.floor((p.y - box.top) / cell);
    if ((col + row) % 2 === 0) return;
    p.x += p.x - box.left < (box.right - box.left) / 2 ? cell : -cell;
  });
}

// `count` brisk strokes from `from` to `to`, each re-planted `back` of a
// stroke behind where the last one stopped
export function sweepLane(
  from: Point,
  to: Point,
  count: number,
  heading: number,
  length: number,
  back = 0.25,
): SweepStroke[] {
  const dx = (to.x - from.x) / count;
  const dy = (to.y - from.y) / count;
  const strokes: SweepStroke[] = [];
  for (let k = 0; k < count; k++) {
    const b = k > 0 ? back : 0;
    strokes.push({
      from: { x: from.x + dx * (k - b), y: from.y + dy * (k - b) },
      to: { x: from.x + dx * (k + 1), y: from.y + dy * (k + 1) },
      heading,
      length,
    });
  }
  return strokes;
}

// the strokes back to back from startMs: each dragged over dragMs, then the
// broom lifted and swung (turning, resizing) to the next over liftMs
export function planSweep(
  strokes: SweepStroke[],
  startMs: number,
  dragMs: number,
  liftMs: number,
): Sweep {
  const strokeMs = dragMs + liftMs;
  const starts = strokes.map((_, k) => startMs + k * strokeMs);
  const endMs = startMs + strokes.length * strokeMs - liftMs;
  const at = (ms: number, into: BroomState): BroomState | null => {
    const j = Math.floor((ms - startMs) / strokeMs);
    if (j < 0 || j >= strokes.length) return null;
    const s = strokes[j];
    const local = ms - starts[j];
    const next = strokes[j + 1];
    if (local < dragMs || !next) {
      const u = smoothstep(clamp01(local / dragMs));
      into.x = lerp([s.from.x, s.to.x], u);
      into.y = lerp([s.from.y, s.to.y], u);
      into.heading = s.heading;
      into.length = s.length;
      into.pushing = local < dragMs;
      return into;
    }
    const u = smoothstep((local - dragMs) / liftMs);
    into.x = lerp([s.to.x, next.from.x], u);
    into.y = lerp([s.to.y, next.from.y], u);
    into.heading = lerp([s.heading, next.heading], u);
    into.length = lerp([s.length, next.length], u);
    into.pushing = false;
    return into;
  };
  return { strokes, starts, startMs, endMs, dragMs, at };
}

export interface Swept {
  // where bit i is at ms (where it lay before the sweep, where it was left
  // after it)
  at: (i: number, ms: number, into: Point) => Point;
  // where the sweep left bit i
  end: (i: number) => Point;
}

// sweeps the bits lying at spots, simulated once: every bit the broom's front
// reaches rides ahead of it, piled up to its own depth
export function simulateSweep(sweep: Sweep, spots: Point[]): Swept {
  const n = spots.length;
  const steps = Math.ceil((sweep.endMs - sweep.startMs) / STEP) + 1;
  const frames = new Float32Array(steps * n * 2);
  const depths = spots.map(() => lerp(SWEEP_DEPTH, Math.random()));
  const x = spots.map((p) => p.x);
  const y = spots.map((p) => p.y);
  const broom: BroomState = {
    x: 0,
    y: 0,
    heading: 0,
    length: 0,
    pushing: false,
  };
  let lastX = 0;
  let lastY = 0;
  for (let s = 0; s < steps; s++) {
    const b = sweep.at(sweep.startMs + s * STEP, broom);
    if (b && b.pushing) {
      const ux = Math.cos(b.heading);
      const uy = Math.sin(b.heading);
      const reach = Math.hypot(b.x - lastX, b.y - lastY) + SWEEP_DEPTH[1] + 10;
      const half = b.length / 2;
      for (let i = 0; i < n; i++) {
        const rx = x[i] - b.x;
        const ry = y[i] - b.y;
        const along = rx * ux + ry * uy;
        const lat = ry * ux - rx * uy;
        if (Math.abs(lat) > half || along >= depths[i] || along < -reach)
          continue;
        x[i] = b.x + ux * depths[i] - uy * lat;
        y[i] = b.y + uy * depths[i] + ux * lat;
      }
    }
    if (b) {
      lastX = b.x;
      lastY = b.y;
    }
    const base = s * n * 2;
    for (let i = 0; i < n; i++) {
      frames[base + i * 2] = x[i];
      frames[base + i * 2 + 1] = y[i];
    }
  }
  return replay(frames, steps, n, sweep.startMs);
}

// a simulation's frames (every bit's x, y each STEP from startMs) as a Swept
function replay(
  frames: Float32Array,
  steps: number,
  n: number,
  startMs: number,
): Swept {
  const last = (steps - 1) * n * 2;
  const ends = Array.from({ length: n }, (_, i) => ({
    x: frames[last + i * 2],
    y: frames[last + i * 2 + 1],
  }));
  return {
    at: (i, ms, into) => {
      const t = Math.min(steps - 1, Math.max(0, (ms - startMs) / STEP));
      const s = Math.min(steps - 2, Math.floor(t));
      if (s < 0) {
        into.x = frames[i * 2];
        into.y = frames[i * 2 + 1];
        return into;
      }
      const u = t - s;
      const a = s * n * 2 + i * 2;
      const b = a + n * 2;
      into.x = lerp([frames[a], frames[b]], u);
      into.y = lerp([frames[a + 1], frames[b + 1]], u);
      return into;
    },
    end: (i) => ends[i],
  };
}

// count spots in a heap w wide and h high, its foot centred on `at`
export function heapSpots(
  at: Point,
  count: number,
  w: number,
  h: number,
): Point[] {
  return Array.from({ length: count }, () => {
    const up = Math.random() ** 0.6;
    return {
      x: at.x + (Math.random() * 2 - 1) * (w / 2) * (1 - up),
      y: at.y - up * h,
    };
  });
}

// a wisp ploughing through the mess: every bit inside its radius is shoved
// out to its rim and skids on ahead of it, piling up round its front
export interface Plough {
  kind: "plough";
  at: (ms: number, into: Point) => Point | null;
  radius: number;
}

// a gravity hole: pulls every bit in (pull px/ms² at PULL_AT px, falling
// off with distance; swirl spins them round it as they fall), and bits that
// reach its core are caught and ride with it, settling into a tight heap
export interface GravityHole {
  kind: "hole";
  at: (ms: number, into: Point) => Point | null;
  pull: number;
  core: number;
  swirl?: number;
}

// an invisible force (a gust, a shockwave, a vortex, a tide): the push in
// px/ms² on a bit at (x, y) at ms, written into `into`, or null where it
// doesn't reach. Shown only by the bits moving together
export interface Force {
  kind: "force";
  push: (x: number, y: number, ms: number, into: Point) => Point | null;
}

export type Cleaner = Plough | GravityHole | Force;

const PLOUGH_DEPTH = 16;
const PULL_AT = 100;
// share of a loose bit's speed kept each step, and its top speed in px/ms
const FRICTION = 0.9;
const MAX_SPEED = 2.5;
// share of a caught bit's distance from its resting spot kept each step
const SETTLE = 0.9;

// cleans the bits lying at spots from startMs to endMs, simulated once:
// loose bits slide under the holes' pull and the forces' push with
// friction, ploughs shove them aside, holes catch them
export function simulateClean(
  spots: Point[],
  cleaners: Cleaner[],
  startMs: number,
  endMs: number,
): Swept {
  const n = spots.length;
  const steps = Math.ceil((endMs - startMs) / STEP) + 1;
  const frames = new Float32Array(steps * n * 2);
  const x = Float32Array.from(spots, (p) => p.x);
  const y = Float32Array.from(spots, (p) => p.y);
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const depth = Float32Array.from(spots, () => Math.random() * PLOUGH_DEPTH);
  const rest = Float32Array.from(spots, () => 0.5 * Math.sqrt(Math.random()));
  const caught = new Int16Array(n).fill(-1);
  const offX = new Float32Array(n);
  const offY = new Float32Array(n);
  const at = cleaners.map(() => ({ x: 0, y: 0 }));
  const was = cleaners.map(() => ({ x: NaN, y: NaN }));
  const live = cleaners.map(() => false);
  const push: Point = { x: 0, y: 0 };
  for (let s = 0; s < steps; s++) {
    const ms = startMs + s * STEP;
    cleaners.forEach((c, k) => {
      live[k] = c.kind !== "force" && c.at(ms, at[k]) !== null;
    });
    for (let i = 0; i < n; i++) {
      const held = caught[i];
      if (held >= 0) {
        const hole = cleaners[held] as GravityHole;
        const len = Math.hypot(offX[i], offY[i]);
        const target = rest[i] * hole.core;
        if (len > target) {
          const k = (target + (len - target) * SETTLE) / len;
          offX[i] *= k;
          offY[i] *= k;
        }
        if (live[held]) {
          x[i] = at[held].x + offX[i];
          y[i] = at[held].y + offY[i];
        }
        continue;
      }
      let ax = 0;
      let ay = 0;
      for (let k = 0; k < cleaners.length; k++) {
        const c = cleaners[k];
        if (c.kind === "force") {
          if (c.push(x[i], y[i], ms, push)) {
            ax += push.x;
            ay += push.y;
          }
          continue;
        }
        if (!live[k]) continue;
        const dx = at[k].x - x[i];
        const dy = at[k].y - y[i];
        const d = Math.hypot(dx, dy) || 1;
        if (c.kind === "hole") {
          if (d < c.core) {
            caught[i] = k;
            offX[i] = -dx;
            offY[i] = -dy;
            break;
          }
          const a = (c.pull * PULL_AT) / d;
          const swirl = c.swirl ?? 0;
          ax += ((dx - dy * swirl) / d) * a;
          ay += ((dy + dx * swirl) / d) * a;
          continue;
        }
        const rim = c.radius + depth[i];
        if (d >= rim) continue;
        x[i] = at[k].x - (dx / d) * rim;
        y[i] = at[k].y - (dy / d) * rim;
        if (!Number.isNaN(was[k].x)) {
          vx[i] = (at[k].x - was[k].x) / STEP;
          vy[i] = (at[k].y - was[k].y) / STEP;
        }
      }
      if (caught[i] >= 0) continue;
      vx[i] = (vx[i] + ax * STEP) * FRICTION;
      vy[i] = (vy[i] + ay * STEP) * FRICTION;
      const speed = Math.hypot(vx[i], vy[i]);
      if (speed > MAX_SPEED) {
        vx[i] *= MAX_SPEED / speed;
        vy[i] *= MAX_SPEED / speed;
      }
      x[i] += vx[i] * STEP;
      y[i] += vy[i] * STEP;
    }
    cleaners.forEach((_, k) => {
      was[k].x = live[k] ? at[k].x : NaN;
      was[k].y = live[k] ? at[k].y : NaN;
    });
    const base = s * n * 2;
    for (let i = 0; i < n; i++) {
      frames[base + i * 2] = x[i];
      frames[base + i * 2 + 1] = y[i];
    }
  }
  return replay(frames, steps, n, startMs);
}

const HOLE_CORE: FadeStops = [
  [0, "#000000"],
  [0.5, "#000000dd"],
  [1, "#00000000"],
];
const HOLE_RIM: FadeStops = [
  [0, `${COLOR.heavenlyGold}00`],
  [0.55, `${COLOR.heavenlyGold}00`],
  [0.72, COLOR.heavenlyGold],
  [1, `${COLOR.heavenlyGold}00`],
];
const MOTES = 14;
const MOTE_MS = 700;

// a gravity hole `size` px across: a black core in a gold rim, with glitter
// motes spiralling down into it
export function drawGravityHole(
  ctx: CanvasRenderingContext2D,
  at: Point,
  size: number,
  alpha: number,
  ms: number,
  now: number,
): void {
  if (alpha <= 0 || size <= 0) return;
  const r = size / 2;
  ctx.globalAlpha = alpha;
  drawGlow(ctx, HOLE_CORE, at.x, at.y, r * 1.3);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * 0.9;
  drawGlow(ctx, HOLE_RIM, at.x, at.y, r * 1.4);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  for (let k = 0; k < MOTES; k++) {
    const u = (ms / MOTE_MS + k / MOTES) % 1;
    const fall = Math.max(0, u);
    const d = r * (2.4 - 1.9 * fall * fall);
    const angle = k * 2.4 + fall * 5;
    drawGlitterLight(
      ctx,
      at.x + Math.cos(angle) * d,
      at.y + Math.sin(angle) * d,
      9 * (1 - 0.6 * fall),
      k + 80,
      alpha * Math.sin(Math.PI * fall),
      now,
    );
  }
}

const HEAD = 26;
const SWATH = 70;
const BRISTLES = 16;
const DUST = 8;
const end1: Point = { x: 0, y: 0 };
const end2: Point = { x: 0, y: 0 };

// the broom: a glowing head across its front, the soft swath it leaves
// behind, glitter bristles scratching along its front and dust kicked up
// ahead of it while it drags; dimmer while lifted
export function drawBroom(
  ctx: CanvasRenderingContext2D,
  b: BroomState,
  alpha: number,
  ms: number,
  now: number,
): void {
  if (alpha <= 0) return;
  const ux = Math.cos(b.heading);
  const uy = Math.sin(b.heading);
  const half = b.length / 2;
  const a = alpha * (b.pushing ? 1 : 0.55);
  end1.x = b.x - ux * SWATH * 0.6 - uy * half;
  end1.y = b.y - uy * SWATH * 0.6 + ux * half;
  end2.x = b.x - ux * SWATH * 0.6 + uy * half;
  end2.y = b.y - uy * SWATH * 0.6 - ux * half;
  drawBeam(ctx, end1, end2, SWATH, 0.3 * a);
  end1.x = b.x - uy * half;
  end1.y = b.y + ux * half;
  end2.x = b.x + uy * half;
  end2.y = b.y - ux * half;
  drawBeam(ctx, end1, end2, HEAD, 0.85 * a);
  for (let k = 0; k < BRISTLES; k++) {
    const lat = ((k + 0.5) / BRISTLES - 0.5) * b.length;
    const jitter = b.pushing ? Math.sin(ms * 0.05 + k * 1.7) * 8 : 0;
    drawGlitterLight(
      ctx,
      b.x - uy * lat + ux * (6 + jitter),
      b.y + ux * lat + uy * (6 + jitter),
      12,
      k,
      a,
      now,
    );
  }
  if (!b.pushing) return;
  for (let k = 0; k < DUST; k++) {
    const lat = (((k * 0.618) % 1) - 0.5) * b.length;
    const lift = 20 + 30 * (0.5 + 0.5 * Math.sin(ms * 0.02 + k * 2.3));
    drawGlitterLight(
      ctx,
      b.x - uy * lat + ux * (SWEEP_DEPTH[1] + lift),
      b.y + ux * lat + uy * (SWEEP_DEPTH[1] + lift) - lift * 0.5,
      10,
      k + 40,
      0.7 * a,
      now,
    );
  }
}
