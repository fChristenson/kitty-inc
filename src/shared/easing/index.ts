// smoothstep — the standard plain-math equivalent to CSS's ease-in-out timing;
// used by every hand-rolled (non-CSS) transition animation in this game instead
// of each one reimplementing the same t*t*(3-2*t) formula inline
export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
