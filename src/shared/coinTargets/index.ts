// where an event's coins fly to: rings round a blast and sprays off a hit.
// Every coin event builds its targets through these instead of its own loop
import { between, type Range } from "../easing";

export type Point = { x: number; y: number };

// `count` targets spread evenly round `at`, each a random distance within reach
export function ringTargets(at: Point, count: number, reach: Range): Point[] {
  const targets: Point[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = between(reach);
    targets[i] = {
      x: at.x + Math.cos(angle) * r,
      y: at.y + Math.sin(angle) * r,
    };
  }
  return targets;
}

// `count` targets flung off `at` in random directions within `span` rad
// centered on `aim` (rad; -π/2 is straight up), each within reach
export function sprayTargets(
  at: Point,
  count: number,
  reach: Range,
  aim = 0,
  span = Math.PI * 2,
): Point[] {
  const targets: Point[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const angle = aim + (Math.random() - 0.5) * span;
    const r = between(reach);
    targets[i] = {
      x: at.x + Math.cos(angle) * r,
      y: at.y + Math.sin(angle) * r,
    };
  }
  return targets;
}

// keeps targets inside [top, bottom], so none fly off the screen's edges
export function clampTargetsY(
  targets: Point[],
  top: number,
  bottom = Infinity,
): Point[] {
  for (const t of targets) t.y = Math.min(bottom, Math.max(top, t.y));
  return targets;
}
