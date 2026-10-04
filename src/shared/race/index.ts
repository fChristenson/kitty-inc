// racing for events: a wisp driven along a line like a racecar, flat out on
// the straights, braking hard into each corner, crawling round it, then
// accelerating out, faster and faster into the finish. Plan once at arm with
// planRace, then at(ms) for where it is and msAt for each corner's beats
import type { Point } from "../wisp";
import { clamp01, lerp, smoothstep } from "../easing";

// a corner, as distances along the line where it starts and ends
export interface RaceCorner {
  from: number;
  to: number;
}

export interface RaceStyle {
  // speeds as shares of top speed: through corners, and at the finish
  corner?: number;
  finish?: number;
  // share of each straight spent braking for the corner ending it
  braking?: number;
}

export interface Race {
  // the line's length, and each point's distance along it
  length: number;
  along: number[];
  // where it is ms into the race (held at the start before it, at the
  // finish after it), written into `into`
  at(ms: number, into: Point): Point;
  // when it reaches distance s along the line
  msAt(s: number): number;
}

// a race down `line` taking raceMs, round `corners` (in order along it)
export function planRace(
  line: Point[],
  raceMs: number,
  corners: RaceCorner[],
  { corner = 0.3, finish = 1.3, braking = 0.35 }: RaceStyle = {},
): Race {
  const along = [0];
  for (let i = 1; i < line.length; i++)
    along.push(
      along[i - 1] +
        Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y),
    );
  const length = along[along.length - 1];
  const speedAt = (s: number) => {
    let k = 0;
    while (k < corners.length && corners[k].to < s) k++;
    const next = corners[k];
    if (next && s >= next.from) return corner;
    const prev = corners[k - 1];
    const start = prev ? prev.to : 0;
    const end = next ? next.from : length;
    const brakeFrom = next ? end - (end - start) * braking : end;
    // powering out of the last corner, up to full speed (or the finish's)
    const out = prev
      ? lerp(
          [corner, next ? 1 : finish],
          clamp01((s - start) / Math.max(1, brakeFrom - start)),
        )
      : 1;
    const brake =
      next && s > brakeFrom
        ? lerp([1, corner], smoothstep((s - brakeFrom) / (end - brakeFrom)))
        : Infinity;
    return Math.min(out, brake);
  };
  const times = [0];
  for (let i = 1; i < line.length; i++)
    times.push(
      times[i - 1] +
        (along[i] - along[i - 1]) /
          ((speedAt(along[i]) + speedAt(along[i - 1])) / 2),
    );
  const scale = raceMs / (times[times.length - 1] || 1);
  for (let i = 0; i < times.length; i++) times[i] *= scale;
  const search = (values: number[], v: number) => {
    let lo = 0;
    let hi = values.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (values[m] <= v) lo = m;
      else hi = m;
    }
    return lo;
  };
  return {
    length,
    along,
    at: (ms, into) => {
      const lo = search(times, ms);
      const hi = Math.min(lo + 1, line.length - 1);
      const f = clamp01((ms - times[lo]) / (times[hi] - times[lo] || 1));
      into.x = lerp([line[lo].x, line[hi].x], f);
      into.y = lerp([line[lo].y, line[hi].y], f);
      return into;
    },
    msAt: (s) => {
      const lo = search(along, s);
      const hi = Math.min(lo + 1, line.length - 1);
      const f = clamp01((s - along[lo]) / (along[hi] - along[lo] || 1));
      return lerp([times[lo], times[hi]], f);
    },
  };
}
