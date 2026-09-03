import { COLOR } from "../../palette";
import { drawCartoonText, shadeColor } from "../../utils";
import { smoothstep } from "../easing";

// generic "big text pops onto the screen, twirling in" effect — the same
// spin+scale entrance the idle "You have earned" overlay uses (style.css's
// earned-overlay-spin-in keyframes), replicated here in plain canvas draw
// calls for any in-game celebratory announcement that can't use a DOM/CSS
// animation (drawn directly on the game canvas, not an overlay div). Rendering
// style (bloom glow, light-to-color gradient fill, viewport-width-fit sizing)
// intentionally matches screenShake's own ultra-crit "x125" flash text — only
// the entrance animation differs (twirl-in here vs. that flash's back-ease
// grow+rotate).

const INTRO_MS = 700;
const HOLD_MS = 1500; // how long it blinks after settling, before fading out
const FADE_MS = 300;
const BLINK_HZ = 6;
// blink starts a little before the twirl-in officially finishes, so it feels
// like it kicks in right as the text is settling rather than only afterward
const BLINK_START_MS = INTRO_MS - 500 + 100;
// base size measured at, then scaled up/down so the text always fills this
// fraction of the viewport's width — same convention as drawCritFlash
const REFERENCE_FONT_SIZE = 100;
const TARGET_WIDTH_FRACTION = 0.8;
// matches the mega ("25x") crit flash's own stroke width (see
// floorInteractions/critCelebration.ts) — shared "look" convention any caller
// of triggerTwirlText inherits, not just the Shopping spree announcement
const STROKE_WIDTH = 14;
const LINE_HEIGHT = REFERENCE_FONT_SIZE * 1.05;

let lines: string[] = [];
let color: string = COLOR.white;
let startedAt: number | null = null;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// same 3-stop rotate+scale curve as the CSS keyframes: spins in from nothing
// over 1.5 turns, overshoots, settles. Each segment eases via smoothstep
// (matching the CSS animation's own cubic-bezier easing WITHIN each pair of
// keyframe stops, not a flat linear interpolation between them — a plain
// lerp reads noticeably stiffer/lacks the CSS version's own settle-in warp).
// Exported since any caller wanting just the intro curve for its OWN
// longer-lived element (e.g. purchaseMeter's own persistent banner, which
// keeps wiggling long after this module's one-shot text would have already
// faded) can reuse the exact same math
export function twirlIntroTransform(t: number): {
  scale: number;
  rotateDeg: number;
} {
  if (t >= 1) return { scale: 1, rotateDeg: 0 };
  if (t < 0.55) {
    const localT = smoothstep(t / 0.55);
    return { scale: lerp(0, 1.15, localT), rotateDeg: lerp(-540, 8, localT) };
  }
  if (t < 0.8) {
    const localT = smoothstep((t - 0.55) / 0.25);
    return {
      scale: lerp(1.15, 0.94, localT),
      rotateDeg: lerp(8, -4, localT),
    };
  }
  const localT = smoothstep((t - 0.8) / 0.2);
  return { scale: lerp(0.94, 1, localT), rotateDeg: lerp(-4, 0, localT) };
}

// triggers a new twirl-in; text can be a single string or multiple stacked
// lines. onTrigger (e.g. a sound-effect play call) fires once, right when the
// twirl starts. A later call while one is still showing just replaces it
// outright (no queueing) — there's only ever one of these on screen.
export function triggerTwirlText(
  newText: string | string[],
  newColor: string,
  onTrigger?: () => void,
): void {
  lines = Array.isArray(newText) ? newText : [newText];
  color = newColor;
  startedAt = Date.now();
  onTrigger?.();
}

// call once per frame from gameCanvas.ts's redraw(), same convention as
// screenShake's drawCritFlash. viewportWidth: the text scales up/down so its
// own measured width always fills TARGET_WIDTH_FRACTION of it, regardless of
// screen size
export function drawTwirlText(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  viewportWidth: number,
  now: number,
): void {
  if (startedAt === null) return;
  const elapsed = now - startedAt;
  const totalMs = INTRO_MS + HOLD_MS + FADE_MS;
  if (elapsed >= totalMs) {
    startedAt = null;
    return;
  }

  const introT = Math.min(1, elapsed / INTRO_MS);
  const { scale: introScale, rotateDeg } = twirlIntroTransform(introT);
  // blinks on/off from BLINK_START_MS through the end of the hold phase, same
  // on/off square-wave technique drawCritFlash's own blinkHz uses
  let alpha: number;
  if (elapsed < BLINK_START_MS) {
    alpha = 1;
  } else if (elapsed < INTRO_MS + HOLD_MS) {
    const tBlink = (elapsed - BLINK_START_MS) / 1000;
    const isOn = Math.floor(tBlink * BLINK_HZ * 2) % 2 === 0;
    alpha = isOn ? 1 : 0.15;
  } else {
    alpha = 1 - (elapsed - INTRO_MS - HOLD_MS) / FADE_MS;
  }

  const font = `900 ${REFERENCE_FONT_SIZE}px "Fredoka", system-ui, sans-serif`;
  ctx.font = font;
  // scales to fit the WIDEST line, so a short second line ("spree") doesn't
  // make the whole block bigger than it should be
  const widestLineWidth = Math.max(
    ...lines.map((line) => ctx.measureText(line).width),
  );
  const targetScale = (viewportWidth * TARGET_WIDTH_FRACTION) / widestLineWidth;
  const scale = introScale * targetScale;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(centerX, centerY);
  ctx.rotate((rotateDeg * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // each line's own Y offset, centered as one block — computed in the same
  // REFERENCE_FONT_SIZE-relative units the ctx.scale above already accounts
  // for, so line spacing stays proportional at any final on-screen size
  lines.forEach((line, i) => {
    const y = (i - (lines.length - 1) / 2) * LINE_HEIGHT;
    // bloom: a soft white glow behind the crisp text below — same double-pass
    // shadowBlur trick drawCritFlash uses, since shadowBlur alone reads faint
    // at this huge on-screen scale
    ctx.shadowColor = COLOR.white;
    ctx.shadowBlur = 45;
    ctx.fillStyle = COLOR.white;
    ctx.fillText(line, 0, y);
    ctx.fillText(line, 0, y);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    // light-to-color vertical gradient reads as glossy rather than a flat block
    const gradient = ctx.createLinearGradient(0, y - 60, 0, y + 60);
    gradient.addColorStop(0, shadeColor(color, 0.6));
    gradient.addColorStop(1, color);
    drawCartoonText(ctx, line, 0, y, gradient, COLOR.white, STROKE_WIDTH);
  });
  ctx.restore();
}
