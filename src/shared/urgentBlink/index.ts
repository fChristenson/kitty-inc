// the blink of something about to vanish (a worker's boost bubbles, popping
// bubbles): an alpha multiplier pulsing harder the closer remainingMs gets
// to 0 inside the last thresholdMs, 1 before that
const BLINK_RATE = 0.525 / (1000 / 60);
const MAX_AMPLITUDE = 0.425;

export function urgentBlink(
  remainingMs: number,
  thresholdMs: number,
  now: number,
): number {
  if (remainingMs >= thresholdMs) return 1;
  const amplitude =
    MAX_AMPLITUDE * (1 - Math.max(0, remainingMs) / thresholdMs);
  return 1 - amplitude + amplitude * Math.sin(now * BLINK_RATE);
}
