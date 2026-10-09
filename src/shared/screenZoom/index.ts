// the whole live screen's zoom round its middle, 1 at rest: a floor crit
// (Big Bang) hands a curve of Date.now() for gameCanvas to read each frame
let curve: ((now: number) => number) | null = null;

export function setScreenZoom(next: ((now: number) => number) | null): void {
  curve = next;
}

export function getScreenZoom(now: number): number {
  return curve ? curve(now) : 1;
}
