// tiny shared trigger for a whole-canvas shake, used to give big/free actions (like
// a crit upgrade) a sense of physical weight. Decoupled from gameCanvas.ts's own
// render loop on purpose: floorInteractions.ts (deep under floors/) triggers this,
// gameCanvas.ts (under background/) reads it — going through a dedicated module
// avoids a floors->background or background->floors module-boundary violation.

import { drawCartoonText, shadeColor } from "../utils";
import { COLOR } from "../palette";
import { loadImageByName } from "../loadAssets";

// preloaded once at module load (well before a player can ever land a chain
// crit) — drawCritFlash below draws this behind the "Chain" flash text; null
// until the fetch/decode resolves, in which case that draw is just skipped
let chainIcon: HTMLImageElement | null = null;
loadImageByName("chain").then((image) => {
  chainIcon = image;
});

// same idea as chainIcon above, but drawn behind the "Boost" flash text (see
// upgradeButton.ts's isBoostCrit) — reuses the same free-boost critter icon
// hud/boostMenu.ts and mouse/index.ts already use for this exact mechanic
let boostIcon: HTMLImageElement | null = null;
loadImageByName("mouse").then((image) => {
  boostIcon = image;
});

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
// randomized per trigger (see startFlash) so repeated crits don't all rattle
// along the exact same fixed waveform/strength — a subtle bit of organic variance
let shakeMagnitudeScale = 1;
let shakePhaseX = 0;
let shakePhaseY = 0;

let flashStartedAt: number | null = null;
// absolute end timestamp, computed once at trigger time from GROWTH_DURATION_MS +
// flashHoldMs + the fade tail — lets triggerScreenShake and drawCritFlash both check
// "is a flash still playing" without re-deriving it from elapsed-time math
let flashEndsAt: number | null = null;
let flashLabel = "CRIT";
let flashColor: string = COLOR.purple;
let flashStrokeWidth = 8;
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

interface FlashRequest {
  intensity: number;
  label: string;
  color: string;
  strokeWidth: number;
  blinkHz: number;
  holdMs: number;
  priority: number;
}

// how long the grow-in (scale + rotate) phase takes, and the fade-out tail's base
// duration before any per-tier `intensity` scaling — declared up here (moved out of
// their original spot further down) since triggerScreenShake needs them to compute
// flashEndsAt
const GROWTH_DURATION_MS = 100;
const FLASH_DURATION_MS = 260;

// randomized once per trigger (see startFlash) instead of always entering from
// the exact same fixed angle — varies both the tilt amount and which way it
// leans, so consecutive crits don't all pop in identically
let flashEntryRotationDeg = -45;
// random phase offset for the settled-in wobble/breathing motion below (see
// drawCritFlash) — without this, two crits landing back to back would wobble
// in perfect lockstep with each other instead of reading as independent
let flashWobbleSeed = 0;

function startFlash(req: FlashRequest): void {
  const now = Date.now();
  shakeStartedAt = now;
  shakeIntensity = req.intensity;
  shakeMagnitudeScale = 0.85 + Math.random() * 0.3;
  shakePhaseX = Math.random() * Math.PI * 2;
  shakePhaseY = Math.random() * Math.PI * 2;

  flashStartedAt = now;
  flashLabel = req.label;
  flashColor = req.color;
  flashStrokeWidth = req.strokeWidth;
  flashBlinkHz = req.blinkHz;
  flashHoldMs = req.holdMs;
  activeFlashPriority = req.priority;
  flashEntryRotationDeg = (Math.random() < 0.5 ? -1 : 1) * (35 + Math.random() * 20);
  flashWobbleSeed = Math.random() * Math.PI * 2;
  const fadeDurationMs = FLASH_DURATION_MS * req.intensity - GROWTH_DURATION_MS;
  flashEndsAt = now + GROWTH_DURATION_MS + req.holdMs + fadeDurationMs;
}

