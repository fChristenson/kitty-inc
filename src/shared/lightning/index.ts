// lightning for events: jagged, forking bolts that crackle (their kinks
// flicker every frame) built once at arm time and drawn with the beam
// sections of ../beam, plus where one strikes
import type { Point } from "../wisp";
import { drawBeam, drawBeamFlare } from "../beam";

const KINKS = 8;
// kinks swing up to JAG of the bolt's length sideways; forks branch off up
// to FORK of its length, FORK_WIDTH as thick
const JAG = 0.12;
const FORK = 0.35;
const FORK_WIDTH = 0.45;
const WIDTH = 22;
const CORE = 0.36;
// a solid bolt's soft halo and core, of the bolt's width, and the halo's alpha
const SOLID_HALO = 0.6;
const SOLID_CORE = 0.22;
const SOLID_HALO_ALPHA = 0.3;
const STRIKE = 34;

export interface Bolt {
  from: Point;
  to: Point;
  kinks: number[];
  forks: { at: number; angle: number; length: number; kinks: number[] }[];
}

const kinks = (count: number) =>
  Array.from({ length: count }, () => (Math.random() * 2 - 1) * JAG);

// a bolt from `from` to `to`, sprouting up to `forks` side branches
export function createBolt(from: Point, to: Point, forks = 2): Bolt {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const heading = Math.atan2(to.y - from.y, to.x - from.x);
  return {
    from,
    to,
    kinks: kinks(KINKS),
    forks: Array.from({ length: forks }, () => ({
      at: 0.2 + 0.6 * Math.random(),
      angle:
        heading + (Math.random() < 0.5 ? -1 : 1) * (0.4 + 0.5 * Math.random()),
      length: length * FORK * (0.4 + 0.6 * Math.random()),
      kinks: kinks(4),
    })),
  };
}

const a = { x: 0, y: 0 };
const b = { x: 0, y: 0 };
const forkStart = { x: 0, y: 0 };
const forkEnd = { x: 0, y: 0 };
// one jagged run's points, x then y
const run = new Float64Array((KINKS + 2) * 2);

// a jagged run from `from` to `to`, its kinks flickering frame to frame;
// `solid` draws it as plain strokes of that color (a soft halo and a core)
// instead of the gold beams, so it stays that color over a bright screen
function drawJagged(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  offsets: number[],
  width: number,
  alpha: number,
  solid?: string,
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const steps = offsets.length + 1;
  run[0] = from.x;
  run[1] = from.y;
  for (let i = 1; i <= steps; i++) {
    const u = i / steps;
    const off =
      i === steps ? 0 : offsets[i - 1] * length * (0.6 + 0.8 * Math.random());
    run[i * 2] = from.x + dx * u + nx * off;
    run[i * 2 + 1] = from.y + dy * u + ny * off;
  }
  if (solid) {
    ctx.save();
    ctx.strokeStyle = solid;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(run[0], run[1]);
    for (let i = 1; i <= steps; i++) ctx.lineTo(run[i * 2], run[i * 2 + 1]);
    const base = ctx.globalAlpha * alpha;
    ctx.globalAlpha = base * SOLID_HALO_ALPHA;
    ctx.lineWidth = width * SOLID_HALO;
    ctx.stroke();
    ctx.globalAlpha = base;
    ctx.lineWidth = width * SOLID_CORE;
    ctx.stroke();
    ctx.restore();
    return;
  }
  for (let i = 1; i <= steps; i++) {
    a.x = run[i * 2 - 2];
    a.y = run[i * 2 - 1];
    b.x = run[i * 2];
    b.y = run[i * 2 + 1];
    drawBeam(ctx, a, b, width, alpha);
    drawBeam(ctx, a, b, width * CORE, alpha);
  }
}

// the bolt and its forks, `scale` as thick as usual, at alpha; all `solid`
// if given
export function drawBolt(
  ctx: CanvasRenderingContext2D,
  bolt: Bolt,
  alpha = 1,
  scale = 1,
  solid?: string,
): void {
  if (alpha <= 0) return;
  drawJagged(ctx, bolt.from, bolt.to, bolt.kinks, WIDTH * scale, alpha, solid);
  for (const fork of bolt.forks) {
    forkStart.x = bolt.from.x + (bolt.to.x - bolt.from.x) * fork.at;
    forkStart.y = bolt.from.y + (bolt.to.y - bolt.from.y) * fork.at;
    forkEnd.x = forkStart.x + Math.cos(fork.angle) * fork.length;
    forkEnd.y = forkStart.y + Math.sin(fork.angle) * fork.length;
    drawJagged(
      ctx,
      forkStart,
      forkEnd,
      fork.kinks,
      WIDTH * scale * FORK_WIDTH,
      alpha,
      solid,
    );
  }
}

// the blinding flare where a bolt strikes
export function drawStrike(
  ctx: CanvasRenderingContext2D,
  at: Point,
  alpha = 1,
  scale = 1,
  now = performance.now(),
): void {
  drawBeamFlare(ctx, at, STRIKE * scale, alpha, now);
}
