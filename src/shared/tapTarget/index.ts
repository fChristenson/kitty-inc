// tap targets for the things a finger has to catch (the mouse, bubbles, the
// wisp's glitter): every hit test reaches a fingertip past what's drawn, in
// CSS px, so a target stays easy to hit however small it's drawn or however
// far the screen is scaled down. All in gameCanvas's world units
import type { Point } from "../wisp";

// how far past a target's edge a tap still counts, in CSS px
const FINGER_PX = 28;

let unitsPerCssPx = 1;

// gameCanvas hands in its scale (CSS px per world unit) whenever it resizes
export function setTapScale(cssPxPerUnit: number): void {
  if (cssPxPerUnit > 0) unitsPerCssPx = 1 / cssPxPerUnit;
}

// a fingertip's reach in world units
export function fingerReach(): number {
  return FINGER_PX * unitsPerCssPx;
}

// how far (x, y) is from the segment a to b
export function distanceToSegment(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t =
    length2 > 0
      ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length2))
      : 0;
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
}

// whether a tap at (x, y) lands on a round target `radius` across at `at`
export function tapHits(
  x: number,
  y: number,
  at: Point,
  radius: number,
): boolean {
  return Math.hypot(x - at.x, y - at.y) <= radius + fingerReach();
}

// whether a tap at (x, y) lands on a round target that moved from `from` to
// `to` lately: a finger lags a moving target, so where it just was counts too
export function tapHitsMoving(
  x: number,
  y: number,
  from: Point,
  to: Point,
  radius: number,
): boolean {
  return (
    distanceToSegment(x, y, from.x, from.y, to.x, to.y) <=
    radius + fingerReach()
  );
}

// whether a swipe from (x0, y0) to (x1, y1) passes over a round target
export function swipeHits(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  at: Point,
  radius: number,
): boolean {
  return (
    distanceToSegment(at.x, at.y, x0, y0, x1, y1) <= radius + fingerReach()
  );
}
