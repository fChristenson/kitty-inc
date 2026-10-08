// the phone's buzz (Android only, iOS has no vibration API), shared by every
// explosion and the crit flash so one never cuts a longer one short
export const MAX_VIBRATE_MS = 100;

let vibratingUntil = 0;

// buzzes for ms (capped at MAX_VIBRATE_MS) unless a longer buzz is running
export function buzz(ms: number): void {
  if (typeof navigator.vibrate !== "function") return;
  ms = Math.min(MAX_VIBRATE_MS, Math.max(0, Math.round(ms)));
  const now = performance.now();
  if (now + ms <= vibratingUntil) return;
  vibratingUntil = now + ms;
  navigator.vibrate(ms);
}

// replaces whatever buzz is running with one of ms (0 stops it)
export function setBuzz(ms: number): void {
  if (typeof navigator.vibrate !== "function") return;
  ms = Math.min(MAX_VIBRATE_MS, Math.max(0, Math.round(ms)));
  vibratingUntil = performance.now() + ms;
  navigator.vibrate(ms);
}
