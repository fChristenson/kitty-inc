// tiny shared trigger for a whole-canvas shake, used to give big/free actions (like
// a crit upgrade) a sense of physical weight. Decoupled from gameCanvas.ts's own
// render loop on purpose: floorInteractions.ts (deep under floors/) triggers this,
// gameCanvas.ts (under background/) reads it — going through a dedicated module
// avoids a floors->background or background->floors module-boundary violation.

import { COLOR } from "../palette";
import { loadImageByName, type ImageName } from "../loadAssets";
import {
  CRIT_PROC_INFO,
  CRIT_PROC_KINDS,
  onCritProcsArmed,
  type CritProcKind,
} from "../shared/critTypes";
import { drawCritText } from "../shared/critText";
import { runWhenIdle } from "../shared/idle";
import { drawGoldShimmer } from "../shared/goldShimmer";

// a handful of icons are explicitly designed to spin an extra fixed amount on
// top of the flash text's own animated entrance rotation (see drawFlashLayer).
// Every other icon is either already-upright/symmetric or a directional sprite
// (e.g. mouse.png's running pose) that would read as broken if spun
const CRIT_ICON_EXTRA_ROTATION: Partial<Record<CritProcKind, number>> = {
  chain: 45,
  silverTicket: 45,
};

// every crit-type's own backdrop icon, drawn behind drawFlashLayer's flash
// text below, keyed by that flash's own label. Derived from critTypes'
// canonical CRIT_PROC_INFO rather than hand-listed here — a third copy of the
// label -> icon mapping is exactly how Bull Market ended up flashing with no
// icon at all
const CRIT_ICON_BY_LABEL: Partial<
  Record<string, { name: ImageName; rotateDeg?: number }>
> = Object.fromEntries(
  CRIT_PROC_KINDS.map((kind) => [
    CRIT_PROC_INFO[kind].label,
    {
      name: CRIT_PROC_INFO[kind].icon,
      rotateDeg: CRIT_ICON_EXTRA_ROTATION[kind],
    },
  ]),
);

// the Sale boost's own flash isn't a piggyback proc, so it isn't in
// CRIT_PROC_INFO and still needs its own entry
CRIT_ICON_BY_LABEL["Sales"] = { name: "cashRegister" };

const loadedCritIcons = new Map<ImageName, HTMLImageElement>();
const requestedCritIcons = new Set<ImageName>();
const critIconPromises = new Map<ImageName, Promise<HTMLImageElement>>();

function requestCritIcon(name: ImageName): Promise<HTMLImageElement> {
  const pending = critIconPromises.get(name);
  if (pending) return pending;
  const promise = loadImageByName(name).then(async (image) => {
    // decode off the draw path, so a celebration's first frame never stalls on it
    await image.decode().catch(() => undefined);
    loadedCritIcons.set(name, image);
    return image;
  });
  critIconPromises.set(name, promise);
  requestedCritIcons.add(name);
  return promise;
}

// Loading all ~1400 celebration icons up front stalled the first seconds of
// play, so each icon warms when its proc is armed, well before it can flash;
// getCritIcon still loads any icon on demand.
onCritProcsArmed((kinds) => {
  for (const kind of kinds)
    void requestCritIcon(CRIT_PROC_INFO[kind].icon).catch(() => undefined);
});
runWhenIdle(
  () => void requestCritIcon("cashRegister").catch(() => undefined),
  4000,
);

function getCritIcon(name: ImageName): HTMLImageElement | null {
  const cached = loadedCritIcons.get(name);
  if (cached) return cached;
  if (!requestedCritIcons.has(name)) requestCritIcon(name);
  return null;
}
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

