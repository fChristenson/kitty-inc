// the small continuous idle "wiggle" rotation shared by every button/marker that
// plays it while some special state is active (a crit-upgrade floor button, the
// press conference's sales button) — one shared formula instead of each caller
// redeclaring its own identical WIGGLE_PERIOD_MS/WIGGLE_MAX_RADIANS constants
const WIGGLE_PERIOD_MS = 260;
const WIGGLE_MAX_RADIANS = 0.08;

export function getWiggleRotation(
  now: number,
  periodMs = WIGGLE_PERIOD_MS,
  maxRadians = WIGGLE_MAX_RADIANS,
): number {
  return Math.sin((now / periodMs) * Math.PI * 2) * maxRadians;
}
