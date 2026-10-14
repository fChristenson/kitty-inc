// magnets for events and crits: gold poles pulling glitter (or anything) in
// along bowed field lines, snapping it onto a spiky crust round them, then
// flinging it all off when they flip. Plan the specks once (planSnaps), then
// each frame drawFieldLines between the poles and place every speck with
// snapAt (lying, snapping in, clinging) or, once repelled, flingAt. Iron
// filings (scatterFilings, drawFilings) are the other look: glitter lining up
// along the field in a wave, then rushing onto the poles
import { COLOR } from "../../../palette";
import { clamp01 } from "../../easing";
import { beginLightBatch, endLightBatch } from "../../lightBatch";
import { hash01, stampGlimmer } from "../../twinkle";
import type { Point } from "../../wisp";

// a field line bows out FIELD_BOW of the poles' gap per line from the
// middle; glitter runs along each, RUN_MS a trip
const FIELD_BOW = 0.22;
const FIELD_ALPHA = 0.3;
const FIELD_WIDTH = 0.12;
const RUNNERS = 4;
const RUN_MS = 800;
const RUNNER = 0.5;
// a speck snaps in over SNAP_MS, bowed SNAP_BOW of its way off the straight
// line; lying, it tugs TUG of its size towards its pole
const SNAP_MS = 200;
const SNAP_BOW = 0.3;
const TUG = 0.3;
const TUG_RATE = 0.05;
// a crust is squashed CRUST_SQUASH tall
const CRUST_SQUASH = 0.8;

export interface Snap {
  // which pole it snaps onto
  pole: number;
  from: Point;
  // its spot on the crust: an angle round the pole, `reach` px out
  angle: number;
  reach: number;
  startMs: number;
  landMs: number;
  // which way its line bows (+1 or -1)
  bow: number;
}

// `count` specks lying all over `box`, snapping onto `poles` poles from
// startMs, a trickle then a flood, the last landing at endMs; crusts
// `reach` px deep
export function planSnaps(
  count: number,
  box: { left: number; top: number; right: number; bottom: number },
  poles: number,
  startMs: number,
  endMs: number,
  reach: [number, number],
): Snap[] {
  const snaps: Snap[] = [];
  for (let i = 0; i < count; i++) {
    const landMs =
      startMs +
      SNAP_MS +
      (endMs - startMs - SNAP_MS) * Math.sqrt((i + 1) / count);
    snaps.push({
      pole: i % poles,
      from: {
        x: box.left + Math.random() * (box.right - box.left),
        y: box.top + Math.random() * (box.bottom - box.top),
      },
      angle: Math.random() * Math.PI * 2,
      reach: reach[0] + (reach[1] - reach[0]) * Math.random(),
      startMs: landMs - SNAP_MS,
      landMs,
      bow: Math.random() < 0.5 ? 1 : -1,
    });
  }
  return snaps;
}

// where a speck is at ms with its pole at `pole`: lying and tugging, snapping
// in along its bowed line, or clinging to the crust; `size` its speck size
export function snapAt(
  snap: Snap,
  ms: number,
  pole: Point,
  size: number,
  into: Point,
): Point {
  const cx = pole.x + Math.cos(snap.angle) * snap.reach;
  const cy = pole.y + Math.sin(snap.angle) * snap.reach * CRUST_SQUASH;
  if (ms >= snap.landMs) {
    into.x = cx;
    into.y = cy;
    return into;
  }
  if (ms < snap.startMs) {
    const dx = cx - snap.from.x;
    const dy = cy - snap.from.y;
    const d = Math.hypot(dx, dy) || 1;
    const tug =
      size * TUG * (0.5 + 0.5 * Math.sin(ms * TUG_RATE + snap.angle * 7));
    into.x = snap.from.x + (dx / d) * tug;
    into.y = snap.from.y + (dy / d) * tug;
    return into;
  }
  const u = clamp01((ms - snap.startMs) / (snap.landMs - snap.startMs)) ** 3;
  const mx = (snap.from.x + cx) / 2 - (cy - snap.from.y) * SNAP_BOW * snap.bow;
  const my = (snap.from.y + cy) / 2 + (cx - snap.from.x) * SNAP_BOW * snap.bow;
  const v = 1 - u;
  into.x = v * v * snap.from.x + 2 * v * u * mx + u * u * cx;
  into.y = v * v * snap.from.y + 2 * v * u * my + u * u * cy;
  return into;
}

// a speck flung off its crust `since` ms after the poles flipped, from where
// they met at `from`, `speed` px a ms
export function flingAt(
  snap: Snap,
  since: number,
  from: Point,
  speed: number,
  into: Point,
): Point {
  const out = snap.reach + speed * since;
  into.x = from.x + Math.cos(snap.angle) * out;
  into.y = from.y + Math.sin(snap.angle) * out;
  return into;
}

// iron filings: short rows of glitter lying at random angles that turn to
// line up along the poles' field as a wave spreads, drawing the field's
// picture, then rush onto their nearest pole. Scatter once (scatterFilings),
// then drawFilings each frame
export interface Filing {
  x: number;
  y: number;
  turn: number;
  len: number;
}

// a pole of the field: +1 or -1 (lines run from + to -)
export interface FieldPole {
  x: number;
  y: number;
  charge: number;
}

