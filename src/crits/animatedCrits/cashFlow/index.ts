// flowing cash for events: rivers of coins poured along a line (see
// ../riverPaths' pathsAlong and ../moneyCover's flow), plus where a river's
// head is, so a wisp can lead it or meet it. Lines are floor-local points
import type { Point } from "../../../shared/wisp";
import { FLOW_FLIGHT_MS, type CoverArea } from "../moneyCover";
import { pathsAlong } from "../riverPaths";
import type { WispCover } from "../wispCover";

// a pause after the last coin lands, before the cover ends
const END_PAUSE_MS = 100;

export interface Pour {
  // coins along the river while it's full, and px across where it starts
  coinsAlong: number;
  width: number;
  // how long it pours, and each coin's trip down it
  streamMs: number;
  travelMs: number;
}

// a line through at(u) for u 0..1, in `steps` pieces
export function sampleLine(at: (u: number) => Point, steps = 80): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => at(i / steps));
}

// the line's length, and each point's distance along it
export function measure(line: Point[]): number[] {
  const along = [0];
  for (let i = 1; i < line.length; i++)
    along.push(
      along[i - 1] +
        Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y),
    );
  return along;
}

// the point `share` 0..1 of the way along the line (by length)
export function pointAlong(
  line: Point[],
  along: number[],
  share: number,
  into: Point,
): Point {
  const s = Math.min(1, Math.max(0, share)) * along[along.length - 1];
  let lo = 0;
  let hi = line.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (along[mid] <= s) lo = mid;
    else hi = mid;
  }
  const f = (s - along[lo]) / (along[hi] - along[lo] || 1);
  into.x = line[lo].x + (line[hi].x - line[lo].x) * f;
  into.y = line[lo].y + (line[hi].y - line[lo].y) * f;
  return into;
}

// pours a river of cash down the line now; its coins hop on into the total
// at its end
export function pourLine(cover: WispCover, line: Point[], pour: Pour): void {
  if (!cover.isLive()) return;
  const count = Math.round((pour.coinsAlong * pour.streamMs) / pour.travelMs);
  cover.cover.flow(
    pathsAlong(line, count, pour.width),
    pour.streamMs,
    pour.travelMs,
  );
}

// the head of a river poured startMs in, ms in: null before it pours or once
// it's run its course
export function riverHead(
  line: Point[],
  travelMs: number,
  startMs = 0,
): (ms: number) => Point | null {
  const along = measure(line);
  const point = { x: 0, y: 0 };
  return (ms) => {
    const u = (ms - startMs) / travelMs;
    return u < 0 || u > 1 ? null : pointAlong(line, along, u, point);
  };
}

// how long a cover lasts whose last river starts pouring lastStartMs in
export function pourDurationMs(lastStartMs: number, pour: Pour): number {
  return (
    lastStartMs +
    pour.streamMs +
    pour.travelMs * 1.03 +
    FLOW_FLIGHT_MS +
    END_PAUSE_MS
  );
}

// the total's rough spot (top middle) for lines that end there before the
// overlay has drawn the real one
export function totalSpot(area: CoverArea): Point {
  return { x: (area.left + area.right) / 2, y: area.top + 90 };
}
