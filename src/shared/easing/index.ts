// the one home of the small timing maths every event repeats: ranges, clamps
// and easing curves. Ranges are [from, to] pairs, as events declare them
export type Range = [number, number];

// smoothstep — the standard plain-math equivalent to CSS's ease-in-out timing;
// used by every hand-rolled (non-CSS) transition animation in this game instead
// of each one reimplementing the same t*t*(3-2*t) formula inline
export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

// t (0..1) of the way through range
export const lerp = ([a, b]: Range, t: number): number => a + (b - a) * t;

// a random value within range
export const between = (range: Range): number => lerp(range, Math.random());

export const easeIn = (t: number): number => t * t;
export const easeOut = (t: number): number => 1 - (1 - t) ** 2;
export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
// overshoots a little past 1 before settling
export const easeOutBack = (t: number): number =>
  1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

// how far (0..1) through [from, from + span] ms is
export const progress = (ms: number, from: number, span: number): number =>
  clamp01((ms - from) / span);