// the filings turn as a wave from `at` reaches them, `speed` px a ms, each
// turning over `turnMs`
export interface FilingWave {
  at: Point;
  startMs: number;
  speed: number;
  turnMs: number;
}

// they rush onto their nearest pole from startMs, the near ones first, the
// ones `reach` px out landing at endMs
export interface FilingRush {
  startMs: number;
  endMs: number;
  reach: number;
}

const RUSH_MS = 220;
// a filing is FILING_SPECKS glitter specks in a row, its middle one biggest
const FILING_SPECKS = 3;

export function scatterFilings(
  count: number,
  box: { left: number; top: number; right: number; bottom: number },
  len: number,
): Filing[] {
  return Array.from({ length: count }, () => ({
    x: box.left + Math.random() * (box.right - box.left),
    y: box.top + Math.random() * (box.bottom - box.top),
    turn: Math.random() * Math.PI,
    len: len * (0.7 + 0.6 * Math.random()),
  }));
}

// the field's direction at x, y
export function fieldTurn(x: number, y: number, poles: FieldPole[]): number {
  let bx = 0;
  let by = 0;
  for (const p of poles) {
    const dx = x - p.x;
    const dy = y - p.y;
    const r2 = dx * dx + dy * dy + 1;
    const k = p.charge / (r2 * Math.sqrt(r2));
    bx += dx * k;
    by += dy * k;
  }
  return Math.atan2(by, bx);
}

// `size` is a speck's glitter size
export function drawFilings(
  ctx: CanvasRenderingContext2D,
  filings: Filing[],
  poles: FieldPole[],
  ms: number,
  wave: FilingWave,
  size: number,
  rush?: FilingRush,
): void {
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 0; i < filings.length; i++) {
    const f = filings[i];
    let x = f.x;
    let y = f.y;
    let len = f.len;
    let turn = f.turn;
    const d = Math.hypot(f.x - wave.at.x, f.y - wave.at.y);
    const u = clamp01((ms - wave.startMs - d / wave.speed) / wave.turnMs);
    if (u > 0) {
      const delta =
        ((((fieldTurn(f.x, f.y, poles) - f.turn) % Math.PI) + Math.PI * 1.5) %
          Math.PI) -
        Math.PI / 2;
      turn += delta * u * u * (3 - 2 * u);
    }
    if (rush && ms > rush.startMs) {
      let near = poles[0];
      let nd = Infinity;
      for (const p of poles) {
        const pd = Math.hypot(f.x - p.x, f.y - p.y);
        if (pd < nd) {
          nd = pd;
          near = p;
        }
      }
      const t0 =
        rush.startMs +
        clamp01(nd / rush.reach) * (rush.endMs - rush.startMs - RUSH_MS);
      const v = clamp01((ms - t0) / RUSH_MS) ** 2;
      if (v >= 1) continue;
      if (v > 0) {
        x += (near.x - x) * v;
        y += (near.y - y) * v;
        turn = Math.atan2(near.y - f.y, near.x - f.x);
        len *= 1 + v;
      }
    }
    const cx = Math.cos(turn) * len;
    const cy = Math.sin(turn) * len;
    for (let j = 0; j < FILING_SPECKS; j++) {
      const s = j / (FILING_SPECKS - 1) - 0.5;
      stampGlimmer(
        ctx,
        x + cx * s,
        y + cy * s,
        size * (s === 0 ? 1.4 : 1),
        i * FILING_SPECKS + j,
        s === 0 ? COLOR.white : COLOR.heavenlyGold,
      );
    }
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

// gold field lines bowing between two poles, `lines` of them, glitter
// running along each from a to b; `size` sets their width and glitter
export function drawFieldLines(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  alpha: number,
  ms: number,
  size: number,
  lines = 5,
): void {
  if (alpha <= 0) return;
  const gap = Math.hypot(b.x - a.x, b.y - a.y);
  const nx = gap > 0 ? -(b.y - a.y) / gap : 0;
  const ny = gap > 0 ? (b.x - a.x) / gap : 1;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const previous = ctx.globalCompositeOperation;
  const base = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = base * alpha * FIELD_ALPHA;
  ctx.lineWidth = size * FIELD_WIDTH;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.beginPath();
  for (let k = 0; k < lines; k++) {
    const bow = (k - (lines - 1) / 2) * gap * FIELD_BOW;
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mx + nx * bow * 2, my + ny * bow * 2, b.x, b.y);
  }
  ctx.stroke();
  ctx.globalAlpha = base * alpha;
  beginLightBatch(ctx);
  for (let k = 0; k < lines; k++) {
    const bow = (k - (lines - 1) / 2) * gap * FIELD_BOW;
    const cx = mx + nx * bow * 2;
    const cy = my + ny * bow * 2;
    for (let j = 0; j < RUNNERS; j++) {
      const t = (j / RUNNERS + ms / RUN_MS + hash01(k, 3)) % 1;
      const v = 1 - t;
      stampGlimmer(
        ctx,
        v * v * a.x + 2 * v * t * cx + t * t * b.x,
        v * v * a.y + 2 * v * t * cy + t * t * b.y,
        size * RUNNER,
        j + k * RUNNERS,
        COLOR.white,
      );
    }
  }
  endLightBatch(ctx);
  ctx.globalAlpha = base;
  ctx.globalCompositeOperation = previous;
}
