// the wisp's flight tracing the crit's own number (Night Sky, Pitcher): the
// number's outlines as strokes, and one continuous flight out of the button,
// along every stroke in turn with bowed hops between them, then off the
// screen, eased in and out as a whole
import {
  fitGlyph,
  NUMBER_HEIGHT_SHARE,
  NUMBER_SAMPLE_SIZE,
  NUMBER_WIDTH_SHARE,
  rasterizeNumber,
  traceOutlines,
  type Area,
  type Point,
} from "../../../shared/numberGlyph";
import { hash01 } from "../../../shared/twinkle";

// a traced outline needs this many sample pixels to count as a stroke
const MIN_OUTLINE = 30;
// sample points averaged either side to smooth an outline's pixel steps, and
// path points averaged either side to round the corners where hops join strokes
const SMOOTH = 5;
const CORNER_SMOOTH = 4;
// floor-local px between path points
export const PATH_STEP = 6;
// how far a hop between strokes bows out to the side, of its length
const HOP_BOW = 0.25;
// the flight ends this far past the screen's top-right corner
const OFF_SCREEN = 150;

export interface Stroke {
  digit: number;
  points: Point[];
}

// a stroke as flown: each point with the ms the wisp passes it
export interface TimedStroke extends Stroke {
  times: number[];
}

type PathPoint = Point & { stroke: number; index: number };

// a point list resampled every `step` px along its length
function resample(points: Point[], step: number): Point[] {
  const out: Point[] = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    let d = step - carry;
    while (d <= length) {
      out.push({
        x: a.x + ((b.x - a.x) * d) / length,
        y: a.y + ((b.y - a.y) * d) / length,
      });
      d += step;
    }
    carry = length - (d - step);
  }
  return out;
}

// each point averaged with `reach` neighbours either side
function smoothed<T extends Point>(points: T[], reach: number): T[] {
  return points.map((p, i) => {
    let x = 0;
    let y = 0;
    let n = 0;
    for (let j = i - reach; j <= i + reach; j++) {
      const q = points[Math.min(points.length - 1, Math.max(0, j))];
      x += q.x;
      y += q.y;
      n++;
    }
    return { ...p, x: x / n, y: y / n };
  });
}

// the runs of a chain's points that are kept, joined across its seam if it's a loop
function keptRuns<T>(chain: T[], keep: boolean[], loop: boolean): T[][] {
  const runs: T[][] = [];
  let run: T[] = [];
  chain.forEach((p, i) => {
    if (keep[i]) run.push(p);
    else if (run.length > 0) {
      runs.push(run);
      run = [];
    }
  });
  if (run.length > 0) {
    if (loop && keep[0] && runs.length > 0) runs[0] = [...run, ...runs[0]];
    else runs.push(run);
  }
  return runs;
}

export interface NumberOutline {
  // left to right
  strokes: Stroke[];
  // per digit, floor-local: its left and right edges, and with a gap the
  // middle of its open top (null without one)
  digits: { left: number; right: number; mouth: Point | null }[];
}

// the number's outlines in floor-local px, fitted to area like Draw's number;
// `gap` (a share of each digit's height) leaves the top of each digit open
export function numberOutline(
  text: string,
  area: Area,
  gap = 0,
  widthShare = NUMBER_WIDTH_SHARE,
  heightShare = NUMBER_HEIGHT_SHARE,
): NumberOutline {
  const glyph = rasterizeNumber(text, NUMBER_SAMPLE_SIZE);
  const { scale, originX, originY } = fitGlyph(
    glyph,
    area,
    widthShare,
    heightShare,
  );
  const toFloor = (p: Point) => ({
    x: originX + p.x * scale,
    y: originY + p.y * scale,
  });
  const chains = traceOutlines(glyph, MIN_OUTLINE).map((chain) => {
    const mean = chain.reduce((sum, p) => sum + p.x, 0) / chain.length;
    const digit = Math.max(
      0,
      glyph.digits.findIndex((d) => mean >= d.left && mean <= d.right),
    );
    return { chain, digit };
  });
  const tops = glyph.digits.map((_, d) =>
    Math.min(
      ...chains
        .filter((c) => c.digit === d)
        .flatMap((c) => c.chain.map((p) => p.y)),
    ),
  );
  const bottoms = glyph.digits.map((_, d) =>
    Math.max(
      ...chains
        .filter((c) => c.digit === d)
        .flatMap((c) => c.chain.map((p) => p.y)),
    ),
  );
  const digits: NumberOutline["digits"] = glyph.digits.map((d) => ({
    left: toFloor({ x: d.left, y: 0 }).x,
    right: toFloor({ x: d.right, y: 0 }).x,
    mouth: null,
  }));
  const strokes: Stroke[] = [];
  for (const { chain, digit } of chains) {
    const first = chain[0];
    const last = chain[chain.length - 1];
    const loop = Math.hypot(last.x - first.x, last.y - first.y) < 3;
    let runs: Point[][] = [loop ? [...chain, first] : chain];
    if (gap > 0) {
      const band = tops[digit] + gap * (bottoms[digit] - tops[digit]);
      const open = chain.filter((p) => p.y < band);
      if (open.length > 0 && !digits[digit].mouth)
        digits[digit].mouth = toFloor({
          x: open.reduce((sum, p) => sum + p.x, 0) / open.length,
          y: band,
        });
      runs = keptRuns(
        chain,
        chain.map((p) => p.y >= band),
        loop,
      );
    }
    for (const run of runs)
      if (run.length >= MIN_OUTLINE)
        strokes.push({
          digit,
          points: resample(smoothed(run, SMOOTH).map(toFloor), PATH_STEP),
        });
  }
  strokes.sort(
    (a, b) =>
      a.digit - b.digit ||
      Math.min(...a.points.map((p) => p.x)) -
        Math.min(...b.points.map((p) => p.x)),
  );
  return { strokes, digits };
}

