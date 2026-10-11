// how hard the game's frames are running: the gap between redraws, smoothed.
// gameCanvas feeds it once a frame; anything optional (a random spawn) can
// wait while it runs slow rather than sink the frame rate further
const SMOOTH = 0.1;
// slower than about 45fps
const LOADED_MS = 22;
// a longer gap is a stall (the tab away, a dialog open), not load
const STALL_MS = 100;

let lastAt = -Infinity;
let gapMs = 1000 / 60;

export function noteFrame(now: number): void {
  const gap = now - lastAt;
  lastAt = now;
  if (gap <= STALL_MS) gapMs += (gap - gapMs) * SMOOTH;
}

export function isFrameLoaded(): boolean {
  return gapMs > LOADED_MS;
}
