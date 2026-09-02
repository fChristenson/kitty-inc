// tiny shared trigger for a whole-canvas shake, used to give big/free actions (like
// a crit upgrade) a sense of physical weight. Decoupled from gameCanvas.ts's own
// render loop on purpose: floorInteractions.ts (deep under floors/) triggers this,
// gameCanvas.ts (under background/) reads it — going through a dedicated module
// avoids a floors->background or background->floors module-boundary violation.

import { drawCartoonText } from "../utils";
import { COLOR } from "../palette";

// extended duration so the initial punch is followed by a tail of decaying minor
// shakes settling to rest, rather than stopping dead right after the punch
const SHAKE_DURATION_MS = 650;
const SHAKE_MAGNITUDE_PX = 14;
// exponential decay (per second) instead of a linear ramp-down: front-loads the
// punch and gives a long, gradually fading rattle tail instead of a constant
// linear decline that reads as one smooth motion rather than a settling shake
const SHAKE_DECAY_RATE = 6;

let shakeStartedAt: number | null = null;
// scales the shake's own magnitude/duration only — the flash text below tracks its
// OWN separate lifetime (flashStartedAt/flashEndsAt), since a "sticky" tier (ultra)
// holds its flash on screen far longer than the short physical shake rattle
let shakeIntensity = 1;

let flashStartedAt: number | null = null;
// absolute end timestamp, computed once at trigger time from GROWTH_DURATION_MS +
// flashHoldMs + the fade tail — lets triggerScreenShake and drawCritFlash both check
// "is a flash still playing" without re-deriving it from elapsed-time math
let flashEndsAt: number | null = null;
let flashLabel = "CRIT!";
let flashColor: string = COLOR.purple;
let flashStrokeWidth = 16;
// how many times/sec the flash strobes on/off during its hold phase, on top of the
// regular grow-in/fade-out animation — 0 (the default) means no strobe at all, just
// the plain animation every tier already had
let flashBlinkHz = 0;
// how long the flash "sticks" at full size or blinking) after the regular grow-in
// animation, before the existing fade-out begins — 0 (the default) means no change
// from the original crit/mega behavior (straight into the fade after growing in)
let flashHoldMs = 0;
// higher-priority celebrations (mega/ultra) must be fully noticed before a
// lower-priority one (e.g. a plain crit rolling moments later) can cut them off
// early — triggerScreenShake ignores any call whose priority is lower than the
// currently still-playing flash's own priority
let activeFlashPriority = -1;

// how long the grow-in (scale + rotate) phase takes, and the fade-out tail's base
// duration before any per-tier `intensity` scaling — declared up here (moved out of
// their original spot further down) since triggerScreenShake needs them to compute
// flashEndsAt
const GROWTH_DURATION_MS = 100;
const FLASH_DURATION_MS = 260;

export function triggerScreenShake(options?: {
  intensity?: number;
  label?: string;
  color?: string;
  strokeWidth?: number;
  blinkHz?: number;
  holdMs?: number;
  priority?: number;
}): void {
  const priority = options?.priority ?? 0;
  const now = Date.now();
  // a bigger celebration is still playing out — don't let a lower-tier one
  // interrupt/overwrite it early
  if (
    flashEndsAt !== null &&
    now < flashEndsAt &&
    priority < activeFlashPriority
  ) {
    return;
  }

  shakeStartedAt = now;
  shakeIntensity = options?.intensity ?? 1;

  flashStartedAt = now;
  flashLabel = options?.label ?? "CRIT!";
  flashColor = options?.color ?? COLOR.purple;
  flashStrokeWidth = options?.strokeWidth ?? 16;
  flashBlinkHz = options?.blinkHz ?? 0;
  flashHoldMs = options?.holdMs ?? 0;
  activeFlashPriority = priority;
  const fadeDurationMs =
    FLASH_DURATION_MS * shakeIntensity - GROWTH_DURATION_MS;
  flashEndsAt = now + GROWTH_DURATION_MS + flashHoldMs + fadeDurationMs;
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
    SHAKE_MAGNITUDE_PX * shakeIntensity * Math.exp(-SHAKE_DECAY_RATE * t);
  // two different frequencies so x/y don't move in lockstep (reads as a rattle,
  // not a single diagonal bounce)
  return {
    x: Math.sin(t * 70) * magnitude,
    y: Math.cos(t * 53) * magnitude,
  };
}