export function triggerScreenShake(options?: {
  intensity?: number;
  label?: string;
  color?: string;
  strokeWidth?: number;
  blinkHz?: number;
  holdMs?: number;
  priority?: number;
}): void {
  const req: FlashRequest = {
    intensity: options?.intensity ?? 1,
    label: options?.label ?? "x5",
    color: options?.color ?? COLOR.purple,
    strokeWidth: options?.strokeWidth ?? 8,
    blinkHz: options?.blinkHz ?? 0,
    holdMs: options?.holdMs ?? 0,
    priority: options?.priority ?? 0,
  };
  const now = Date.now();
  const idle = flashEndsAt === null || now >= flashEndsAt;
  if (idle) {
    startFlash(req);
    return;
  }
  // a strictly bigger celebration still preempts whatever's currently playing
  // immediately (an ultra shouldn't wait behind a plain crit); anything else
  // (same/lower priority) is simply dropped instead of queued — a chain/boost
  // proc riding the very crit that's already flashing is folded into that same
  // flash by the caller instead of firing a second request (see
  // critCelebration.ts's triggerCritCelebration), so nothing here should ever
  // need a second turn; a genuinely separate, unrelated crit arriving mid-flash
  // is just skipped rather than making the player sit through a backlog
  if (req.priority > activeFlashPriority) {
    startFlash(req);
  }
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

// big flash text (flashLabel/flashColor, set by triggerScreenShake) that pops in
// oversized, optionally sticks/blinks for flashHoldMs, then settles/fades out.
// Tracks its own flashStartedAt/flashEndsAt (set by triggerScreenShake) rather than
// the shake's — a "sticky" tier's flash can outlive the shake's own short rattle by
// several seconds. Call from gameCanvas.ts's redraw() in plain screen space, after
// the shake translate has been undone, so the text itself doesn't rattle along with
// the world
// standard "ease out back" overshoot constants: grows past full size then settles
// to it, instead of just stopping dead at 1 — reads as a springy pop, not a static fade-in
const BACK_C1 = 1.70158;
const BACK_C3 = BACK_C1 + 1;
// once settled, a small continuous rotation/scale wobble (see flashWobbleSeed
// above) keeps the text feeling "alive" instead of a static held frame —
// subtle enough not to fight the deliberate blink/fade phases
const WOBBLE_ROTATION_DEG = 2.5;
const WOBBLE_SCALE_AMOUNT = 0.025;
const WOBBLE_HZ = 1.8;

// read-only check for a caller whose own redraw loop is normally throttled (see
// cityMap/index.ts's tick()) and needs to know to run at full frame rate for as
// long as the flash is still playing, without triggering drawCritFlash's own
// side effect of clearing the state once expired
export function isCritFlashActive(now: number): boolean {
  return flashEndsAt !== null && now < flashEndsAt;
}

// caches the expensive blurred bloom glow (see drawCritFlash) per distinct
// label — mobile browsers pay for shadowBlur as a real offscreen convolution,
// so recomputing it every animation frame at this text's huge on-screen scale
// was the actual source of the reported crit-celebration frame drops.
// Rendered once at the reference 100px font size (unscaled/unrotated); the
// caller draws the cached bitmap through its own transform, so it still
// scales/rotates correctly every frame without redoing the blur itself
const bloomLayerCache = new Map<
  string,
  { canvas: HTMLCanvasElement; width: number; height: number }
>();
const BLOOM_FONT = '900 100px "Fredoka", system-ui, sans-serif';
const BLOOM_BLUR = 45;
// generous padding so the blur's own soft falloff never gets clipped by the
// cache canvas's own edge
const BLOOM_PADDING = BLOOM_BLUR * 3;

function getBloomLayer(
  label: string,
  measuredWidth: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const cached = bloomLayerCache.get(label);
  if (cached) return cached;

  const width = Math.ceil(measuredWidth + BLOOM_PADDING * 2);
  const height = Math.ceil(100 + BLOOM_PADDING * 2);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.font = BLOOM_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // stacked twice for intensity — canvas shadowBlur alone reads faint at this
  // text's huge on-screen scale
  ctx.shadowColor = COLOR.white;
  ctx.shadowBlur = BLOOM_BLUR;
  ctx.fillStyle = COLOR.white;
  ctx.fillText(label, width / 2, height / 2);
  ctx.fillText(label, width / 2, height / 2);

  const entry = { canvas, width, height };
  bloomLayerCache.set(label, entry);
  return entry;
}

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
    // while rotating in from flashEntryRotationDeg (randomized per trigger, see
    // startFlash) down to upright. Rotation uses its own ease-out curve
    // (decelerating into upright) instead of a constant angular speed — a
    // linear rotation moving at a fixed rate and then instantly halting at 0
    // the moment growth ends read as an abrupt "flip" rather than a smooth settle
    const g = elapsed / GROWTH_DURATION_MS;
    growthScale =
      1 + BACK_C3 * Math.pow(g - 1, 3) + BACK_C1 * Math.pow(g - 1, 2);
    const rotProgress = 1 - Math.pow(1 - g, 3);
    rotation = flashEntryRotationDeg * (Math.PI / 180) * (1 - rotProgress);
    alpha = 1;
  } else if (elapsed < holdEndsAt) {
    // sticks at full size/opacity (optionally strobing) — the phase a "sticky"
    // tier (ultra) uses to stay noticeable well past the initial pop-in, before
    // the regular fade-out below ever begins. Every blink cycle here is a
    // plain, undistorted on/off toggle — callers passing blinkHz must choose
    // holdMs so the pattern naturally lands "on" right as holdEndsAt arrives
    // (see critCelebration.ts's own comment on why its holdMs is exactly what
    // it is), rather than this function warping the blink's own timing to
    // compensate for an arbitrary holdMs. A small wobble rides on top of the
    // held size/rotation the whole time (see WOBBLE_* above) so it never reads
    // as a flat, static frame even while blinking
    const wobbleT = (elapsed - GROWTH_DURATION_MS) / 1000;
    const wobble = Math.sin(wobbleT * WOBBLE_HZ * Math.PI * 2 + flashWobbleSeed);
    growthScale = 1 + wobble * WOBBLE_SCALE_AMOUNT;
    rotation = wobble * WOBBLE_ROTATION_DEG * (Math.PI / 180);
    alpha = 1;
    if (flashBlinkHz > 0) {
      const tHold = (elapsed - GROWTH_DURATION_MS) / 1000;
      const isOn = Math.floor(tHold * flashBlinkHz * 2) % 2 === 0;
      if (!isOn) alpha = 0.15;
    }
  } else {
    // holds at full size, upright, while fading out over the remainder of the
    // lifetime — the same settle wobble keeps riding along, fading out with it
    // rather than snapping to a dead-still pose the instant the hold ends
    const wobbleT = (elapsed - GROWTH_DURATION_MS) / 1000;
    const wobble = Math.sin(wobbleT * WOBBLE_HZ * Math.PI * 2 + flashWobbleSeed);
    growthScale = 1 + wobble * WOBBLE_SCALE_AMOUNT;
    rotation = wobble * WOBBLE_ROTATION_DEG * (Math.PI / 180);
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
  // chain crit's own backdrop icon, drawn behind everything else — same
  // translate/scale/alpha as the text itself (so it pops in/fades together
  // with it), but rotated an extra fixed 45deg of its own on top of the
  // text's animated entrance rotation, scoped to its own save/restore so
  // that extra spin doesn't also rotate the bloom/text drawn after it
  if (flashLabel === "Chain" && chainIcon) {
    const iconW = measuredWidth * 1.4 * 0.75;
    const iconH = iconW * (chainIcon.height / chainIcon.width);
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.drawImage(chainIcon, -iconW / 2, -iconH / 2, iconW, iconH);
    ctx.restore();
  }
  if (flashLabel === "Boost" && boostIcon) {
    // no extra rotation (unlike chainIcon above) — mouse.png is a directional
    // side-view sprite, not a symmetric icon, so spinning it 45deg makes it
    // read as facing the wrong way instead of its normal running pose
    const iconW = measuredWidth * 1.4 * 0.75;
    const iconH = iconW * (boostIcon.height / boostIcon.width);
    ctx.drawImage(boostIcon, -iconW / 2, -iconH / 2, iconW, iconH);
  }
  // bloom: a soft white glow behind the crisp text below. shadowBlur is
  // expensive at this text's huge on-screen scale (it's a full offscreen
  // blur convolution) — recomputing it via fillText every single animation
  // frame is what caused visible frame drops on mobile during crit
  // celebrations. getBloomLayer below renders this exact glow ONCE per
  // distinct label (cached), so every frame after the first is just a plain
  // drawImage of that cached bitmap instead of a fresh blur
  const bloom = getBloomLayer(flashLabel, measuredWidth);
  ctx.drawImage(bloom.canvas, -bloom.width / 2, -bloom.height / 2);
  // a light-to-tier-color vertical gradient reads as glossy/shiny rather than a
  // flat block of color — same lightening math drawGlossyButton's own sheen uses
  const gradient = ctx.createLinearGradient(0, -60, 0, 60);
  gradient.addColorStop(0, shadeColor(flashColor, 0.6));
  gradient.addColorStop(1, flashColor);
  drawCartoonText(
    ctx,
    flashLabel,
    0,
    0,
    gradient,
    COLOR.white,
    flashStrokeWidth,
  );
  ctx.restore();
}
