// the whole-canvas shake: anything can kick it (crits, events, slams) and
// gameCanvas/cityMap read its offset each frame. Lives in shared so callers
// don't pull in the crit modules just to shake the screen.

// extended duration so the initial punch is followed by a tail of decaying minor
// shakes settling to rest, rather than stopping dead right after the punch
const SHAKE_DURATION_MS = 650;
const SHAKE_MAGNITUDE_PX = 34;
// exponential decay (per second) instead of a linear ramp-down: front-loads the
// punch and gives a long, gradually fading rattle tail instead of a constant
// linear decline that reads as one smooth motion rather than a settling shake
const SHAKE_DECAY_RATE = 8;
// chained crits pile their shakes up to this many times a single one's intensity
const SHAKE_MAX_STACK = 4;

let shakeStartedAt: number | null = null;
// how hard the running shake hits (stacked shakes add up)
let shakeIntensity = 1;
// randomized per kick so repeated crits don't all rattle
// along the exact same fixed waveform/strength — a subtle bit of organic variance
let shakeMagnitudeScale = 1;
let shakePhaseX = 0;
let shakePhaseY = 0;

// every crit hits right away, even one whose flash gets dropped, adding onto
// whatever is left of a still-running shake
export function kickShake(intensity: number, now: number): void {
  const left =
    shakeStartedAt === null
      ? 0
      : shakeIntensity *
        Math.exp((-SHAKE_DECAY_RATE * (now - shakeStartedAt)) / 1000);
  shakeStartedAt = now;
  shakeIntensity = Math.min(SHAKE_MAX_STACK, left + intensity);
  shakeMagnitudeScale = 0.85 + Math.random() * 0.3;
  shakePhaseX = Math.random() * Math.PI * 2;
  shakePhaseY = Math.random() * Math.PI * 2;
}

// a shake with no flash, so it never holds up a crit's own flash
export function shakeScreen(intensity: number): void {
  kickShake(intensity, Date.now());
}

// settles any running shake at once, e.g. right before a screen freeze
// captures its frame
export function stopScreenShake(): void {
  shakeStartedAt = null;
}

// call once per frame from gameCanvas.ts's redraw(), before its own dpr/scale
// transforms are applied, so the magnitude is a consistent CSS-pixel amount
// regardless of the world's current zoom/scale
export function getScreenShakeOffset(now: number): { x: number; y: number } {
  if (shakeStartedAt === null) return { x: 0, y: 0 };
  const elapsed = now - shakeStartedAt;
  if (elapsed >= SHAKE_DURATION_MS * shakeIntensity) {
    shakeStartedAt = null;
    return { x: 0, y: 0 };
  }
  const t = elapsed / 1000;
  const magnitude =
    SHAKE_MAGNITUDE_PX *
    shakeIntensity *
    shakeMagnitudeScale *
    Math.exp(-SHAKE_DECAY_RATE * t);
  // two different frequencies (plus each trigger's own random phase offset) so
  // x/y don't move in lockstep and consecutive crits don't rattle identically —
  // reads as a rattle, not a single diagonal bounce
  return {
    x: Math.sin(t * 70 + shakePhaseX) * magnitude,
    y: Math.cos(t * 53 + shakePhaseY) * magnitude,
  };
}