// a bowed hop from a to b, without its ends
function hop(a: Point, b: Point, seed: number): PathPoint[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const bow = (hash01(seed, 1) < 0.5 ? -1 : 1) * HOP_BOW;
  const cx = (a.x + b.x) / 2 - dy * bow;
  const cy = (a.y + b.y) / 2 + dx * bow;
  const steps = Math.max(2, Math.ceil(length / PATH_STEP));
  const points: PathPoint[] = [];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    points.push({
      x: u * u * a.x + 2 * u * t * cx + t * t * b.x,
      y: u * u * a.y + 2 * u * t * cy + t * t * b.y,
      stroke: -1,
      index: -1,
    });
  }
  return points;
}

// the wisp's flight over flightMs out of the button, along every stroke and
// off the screen; ms from the event's start
export function planNumberFlight(
  strokes: Stroke[],
  button: Point,
  area: Area,
  flightMs: number,
) {
  const raw: PathPoint[] = [{ ...button, stroke: -1, index: -1 }];
  let from = button;
  strokes.forEach((stroke, k) => {
    raw.push(...hop(from, stroke.points[0], k));
    stroke.points.forEach((p, index) => raw.push({ ...p, stroke: k, index }));
    from = stroke.points[stroke.points.length - 1];
  });
  const exit = { x: area.right + OFF_SCREEN, y: area.top - OFF_SCREEN };
  raw.push(...hop(from, exit, 99), { ...exit, stroke: -1, index: -1 });
  const path = smoothed(raw, CORNER_SMOOTH);
  const cum = [0];
  for (let i = 1; i < path.length; i++)
    cum.push(
      cum[i - 1] +
        Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y),
    );
  const length = cum[cum.length - 1];
  // ease in-out sine on the distance flown, and its inverse
  const timeAt = (d: number) =>
    (flightMs * Math.acos(1 - (2 * d) / length)) / Math.PI;
  const timed: TimedStroke[] = strokes.map((s) => ({
    ...s,
    points: [],
    times: [],
  }));
  path.forEach((p, i) => {
    if (p.stroke < 0) return;
    timed[p.stroke].points.push({ x: p.x, y: p.y });
    timed[p.stroke].times.push(timeAt(cum[i]));
  });
  const wispAt = (ms: number): Point | null => {
    if (ms < 0 || ms >= flightMs) return null;
    const d = (length * (1 - Math.cos((Math.PI * ms) / flightMs))) / 2;
    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= d) lo = mid;
      else hi = mid;
    }
    const span = cum[hi] - cum[lo] || 1;
    const f = (d - cum[lo]) / span;
    return {
      x: path[lo].x + (path[hi].x - path[lo].x) * f,
      y: path[lo].y + (path[hi].y - path[lo].y) * f,
    };
  };
  const traceEnd = Math.max(0, ...timed.flatMap((s) => s.times));
  return { wispAt, strokes: timed, traceEnd };
}

// a sparkle of the drawn number pulled from `from` into the total at `to`
// ever faster, p 0..1, bowed to one side by up to `bend` of its trip
export function pullIntoTotal(
  from: Point,
  to: Point,
  p: number,
  seed: number,
  bend: number,
): Point {
  const t = p ** 1.6;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const bow = (hash01(seed, 7) * 2 - 1) * bend;
  const cx = (from.x + to.x) / 2 - dy * bow;
  const cy = (from.y + to.y) / 2 + dx * bow;
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
    y: u * u * from.y + 2 * u * t * cy + t * t * to.y,
  };
}