// a second, fully STATIC flash layer drawn BEHIND the normal animated one —
// null means nothing frozen. Set only by freezeCritFlashAsBackground below
// (see critCelebration.ts's "special crit crit" stacking): once the foreground
// proc's own flash finishes its hold phase, it's captured here (frozen at full
// size/opacity, no further growth/wobble/fade) so the bonus tier's own flash
// can animate on top of it, and both are cleared together once THAT flash ends
let bgFlashLabel: string | null = null;
let bgFlashColor: string = COLOR.purple;
let bgFlashStrokeWidth = 8;
// it keeps wobbling on its own flash's timing, so it never sits frozen
let bgFlashStartedAt = 0;

interface FlashRequest {
  intensity: number;
  label: string;
  color: string;
  strokeWidth: number;
  blinkHz: number;
  holdMs: number;
  priority: number;
  // the flash stays up at least this long (its hold stretches to fit)
  minDurationMs: number;
}

// how long the grow-in (scale + rotate) phase takes, and the fade-out tail's base
// duration before any per-tier `intensity` scaling — declared up here (moved out of
// their original spot further down) since triggerScreenShake needs them to compute
// flashEndsAt
const GROWTH_DURATION_MS = 100;
const FLASH_DURATION_MS = 260;

// how far the reveal spins in from; always from the left, turning right
const FLASH_SPIN_DEG = -220;

function startFlash(req: FlashRequest): void {
  const now = Date.now();
  const fadeDurationMs = FLASH_DURATION_MS * req.intensity - GROWTH_DURATION_MS;
  const holdMs = Math.max(
    req.holdMs + iconExtraHoldMs(req),
    req.minDurationMs - GROWTH_DURATION_MS - fadeDurationMs,
  );
  flashStartedAt = now;
  flashLabel = req.label;
  flashColor = req.color;
  flashStrokeWidth = req.strokeWidth;
  flashBlinkHz = req.blinkHz;
  flashHoldMs = holdMs;
  activeFlashPriority = req.priority;
  flashEndsAt = now + GROWTH_DURATION_MS + holdMs + fadeDurationMs;
}

// a special crit's image stays up this much longer before fading
const ICON_EXTRA_HOLD_MS = 300;

function iconExtraHoldMs(req: FlashRequest): number {
  if (!CRIT_ICON_BY_LABEL[req.label]) return 0;
  if (req.blinkHz <= 0) return ICON_EXTRA_HOLD_MS;
  // whole blink cycles, so a strobing hold still ends "on"
  const cycleMs = 1000 / req.blinkHz;
  return Math.max(1, Math.round(ICON_EXTRA_HOLD_MS / cycleMs)) * cycleMs;
}

