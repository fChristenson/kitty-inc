// Caps how many real device pixels any canvas backing store renders at — a
// phone reporting devicePixelRatio 3 would otherwise composite/rasterize 9x
// the raw pixels of a DPR-1 canvas every single frame, for a barely-
// perceptible crispness gain on a small mobile screen. 2 is the standard
// mobile-game sweet spot. Every canvas-sizing module in this codebase
// (background/gameCanvas, background/cityMap, shared/canvasGame) used to
// read `window.devicePixelRatio` directly and uncapped — centralized here
// so a future device with an even higher native DPR can't reintroduce the
// same unbounded-pixel-count cost in any of them again.
const MAX_DPR = 2;

export function getEffectiveDpr(): number {
  return Math.min(window.devicePixelRatio || 1, MAX_DPR);
}
