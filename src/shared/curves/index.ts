// curves for event paths: points along a quadratic bezier and through a
// Catmull-Rom chain, written into a caller's point so a path can reuse one
import type { Point } from "../wisp";

// a Catmull-Rom curve through b and c, steered by a and d, t 0..1
export function catmull(
  a: number,
  b: number,
  c: number,
  d: number,
  t: number,
): number {
  return (
    0.5 *
    (2 * b +
      (c - a) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t +
      (3 * b - a - 3 * c + d) * t * t * t)
  );
}

// the point u 0..1 along a smooth curve through every point of `route`
export function alongRoute(route: Point[], u: number, into: Point): Point {
  const last = route.length - 1;
  const f = Math.min(last, Math.max(0, u * last));
  const k = Math.min(last - 1, Math.floor(f));
  const t = f - k;
  const a = route[Math.max(0, k - 1)];
  const b = route[k];
  const c = route[k + 1];
  const d = route[Math.min(last, k + 2)];
  into.x = catmull(a.x, b.x, c.x, d.x, t);
  into.y = catmull(a.y, b.y, c.y, d.y, t);
  return into;
}

// the point u 0..1 along the quadratic bezier from a, bent toward c, to b
export function bezier(
  a: Point,
  c: Point,
  b: Point,
  u: number,
  into: Point,
): Point {
  const v = 1 - u;
  into.x = v * v * a.x + 2 * u * v * c.x + u * u * b.x;
  into.y = v * v * a.y + 2 * u * v * c.y + u * u * b.y;
  return into;
}
