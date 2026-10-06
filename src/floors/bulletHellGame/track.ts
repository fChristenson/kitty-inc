import type { Point } from "../../shared/wisp";

export const TRACK_KEEP_MS = 1400;

// a simulated thing's recent spots, so its wisp trail can look back along them
export class Track {
  private t: number[] = [];
  private xs: number[] = [];
  private ys: number[] = [];
  private first = 0;
  private spot: Point = { x: 0, y: 0 };
  end = Infinity;

  push(ms: number, x: number, y: number): void {
    this.t.push(ms);
    this.xs.push(x);
    this.ys.push(y);
    while (
      this.first < this.t.length - 2 &&
      this.t[this.first + 1] < ms - TRACK_KEEP_MS
    )
      this.first++;
    if (this.first > 256) {
      this.t.splice(0, this.first);
      this.xs.splice(0, this.first);
      this.ys.splice(0, this.first);
      this.first = 0;
    }
  }

  at = (ms: number): Point | null => {
    const { t, xs, ys, first } = this;
    const last = t.length - 1;
    if (last < first || ms < t[first] || ms > this.end) return null;
    if (ms >= t[last]) {
      this.spot.x = xs[last];
      this.spot.y = ys[last];
      return this.spot;
    }
    let lo = first;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (t[mid] <= ms) lo = mid;
      else hi = mid;
    }
    const u = (ms - t[lo]) / (t[hi] - t[lo] || 1);
    this.spot.x = xs[lo] + (xs[hi] - xs[lo]) * u;
    this.spot.y = ys[lo] + (ys[hi] - ys[lo]) * u;
    return this.spot;
  };
}