// every crit hits right away, even one whose flash gets dropped, adding onto
// whatever is left of a still-running shake
function kickShake(intensity: number, now: number): void {
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

export function triggerScreenShake(options?: {
  intensity?: number;
  label?: string;
  color?: string;
  strokeWidth?: number;
  blinkHz?: number;
  holdMs?: number;
  priority?: number;
  minDurationMs?: number;
}): void {
  const req: FlashRequest = {
    intensity: options?.intensity ?? 1,
    label: options?.label ?? "x5",
    color: options?.color ?? COLOR.purple,
    strokeWidth: options?.strokeWidth ?? 8,
    blinkHz: options?.blinkHz ?? 0,
    holdMs: options?.holdMs ?? 0,
    priority: options?.priority ?? 0,
    minDurationMs: options?.minDurationMs ?? 0,
  };
  const now = Date.now();
  kickShake(req.intensity, now);
  const idle = flashEndsAt === null || now >= flashEndsAt;
  const shouldStart = idle || req.priority > activeFlashPriority;
  if (shouldStart) {
    const iconName = CRIT_ICON_BY_LABEL[req.label]?.name;
    const ready = iconName ? requestCritIcon(iconName) : Promise.resolve();
    // the label's blurred glow is costly to build; do it before the flash
    // starts, not on its first animated frame
    if (req.label) {
      warmCritFlashBlooms([req.label]);
      warmTextLayer(req.label, req.color, req.strokeWidth);
    }
    ready
      .then(() => {
        const currentNow = Date.now();
        const stillIdle = flashEndsAt === null || currentNow >= flashEndsAt;
        if (stillIdle || req.priority > activeFlashPriority) startFlash(req);
      })
      .catch(() => {
        const currentNow = Date.now();
        const stillIdle = flashEndsAt === null || currentNow >= flashEndsAt;
        if (stillIdle || req.priority > activeFlashPriority) startFlash(req);
      });
    return;
  }
  // a strictly bigger celebration still preempts whatever's currently playing
  // as soon as its icon is ready (an ultra shouldn't wait behind a plain crit);
  // anything else
  // (same/lower priority) is simply dropped instead of queued — a chain/boost
  // proc riding the very crit that's already flashing is folded into that same
  // flash by the caller instead of firing a second request (see
  // critCelebration.ts's triggerCritCelebration), so nothing here should ever
  // need a second turn; a genuinely separate, unrelated crit arriving mid-flash
  // is just skipped rather than making the player sit through a backlog
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
// once settled, a small continuous rotation/scale wobble keeps the text
// feeling "alive" instead of a static held frame —
// subtle enough not to fight the deliberate blink/fade phases
const WOBBLE_ROTATION_DEG = 1.25;
const WOBBLE_SCALE_AMOUNT = 0.025;
const WOBBLE_HZ = 1.8;
// the reveal: grows up from nothing while spinning in and lands at full size
// on the wobble's max-right angle, right on the explosion sfx, so the wobble
// takes over with a full swing left. Plays over the start of the timeline
// without shifting any timing (holds, blinks)
const ENTRY_LAND_MS = 50;

function entryPose(p: number): {
  scale: number;
  rotation: number;
  alpha: number;
} {
  // grows faster into the landing so it hits; the spin slows to a stop on
  // the wobble's turnaround so the two join without a jolt
  const turn = 1 - (1 - p) ** 2;
  return {
    scale: p * p,
    rotation: ((FLASH_SPIN_DEG * Math.PI) / 180) * (1 - turn),
    alpha: Math.min(1, p * 3),
  };
}
// radians/sec the reward shimmer behind a special crit's image turns
const CRIT_SHIMMER_SPIN = 1.2;

// the small steady wobble every flash layer rides, elapsedMs into its flash;
// at its max-right angle as the reveal lands, so it swings left from there
function wobblePose(elapsedMs: number): { scale: number; rotation: number } {
  const t = (elapsedMs - ENTRY_LAND_MS) / 1000;
  const wobble = Math.cos(t * WOBBLE_HZ * Math.PI * 2);
  return {
    scale: 1 + wobble * WOBBLE_SCALE_AMOUNT,
    rotation: wobble * WOBBLE_ROTATION_DEG * (Math.PI / 180),
  };
}

// read-only check for a caller whose own redraw loop is normally throttled (see
// cityMap/index.ts's tick()) and needs to know to run at full frame rate for as
// long as the flash is still playing, without triggering drawCritFlash's own
// side effect of clearing the state once expired
export function isCritFlashActive(now: number): boolean {
  return flashEndsAt !== null && now < flashEndsAt;
}

// absolute timestamp the CURRENT foreground flash's hold phase ends (right
// before its fade would normally begin), or null if nothing is playing — see
// critCelebration.ts's "special crit crit" stacking, which needs to know
// exactly when to freeze a proc's own celebration as a background layer
// without hardcoding/duplicating whatever holdMs it happened to be triggered
// with
export function getFlashHoldEndsAt(): number | null {
  return flashStartedAt !== null
    ? flashStartedAt + GROWTH_DURATION_MS + flashHoldMs
    : null;
}

// captures whatever's CURRENTLY playing as the foreground flash (label/color/
// stroke width) into the separate static background layer above, then clears
// the foreground's own timing so it stops animating/fading — the very next
// triggerScreenShake call (see critCelebration.ts's stacked bonus-tier
// celebration, called right after this) becomes the new foreground flash,
// drawn on top of this now-frozen backdrop
export function freezeCritFlashAsBackground(): void {
  if (flashStartedAt === null) return;
  bgFlashLabel = flashLabel;
  bgFlashColor = flashColor;
  bgFlashStrokeWidth = flashStrokeWidth;
  bgFlashStartedAt = flashStartedAt;
  flashStartedAt = null;
  flashEndsAt = null;
  activeFlashPriority = -1;
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
  const cached = touchCached(bloomLayerCache, label);
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
  storeCached(bloomLayerCache, label, entry);
  return entry;
}

// one scratch context for measuring, so warming never allocates a canvas
let scratchCtx: CanvasRenderingContext2D | null = null;
function getScratchCtx(): CanvasRenderingContext2D {
  scratchCtx ??= document.createElement("canvas").getContext("2d")!;
  return scratchCtx;
}

// builds the blurred bloom for labels that flash often (the crit tiers) ahead
// of time, so their first celebration doesn't pay for the blur mid-animation
export function warmCritFlashBlooms(labels: string[]): void {
  const ctx = getScratchCtx();
  for (const label of labels) getBloomLayer(label, measureLabel(ctx, label));
}

// ~900 distinct labels exist; unbounded per-label canvases grew memory for the
// whole session, so both flash caches keep only the most recently shown ones
const FLASH_CACHE_LIMIT = 24;

function touchCached<T>(cache: Map<string, T>, key: string): T | undefined {
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
}

function storeCached<T>(cache: Map<string, T>, key: string, value: T): void {
  cache.set(key, value);
  if (cache.size > FLASH_CACHE_LIMIT) {
    cache.delete(cache.keys().next().value as string);
  }
}

const FLASH_FONT_SIZE = 100;
const FLASH_FONT = `900 ${FLASH_FONT_SIZE}px "Fredoka", system-ui, sans-serif`;
const labelWidths = new Map<string, number>();

function measureLabel(ctx: CanvasRenderingContext2D, label: string): number {
  let width = labelWidths.get(label);
  if (width === undefined) {
    ctx.font = FLASH_FONT;
    width = ctx.measureText(label).width;
    labelWidths.set(label, width);
  }
  return width;
}

// The outlined gradient label, rasterized once at roughly its on-screen pixel
// density. Re-stroking huge vector text every frame (twice while a frozen
// background layer shows) was the main per-frame cost of a celebration.
const textLayerCache = new Map<
  string,
  { canvas: HTMLCanvasElement; width: number; height: number }
>();
const MAX_TEXT_LAYER_PX = 4096;

function getTextLayer(
  label: string,
  color: string,
  strokeWidth: number,
  measuredWidth: number,
  deviceScale: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const pad = strokeWidth + 8;
  const width = measuredWidth + pad * 2;
  const height = FLASH_FONT_SIZE * 1.6 + pad * 2;
  // headroom for the grow-in overshoot and wobble; quantized so the animation
  // reuses one bitmap instead of re-rasterizing as its scale changes
  const resolution = Math.min(
    Math.max(0.5, Math.ceil(deviceScale * 1.2 * 2) / 2),
    MAX_TEXT_LAYER_PX / Math.max(width, height),
  );
  const key = `${label}|${color}|${strokeWidth}|${resolution}`;
  const cached = touchCached(textLayerCache, key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * resolution);
  canvas.height = Math.ceil(height * resolution);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(resolution, resolution);
  drawCritText(ctx, label, width / 2, height / 2, color, {
    fontSize: FLASH_FONT_SIZE,
    strokeWidth,
  });
  const entry = { canvas, width, height };
  storeCached(textLayerCache, key, entry);
  return entry;
}

// fits an icon's own bounding box to a common on-screen "footprint", matched
// by AREA (targetSize = the side of an equal-area square) rather than by one
// dimension — chain.png (short/wide), mouse.png (a tall running sprite), and
// ball.png (near-square) all have very different aspect ratios, so fixing
// just their width (the original approach) left the short/wide one reading
// much smaller than the taller ones at the identical width
function fitIconSize(
  icon: HTMLImageElement,
  targetSize: number,
): { w: number; h: number } {
  const scale = targetSize / Math.sqrt(icon.width * icon.height);
  return { w: icon.width * scale, h: icon.height * scale };
}

// full size covers 80% of the viewport's width
function flashLayerScales(
  ctx: CanvasRenderingContext2D,
  label: string,
  viewportWidth: number,
  drawScale: number,
): { targetScale: number; textScale: number; deviceScale: number } {
  const measuredWidth = measureLabel(ctx, label);
  const targetScale = (viewportWidth * 0.8) / measuredWidth;
  const textScale =
    label === "Skip" ? measuredWidth / measureLabel(ctx, "Heavenly") : 1;
  return {
    targetScale,
    textScale,
    deviceScale: drawScale * targetScale * textScale,
  };
}

// the last frame's draw scale, so a new label's text bitmap can be built
// before its flash starts instead of stalling the reveal's first frame
let lastDrawScale = 1;
let lastViewportWidth = 0;

function warmTextLayer(
  label: string,
  color: string,
  strokeWidth: number,
): void {
  if (lastViewportWidth <= 0) return;
  const ctx = getScratchCtx();
  const { deviceScale } = flashLayerScales(
    ctx,
    label,
    lastViewportWidth,
    lastDrawScale,
  );
  getTextLayer(
    label,
    color,
    strokeWidth,
    measureLabel(ctx, label),
    deviceScale,
  );
}

export function drawCritFlash(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  viewportWidth: number,
  now: number,
): void {
  const base = ctx.getTransform();
  lastDrawScale = Math.hypot(base.a, base.b);
  lastViewportWidth = viewportWidth;
  if (bgFlashLabel !== null) {
    const wobble = wobblePose(now - bgFlashStartedAt);
    drawFlashLayer(
      ctx,
      centerX,
      centerY,
      viewportWidth,
      bgFlashLabel,
      bgFlashColor,
      bgFlashStrokeWidth,
      1,
      wobble.scale,
      wobble.rotation,
    );
  }
  if (flashStartedAt === null || flashEndsAt === null) {
    // no foreground flash left to eventually clear it — never leave an
    // orphaned frozen background on screen forever
    bgFlashLabel = null;
    return;
  }
  if (now >= flashEndsAt) {
    flashStartedAt = null;
    flashEndsAt = null;
    activeFlashPriority = -1;
    bgFlashLabel = null;
    return;
  }

  const elapsed = now - flashStartedAt;
  const holdEndsAt = GROWTH_DURATION_MS + flashHoldMs;
  const totalLifetimeMs = flashEndsAt - flashStartedAt;

  // the same small steady wobble rides every phase
  const wobble = wobblePose(elapsed);
  let growthScale = wobble.scale;
  let rotation = wobble.rotation;
  let alpha = 1;
  if (elapsed >= GROWTH_DURATION_MS && elapsed < holdEndsAt) {
    // sticks at full size/opacity (optionally strobing) — the phase a "sticky"
    // tier (ultra) uses to stay noticeable well past the initial pop-in. Every
    // blink cycle is a plain on/off toggle — callers passing blinkHz choose
    // holdMs so the pattern lands "on" right as holdEndsAt arrives (see
    // critCelebration.ts), rather than this warping the blink's own timing
    if (flashBlinkHz > 0) {
      const tHold = (elapsed - GROWTH_DURATION_MS) / 1000;
      const isOn = Math.floor(tHold * flashBlinkHz * 2) % 2 === 0;
      if (!isOn) alpha = 0.15;
    }
  } else if (elapsed >= holdEndsAt) {
    alpha = 1 - (elapsed - holdEndsAt) / (totalLifetimeMs - holdEndsAt);
  }

  // the reveal plays over the start of the timeline without moving it, so
  // holds, blinks and their sound sync stay exactly where they were
  if (elapsed < ENTRY_LAND_MS) {
    const entry = entryPose(elapsed / ENTRY_LAND_MS);
    growthScale *= entry.scale;
    rotation += entry.rotation;
    // the blink keeps its own beat under the reveal (x125's tones follow it)
    alpha *= entry.alpha;
  }

  drawFlashLayer(
    ctx,
    centerX,
    centerY,
    viewportWidth,
    flashLabel,
    flashColor,
    flashStrokeWidth,
    alpha,
    growthScale,
    rotation,
  );
}

// draws one flash "layer" — icon + bloom + glossy gradient text + outline —
// at a given alpha/scale/rotation. Shared by drawCritFlash's own animated
// foreground flash AND its static, frozen background layer (see
// freezeCritFlashAsBackground) so neither has to duplicate this whole
// per-proc icon lookup + bloom + text-drawing block
function drawFlashLayer(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  viewportWidth: number,
  label: string,
  color: string,
  strokeWidth: number,
  alpha: number,
  growthScale: number,
  rotation: number,
): void {
  // an empty label is a shake with no text at all
  if (!label) return;
  const measuredWidth = measureLabel(ctx, label);
  const { targetScale, textScale, deviceScale } = flashLayerScales(
    ctx,
    label,
    viewportWidth,
    lastDrawScale,
  );
  const scale = growthScale * targetScale;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(centerX, centerY);
  const critIconConfig = CRIT_ICON_BY_LABEL[label];
  const critIcon = critIconConfig ? getCritIcon(critIconConfig.name) : null;
  const iconSize = critIcon
    ? fitIconSize(critIcon, measuredWidth * 0.85)
    : null;
  if (iconSize) {
    // outside the text's wobble so the rays turn steadily; only the grow-in
    // (never its overshoot or wobble) sizes it
    drawGoldShimmer(
      ctx,
      0,
      0,
      Math.max(iconSize.w, iconSize.h) *
        0.75 *
        targetScale *
        Math.min(1, growthScale),
      1,
      CRIT_SHIMMER_SPIN,
      performance.now(),
    );
  }
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  // per-crit backdrop icon, drawn behind everything else — same
  // translate/scale/alpha as the text itself (so it pops in/fades together
  // with it). A couple of icons (see CRIT_ICON_BY_LABEL's rotateDeg) also
  // spin an extra fixed amount of their own on top of the text's animated
  // entrance rotation, scoped to their own save/restore so that extra spin
  // doesn't also rotate the bloom/text drawn after it.
  if (critIcon && iconSize) {
    const { w: iconW, h: iconH } = iconSize;
    // icons are at most 250x250 but drawn several times larger on phones
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (critIconConfig?.rotateDeg) {
      ctx.save();
      ctx.rotate((critIconConfig.rotateDeg * Math.PI) / 180);
      ctx.drawImage(critIcon, -iconW / 2, -iconH / 2, iconW, iconH);
      ctx.restore();
    } else {
      ctx.drawImage(critIcon, -iconW / 2, -iconH / 2, iconW, iconH);
    }
  }
  // bloom: a soft white glow behind the crisp text below. shadowBlur is
  // expensive at this text's huge on-screen scale (it's a full offscreen
  // blur convolution) — recomputing it via fillText every single animation
  // frame is what caused visible frame drops on mobile during crit
  // celebrations. getBloomLayer below renders this exact glow ONCE per
  // distinct label (cached), so every frame after the first is just a plain
  // drawImage of that cached bitmap instead of a fresh blur
  ctx.save();
  // centered 20% up from the image's bottom edge
  if (iconSize) ctx.translate(0, iconSize.h * 0.3);
  ctx.scale(textScale, textScale);
  const bloom = getBloomLayer(label, measuredWidth);
  ctx.drawImage(bloom.canvas, -bloom.width / 2, -bloom.height / 2);
  const text = getTextLayer(
    label,
    color,
    strokeWidth,
    measuredWidth,
    deviceScale,
  );
  ctx.drawImage(
    text.canvas,
    -text.width / 2,
    -text.height / 2,
    text.width,
    text.height,
  );
  ctx.restore();
  ctx.restore();
}
