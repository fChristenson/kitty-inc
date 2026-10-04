// clutter for events: a mess spread evenly over the screen, then cleaned up
// for real by one big broom that sweeps it in brisk strokes, every bit it
// reaches riding ahead of its front and piling up there, into lines and
// heaps. Plan everything at arm; drawing is stateless
import { drawBeam } from "../beam";
import { clamp01, lerp, smoothstep } from "../easing";
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

// a mess's spots spread evenly over a box: one per cell of a jittered grid
export function scatterEvenly(
  box: { left: number; top: number; right: number; bottom: number },
  count: number,
): Point[] {
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
  const last = (steps - 1) * n * 2;
  const ends = spots.map((_, i) => ({
    x: frames[last + i * 2],
    y: frames[last + i * 2 + 1],
  }));
  return {
    at: (i, ms, into) => {
      const t = Math.min(steps - 1, Math.max(0, (ms - sweep.startMs) / STEP));
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
