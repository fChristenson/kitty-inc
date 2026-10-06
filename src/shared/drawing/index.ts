// pictures for events, drawn out of dots: the outline or the filled body of
// a picture (a star, a heart, a coin, a crown, a gem, a cat's head, a
// lightning bolt), as hundreds of points to land wisps, bullets or glitter
// on, scaled onto the screen once at arm. Build the dots with shapeOutline
// or shapeFill, order them with penOrder for a pen wisp to trace them in one
// stroke, and stamp the ones that have landed with drawDots
import { COLOR } from "../../palette";
import { stampGlimmer } from "../twinkle";
import type { Point } from "../wisp";

// closed loops in a unit box (-1..1, y down); a hole is a loop inside another
export type Shape = readonly (readonly Point[])[];

const TAU = Math.PI * 2;
const ring = (r: number, count: number, squash = 1): Point[] =>
  Array.from({ length: count }, (_, k) => ({
    x: Math.cos((k / count) * TAU) * r,
    y: Math.sin((k / count) * TAU) * r * squash,
  }));

export const SHAPES = {
  star: [
    Array.from({ length: 10 }, (_, k) => {
      const r = k % 2 === 0 ? 1 : 0.4;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    }),
  ],
  heart: [
    Array.from({ length: 64 }, (_, k) => {
      const t = (k / 64) * TAU;
      return {
        x: (16 * Math.sin(t) ** 3) / 17,
        y:
          -(
            13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t)
          ) /
            17 -
          0.1,
      };
    }),
  ],
  coin: [ring(1, 64), ring(0.68, 48)],
  crown: [
    [
      { x: -1, y: 0.65 },
      { x: -1, y: -0.55 },
      { x: -0.5, y: 0.05 },
      { x: 0, y: -0.8 },
      { x: 0.5, y: 0.05 },
      { x: 1, y: -0.55 },
      { x: 1, y: 0.65 },
    ],
  ],
  gem: [
    [
      { x: -1, y: -0.3 },
      { x: -0.55, y: -0.8 },
      { x: 0.55, y: -0.8 },
      { x: 1, y: -0.3 },
      { x: 0, y: 1 },
    ],
  ],
  catHead: [
    [
      { x: -0.95, y: -0.95 },
      { x: -0.4, y: -0.55 },
      { x: 0.4, y: -0.55 },
      { x: 0.95, y: -0.95 },
      { x: 0.95, y: 0.05 },
      ...Array.from({ length: 23 }, (_, k) => {
        const a = (k / 22) * Math.PI;
        return { x: Math.cos(a) * 0.95, y: 0.05 + Math.sin(a) * 0.9 };
      }),
      { x: -0.95, y: 0.05 },
    ],
  ],
  bolt: [
    [
      { x: 0.25, y: -1 },
      { x: -0.6, y: 0.15 },
      { x: -0.05, y: 0.15 },
      { x: -0.3, y: 1 },
      { x: 0.6, y: -0.2 },
      { x: 0.05, y: -0.2 },
    ],
  ],
} satisfies Record<string, Shape>;
export type ShapeName = keyof typeof SHAPES;

const scaled = (p: Point, centre: Point, size: number): Point => ({
  x: centre.x + p.x * size,
  y: centre.y + p.y * size,
});

// `count` dots evenly round every loop of the shape, `size` px from its
// middle to its edge
export function shapeOutline(
  shape: Shape,
  count: number,
  centre: Point,
  size: number,
): Point[] {
  const lengths = shape.map((loop) =>
    loop.reduce((sum, p, k) => {
      const q = loop[(k + 1) % loop.length];
      return sum + Math.hypot(q.x - p.x, q.y - p.y);
    }, 0),
  );
  const total = lengths.reduce((a, b) => a + b, 0);
  const dots: Point[] = [];
  shape.forEach((loop, l) => {
    const n = Math.max(3, Math.round((count * lengths[l]) / total));
    const gap = lengths[l] / n;
    let k = 0;
    let along = 0;
    for (let i = 0; i < n; i++) {
      const want = i * gap;
      for (;;) {
        const p = loop[k % loop.length];
        const q = loop[(k + 1) % loop.length];
        const edge = Math.hypot(q.x - p.x, q.y - p.y);
        if (along + edge >= want || k >= loop.length - 1) {
          const u = edge > 0 ? Math.min(1, (want - along) / edge) : 0;
          dots.push(
            scaled(
              { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u },
              centre,
              size,
            ),
          );
          break;
        }
        along += edge;
        k++;
      }
    }
  });
  return dots;
}

// whether a unit-box point is inside the shape (even-odd, so holes count)
function inside(shape: Shape, x: number, y: number): boolean {
  let hit = false;
  for (const loop of shape)
    for (let k = 0, j = loop.length - 1; k < loop.length; j = k++) {
      const a = loop[k];
      const b = loop[j];
      if (
        a.y > y !== b.y > y &&
        x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
      )
        hit = !hit;
    }
  return hit;
}

// about `count` dots filling the shape's body like mosaic tiles on a grid,
// row by row from the top
export function shapeFill(
  shape: Shape,
  count: number,
  centre: Point,
  size: number,
): Point[] {
  // grid fine enough to land near `count` tiles inside, from the shape's area
  let area = 0;
  const probe = 40;
  for (let i = 0; i < probe; i++)
    for (let j = 0; j < probe; j++)
      if (
        inside(
          shape,
          -1 + (2 * (i + 0.5)) / probe,
          -1 + (2 * (j + 0.5)) / probe,
        )
      )
        area++;
  const step = 2 * Math.sqrt(area / (probe * probe) / Math.max(1, count));
  const dots: Point[] = [];
  for (let y = -1 + step / 2, row = 0; y < 1; y += step, row++)
    for (let x = -1 + step / 2 + (row % 2 ? step / 2 : 0); x < 1; x += step)
      if (inside(shape, x, y)) dots.push(scaled({ x, y }, centre, size));
  return dots;
}

// the dots reordered into one stroke from `start`, always to the nearest
// one left, for a pen wisp to trace
export function penOrder(dots: readonly Point[], start: Point): Point[] {
  const left = [...dots];
  const order: Point[] = [];
  let at = start;
  while (left.length > 0) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < left.length; i++) {
      const d = (left[i].x - at.x) ** 2 + (left[i].y - at.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    at = left[best];
    order.push(at);
    left.splice(best, 1);
  }
  return order;
}

// the first `count` dots as glitter `size` px, white and gold in turn,
// blazing bigger and whiter as `blaze` runs 0..1
export function drawDots(
  ctx: CanvasRenderingContext2D,
  dots: readonly Point[],
  count: number,
  size: number,
  ms: number,
  blaze = 0,
): void {
  const n = Math.min(count, dots.length);
  if (n <= 0 || size <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++)
    stampGlimmer(
      ctx,
      dots[i].x,
      dots[i].y,
      size * (1 + 0.6 * blaze),
      i + ms * 0.004,
      blaze > 0.5 || i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
    );
  ctx.restore();
}
