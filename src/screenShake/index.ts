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

export function triggerScreenShake(): void {
  shakeStartedAt = Date.now();
}

// call once per frame from gameCanvas.ts's redraw(), before its own dpr/scale
// transforms are applied, so the magnitude is a consistent CSS-pixel amount
// regardless of the world's current zoom/scale
export function getScreenShakeOffset(now: number): { x: number; y: number } {
  if (shakeStartedAt === null) return { x: 0, y: 0 };
  const elapsed = now - shakeStartedAt;
  if (elapsed >= SHAKE_DURATION_MS) {
    shakeStartedAt = null;
    return { x: 0, y: 0 };
  }
  const t = elapsed / 1000;
  const magnitude = SHAKE_MAGNITUDE_PX * Math.exp(-SHAKE_DECAY_RATE * t);
  // two different frequencies so x/y don't move in lockstep (reads as a rattle,
  // not a single diagonal bounce)
  return {
    x: Math.sin(t * 70) * magnitude,
    y: Math.cos(t * 53) * magnitude,
  };
}

// big "CRIT!" text that pops in oversized and settles/fades out. Reads
// shakeStartedAt directly (rather than taking a param) so it can never drift out
// of sync with the shake it's celebrating, but keeps its own FLASH_DURATION_MS
// lifetime independent of the (now much longer) shake tail above — the text
// shouldn't linger just because the shake's rattle tail runs long. Call from
// gameCanvas.ts's redraw() in plain screen space, after the shake translate has
// been undone, so the text itself doesn't rattle along with the world
const FLASH_DURATION_MS = 260;
const GROWTH_DURATION_MS = 100; // how long the grow-in (scale + rotate) phase takes
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
  if (shakeStartedAt !== null) {
    const elapsed = now - shakeStartedAt;
    if (elapsed < FLASH_DURATION_MS) {
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
      } else {
        // holds at full size, upright, while fading out over the remainder of the lifetime
        growthScale = 1;
        rotation = 0;
        alpha =
          1 -
          (elapsed - GROWTH_DURATION_MS) /
            (FLASH_DURATION_MS - GROWTH_DURATION_MS);
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
      const measuredWidth = ctx.measureText("CRIT!").width;
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
      drawCartoonText(ctx, "CRIT!", 0, 0, COLOR.purple, COLOR.white, 16);
      ctx.restore();
    }
  }
}