// big flash text (flashLabel/flashColor, set by triggerScreenShake) that pops in
// oversized, optionally sticks/blinks for flashHoldMs, then settles/fades out.
// Tracks its own flashStartedAt/flashEndsAt (set by triggerScreenShake) rather than
// the shake's — a "sticky" tier's flash can outlive the shake's own short rattle by
// several seconds. Call from gameCanvas.ts's redraw() in plain screen space, after
// the shake translate has been undone, so the text itself doesn't rattle along with
// the world
const START_ROTATION_DEG = -45; // rotated in from this angle, settling to upright
// standard "ease out back" overshoot constants: grows past full size then settles
// to it, instead of just stopping dead at 1 — reads as a springy pop, not a static fade-in
const BACK_C1 = 1.70158;
const BACK_C3 = BACK_C1 + 1;

export function drawCritFlash(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  viewportWidth: number,
  now: number,
): void {
  if (flashStartedAt === null || flashEndsAt === null) return;
  if (now >= flashEndsAt) {
    flashStartedAt = null;
    flashEndsAt = null;
    activeFlashPriority = -1;
    return;
  }

  const elapsed = now - flashStartedAt;
  const holdEndsAt = GROWTH_DURATION_MS + flashHoldMs;
  const totalLifetimeMs = flashEndsAt - flashStartedAt;

  let growthScale: number;
  let rotation: number;
  let alpha: number;
  if (elapsed < GROWTH_DURATION_MS) {
    // grows in from nothing (overshooting past full size before settling to it)
    // while rotating in from START_ROTATION_DEG down to upright. Rotation uses
    // its own ease-out curve (decelerating into upright) instead of a constant
    // angular speed — a linear rotation moving at a fixed rate and then
    // instantly halting at 0 the moment growth ends read as an abrupt "flip"
    // rather than a smooth settle
    const g = elapsed / GROWTH_DURATION_MS;
    growthScale =
      1 + BACK_C3 * Math.pow(g - 1, 3) + BACK_C1 * Math.pow(g - 1, 2);
    const rotProgress = 1 - Math.pow(1 - g, 3);
    rotation = START_ROTATION_DEG * (Math.PI / 180) * (1 - rotProgress);
    alpha = 1;
  } else if (elapsed < holdEndsAt) {
    // sticks at full size/opacity (optionally strobing) — the phase a "sticky"
    // tier (ultra) uses to stay noticeable well past the initial pop-in, before
    // the regular fade-out below ever begins
    growthScale = 1;
    rotation = 0;
    alpha = 1;
    if (flashBlinkHz > 0) {
      const tHold = (elapsed - GROWTH_DURATION_MS) / 1000;
      const isOn = Math.floor(tHold * flashBlinkHz * 2) % 2 === 0;
      if (!isOn) alpha = 0.15;
    }
  } else {
    // holds at full size, upright, while fading out over the remainder of the lifetime
    growthScale = 1;
    rotation = 0;
    alpha = 1 - (elapsed - holdEndsAt) / (totalLifetimeMs - holdEndsAt);
  }

  // extra-bold weight + a thick outline is what reads as "fat"/chunky at this
  // size, more than font-size alone (900 is already the heaviest weight
  // Fredoka ships)
  const font = '900 100px "Fredoka", system-ui, sans-serif';
  ctx.font = font;
  // "full size" (growthScale === 1) is defined as covering 80% of the
  // viewport's width, not a fixed font-size — measure once at the reference
  // 100px size and scale up/down from there so this holds regardless of
  // screen size
  const measuredWidth = ctx.measureText(flashLabel).width;
  const targetScale = (viewportWidth * 0.8) / measuredWidth;
  const scale = growthScale * targetScale;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    flashLabel,
    0,
    0,
    flashColor,
    COLOR.white,
    flashStrokeWidth,
  );
  ctx.restore();
}
