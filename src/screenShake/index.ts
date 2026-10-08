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
import { critFont, drawCritText } from "../shared/critText";
import { runWhenIdle } from "../shared/idle";
import { drawGoldShimmer } from "../shared/goldShimmer";
import { isScreenFrozen } from "../shared/screenFreeze";
import { getExplosionDurationMs, MAX_VIBRATE_MS } from "../sound";
import {
  drawCritSparks,
  startCritSparks,
  stopCritSparks,
} from "../shared/critSparks";

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

// a special crit's flash outline width (see shared/critFlash playSpecialFlash)
export const SPECIAL_FLASH_STROKE_WIDTH = 14;

// Loading all ~1400 celebration icons up front stalled the first seconds of
// play, so each icon warms when its proc is armed, well before it can flash;
// getCritIcon still loads any icon on demand. Its flash bitmap is baked then
// too, at idle, instead of on the click that shows it.
let latestArmedLabel = "";
onCritProcsArmed((kinds) => {
  for (const kind of kinds) {
    const { icon, label, color } = CRIT_PROC_INFO[kind];
    latestArmedLabel = label;
    void requestCritIcon(icon)
      .then(() =>
        runWhenIdle(() => {
          // a held button arms procs far faster than they flash: bake only the
          // newest, and never under a playing flash (it would stutter)
          if (label === latestArmedLabel && !isCritFlashActive(Date.now()))
            warmFlashBitmap(label, color, SPECIAL_FLASH_STROKE_WIDTH);
        }, 500),
      )
      .catch(() => undefined);
  }
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
// the label whose width sets the flash's size (a random crit's widest number)
let flashSizeLabel = "CRIT";
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
// size/opacity, no further growth/fade) so the bonus tier's own flash
// can animate on top of it, and both are cleared together once THAT flash ends
let bgFlashLabel: string | null = null;
let bgFlashColor: string = COLOR.purple;
let bgFlashStrokeWidth = 8;

// stacked flashes' earlier numbers, frozen under the newest one covering them
interface CoveredFlash {
  label: string;
  sizeLabel: string;
  color: string;
  strokeWidth: number;
  // where it sits, CSS px from the newest one's own start spot
  x: number;
  y: number;
}
let coveredFlashes: CoveredFlash[] = [];
// a stacked flash lands this far (CSS px) from the one it covers
export interface FlashStack {
  x: number;
  y: number;
}
// the foreground flash's spot, CSS px, in the same frame as the covered ones
let flashX = 0;
let flashY = 0;

// an event's screen freeze hides the flash and stops its clock until it ends
let flashPausedAt: number | null = null;

export function syncCritFlashPause(now: number): void {
  if (isScreenFrozen()) {
    if (flashPausedAt === null) {
      flashPausedAt = now;
      buzzForFlash(now);
    }
    return;
  }
  if (flashPausedAt === null) return;
  const pausedMs = now - flashPausedAt;
  flashPausedAt = null;
  if (flashStartedAt !== null) flashStartedAt += pausedMs;
  if (flashEndsAt !== null) flashEndsAt += pausedMs;
  buzzForFlash(now);
}

// the phone buzzes from a crit flash's start until it ends (a new flash takes
// over the buzz), or for just pulseMs when a flash right behind it needs its
// own distinct buzz; Android only, iOS has no vibration API
function buzzForFlash(now: number, pulseMs = 0): void {
  // no flash: leave any event's buzz alone
  if (flashEndsAt === null || typeof navigator.vibrate !== "function") return;
  const left = flashPausedAt !== null ? 0 : flashEndsAt - now;
  if (left <= 0 && flashPausedAt === null) return;
  const ms = Math.min(MAX_VIBRATE_MS, Math.max(0, Math.round(left)));
  const buzz = CRIT_ICON_BY_LABEL[flashLabel]
    ? Math.min(ms, badgeBuzzMs())
    : ms;
  navigator.vibrate(pulseMs > 0 ? Math.min(buzz, pulseMs) : buzz);
}

// a badge crit buzzes this much longer than a regular x5 crit (whose flash,
// and so buzz, lasts as long as its explosion sound), not its whole long flash
const BADGE_BUZZ_SCALE = 1.25;

function badgeBuzzMs(): number {
  return Math.round(
    BADGE_BUZZ_SCALE * Math.max(getExplosionDurationMs(), FLASH_DURATION_MS),
  );
}

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
  // lands this far from the playing flash, which stays showing under it
  stack: FlashStack | null;
  // buzzes just this long instead of the whole flash (0: the whole flash)
  pulseMs: number;
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
  syncCritFlashPause(Date.now());
  const now = flashPausedAt ?? Date.now();
  const fadeDurationMs = FLASH_DURATION_MS * req.intensity - GROWTH_DURATION_MS;
  let holdMs = Math.max(
    req.holdMs + iconExtraHoldMs(req),
    req.minDurationMs - GROWTH_DURATION_MS - fadeDurationMs,
  );
  const stacking = req.stack !== null && flashStartedAt !== null && flashLabel;
  const sizeLabel = spin
    ? spin.sizeLabel
    : stacking && req.label === flashLabel
      ? flashSizeLabel
      : req.label;
  if (!stacking) {
    coveredFlashes = [];
    flashX = 0;
    flashY = 0;
  } else {
    coveredFlashes.push({
      label: flashLabel,
      sizeLabel: flashSizeLabel,
      color: flashColor,
      strokeWidth: flashStrokeWidth,
      x: flashX,
      y: flashY,
    });
    flashX += req.stack!.x;
    flashY += req.stack!.y;
    // the stack stays up at least as long as the flash it covers would have
    if (flashEndsAt !== null)
      holdMs = Math.max(
        holdMs,
        flashEndsAt - now - GROWTH_DURATION_MS - fadeDurationMs,
      );
  }
  // a counted-up number is already on screen at full size: pop, don't spin in
  flashPopsIn = spin !== null;
  spin = null;
  flashStartedAt = now;
  flashLabel = req.label;
  flashSizeLabel = sizeLabel;
  flashColor = req.color;
  flashStrokeWidth = req.strokeWidth;
  flashBlinkHz = req.blinkHz;
  flashHoldMs = holdMs;
  activeFlashPriority = stacking
    ? Math.max(activeFlashPriority, req.priority)
    : req.priority;
  flashEndsAt = now + GROWTH_DURATION_MS + holdMs + fadeDurationMs;
  buzzForFlash(now, req.pulseMs);
  // a featured crit's image is its own show
  if (CRIT_ICON_BY_LABEL[req.label]) stopCritSparks();
  else startCritSparks(req.priority, now);
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

// settles any running shake at once, e.g. right before a screen freeze
// captures its frame
export function stopScreenShake(): void {
  shakeStartedAt = null;
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
  stack?: FlashStack | null;
  pulseMs?: number;
}): void {
  const req: FlashRequest = {
    intensity: options?.intensity ?? 1,
    label: options?.label ?? "x3",
    color: options?.color ?? COLOR.purple,
    strokeWidth: options?.strokeWidth ?? 8,
    blinkHz: options?.blinkHz ?? 0,
    holdMs: options?.holdMs ?? 0,
    priority: options?.priority ?? 0,
    minDurationMs: options?.minDurationMs ?? 0,
    stack: options?.stack ?? null,
    pulseMs: options?.pulseMs ?? 0,
  };
  const now = Date.now();
  kickShake(req.intensity, now);
  const idle = flashEndsAt === null || now >= flashEndsAt;
  const shouldStart =
    idle || req.priority > activeFlashPriority || req.stack !== null;
  if (shouldStart) {
    const iconName = CRIT_ICON_BY_LABEL[req.label]?.name;
    const ready = iconName ? requestCritIcon(iconName) : Promise.resolve(null);
    ready
      .then(async (icon) => {
        // decoded off the main thread again (the browser may have dropped it),
        // then baked with the label before the reveal's first frame
        if (icon) await icon.decode().catch(() => undefined);
        warmFlashBitmap(req.label, req.color, req.strokeWidth);
        const currentNow = Date.now();
        const stillIdle = flashEndsAt === null || currentNow >= flashEndsAt;
        if (stillIdle || req.priority > activeFlashPriority || req.stack)
          startFlash(req);
      })
      .catch(() => {
        warmFlashBitmap(req.label, req.color, req.strokeWidth);
        const currentNow = Date.now();
        const stillIdle = flashEndsAt === null || currentNow >= flashEndsAt;
        if (stillIdle || req.priority > activeFlashPriority || req.stack)
          startFlash(req);
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
// the reveal: grows up from nothing while spinning in and lands at full size
// on the swing's max-right angle, right on the explosion sfx, then swings
// once and settles still. Plays over the start of the timeline without
// shifting any timing (holds, blinks)
const ENTRY_LAND_MS = 50;
let flashPopsIn = false;
const POP_IN_MS = 180;
const POP_IN_SCALE = 0.2;
const SETTLE_ROTATION_DEG = 1.25;
const SETTLE_SCALE_AMOUNT = 0.025;
const SETTLE_HZ = 1.8;
// the swing dies out over one full cycle, then the flash holds still
const SETTLE_MS = 1000 / SETTLE_HZ;

function entryPose(p: number): {
  scale: number;
  rotation: number;
  alpha: number;
} {
  // grows faster into the landing so it hits; the spin slows to a stop on
  // the swing's turnaround so the two join without a jolt
  const turn = 1 - (1 - p) ** 2;
  return {
    scale: p * p,
    rotation: ((FLASH_SPIN_DEG * Math.PI) / 180) * (1 - turn),
    alpha: Math.min(1, p * 3),
  };
}

// the swing the reveal lands into, elapsedMs into its flash: from max-right
// it swings left and back, fading to rest by SETTLE_MS after the landing
function settlePose(elapsedMs: number): { scale: number; rotation: number } {
  const t = Math.max(0, elapsedMs - ENTRY_LAND_MS);
  if (t >= SETTLE_MS) return { scale: 1, rotation: 0 };
  const fade = (1 - t / SETTLE_MS) ** 2;
  const swing = Math.cos((t / 1000) * SETTLE_HZ * Math.PI * 2) * fade;
  return {
    scale: 1 + swing * SETTLE_SCALE_AMOUNT,
    rotation: swing * SETTLE_ROTATION_DEG * (Math.PI / 180),
  };
}

// read-only check for a caller whose own redraw loop is normally throttled (see
// cityMap/index.ts's tick()) and needs to know to run at full frame rate for as
// long as the flash is still playing, without triggering drawCritFlash's own
// side effect of clearing the state once expired
export function isCritFlashActive(now: number): boolean {
  syncCritFlashPause(now);
  if (spin && now - spin.startedAt < spin.spinMs) return true;
  return flashEndsAt !== null && (flashPausedAt ?? now) < flashEndsAt;
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
// past 4 sigma (shadowBlur is 2 sigma) the glow is invisible; any wider only
// grows the flash bitmap
const BLOOM_PADDING = BLOOM_BLUR * 2;
// the glow is soft anyway, so it's blurred at a third of the size and
// stretched back up: a full-size shadowBlur stalled held clicks on phones
const BLOOM_RES = 1 / 3;

function getBloomLayer(
  label: string,
  measuredWidth: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const cached = touchCached(bloomLayerCache, label);
  if (cached) return cached;

  const width = Math.ceil(measuredWidth + BLOOM_PADDING * 2);
  const height = Math.ceil(100 + BLOOM_PADDING * 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * BLOOM_RES);
  canvas.height = Math.ceil(height * BLOOM_RES);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(BLOOM_RES, BLOOM_RES);
  ctx.font = BLOOM_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // stacked twice for intensity — canvas shadowBlur alone reads faint at this
  // text's huge on-screen scale
  ctx.shadowColor = COLOR.white;
  // shadowBlur ignores the transform, so it scales by hand
  ctx.shadowBlur = BLOOM_BLUR * BLOOM_RES;
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

// The whole flash (icon, bloom and outlined label) baked into one bitmap at
// about its on-screen pixel density, so each frame is one stamp instead of
// three big overlapping ones; that overdraw dropped frames on phones.
interface FlashBitmap {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}
const flashBitmapCache = new Map<string, FlashBitmap>();
// checked every frame until the font loads, then never again
let fontReady = false;
const FLASH_BITMAP_LIMIT = 3;
const MAX_FLASH_BITMAP_PX = 2048;
// the tier flashes land most often: built ahead and never evicted, so a crit
// never rebuilds its (up to 2048px) bitmap on the frame it shakes
const pinnedFlashLabels = new Set<string>();

function storeFlashBitmap(key: string, entry: FlashBitmap): void {
  const pinned = pinnedFlashLabels.has(entry.label);
  let unpinned = 0;
  for (const [k, e] of flashBitmapCache) {
    // a pinned label keeps only its newest bitmap (the size moves on resize)
    if (pinned && e.label === entry.label) flashBitmapCache.delete(k);
    else if (!pinnedFlashLabels.has(e.label)) unpinned++;
  }
  flashBitmapCache.set(key, entry);
  if (pinned) return;
  for (const [k, e] of flashBitmapCache) {
    if (unpinned < FLASH_BITMAP_LIMIT) return;
    if (pinnedFlashLabels.has(e.label)) continue;
    flashBitmapCache.delete(k);
    unpinned--;
  }
}

function getFlashBitmap(
  label: string,
  color: string,
  strokeWidth: number,
  viewportWidth: number,
  sizeLabel = label,
): FlashBitmap {
  const ctx = getScratchCtx();
  const measuredWidth = measureLabel(ctx, label);
  const { targetScale, textScale } = flashLayerScales(
    ctx,
    label,
    viewportWidth,
    sizeLabel,
  );
  const config = CRIT_ICON_BY_LABEL[label];
  const icon = config ? getCritIcon(config.name) : null;
  const iconSize = icon ? fitIconSize(icon, measuredWidth * 0.85) : null;
  // headroom for the landing swing; quantized so the key stays put
  const wanted = Math.ceil(targetScale * lastDrawScale * 1.1 * 4) / 4;
  fontReady ||= document.fonts.check(FLASH_FONT);
  const key = `${label}|${color}|${strokeWidth}|${icon ? config!.name : ""}|${wanted}|${fontReady}`;
  const cached = touchCached(flashBitmapCache, key);
  if (cached) return cached;

  const bloom = getBloomLayer(label, measuredWidth);
  const textY = iconSize ? iconSize.h * 0.3 : 0;
  let halfW = (bloom.width * textScale) / 2;
  let top = textY - (bloom.height * textScale) / 2;
  let bottom = textY + (bloom.height * textScale) / 2;
  const turn = ((config?.rotateDeg ?? 0) * Math.PI) / 180;
  if (iconSize) {
    const cos = Math.abs(Math.cos(turn));
    const sin = Math.abs(Math.sin(turn));
    halfW = Math.max(halfW, (iconSize.w * cos + iconSize.h * sin) / 2);
    const halfH = (iconSize.w * sin + iconSize.h * cos) / 2;
    top = Math.min(top, -halfH);
    bottom = Math.max(bottom, halfH);
  }
  const width = halfW * 2;
  const height = bottom - top;
  const resolution = Math.min(
    wanted,
    MAX_FLASH_BITMAP_PX / Math.max(width, height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * resolution);
  canvas.height = Math.ceil(height * resolution);
  const layerCtx = canvas.getContext("2d")!;
  layerCtx.scale(resolution, resolution);
  layerCtx.translate(halfW, -top);
  if (icon && iconSize) {
    layerCtx.imageSmoothingEnabled = true;
    layerCtx.imageSmoothingQuality = "high";
    layerCtx.rotate(turn);
    layerCtx.drawImage(
      icon,
      -iconSize.w / 2,
      -iconSize.h / 2,
      iconSize.w,
      iconSize.h,
    );
    layerCtx.rotate(-turn);
  }
  layerCtx.translate(0, textY);
  layerCtx.scale(textScale, textScale);
  layerCtx.drawImage(
    bloom.canvas,
    -bloom.width / 2,
    -bloom.height / 2,
    bloom.width,
    bloom.height,
  );
  drawCritText(layerCtx, label, 0, 0, color, {
    fontSize: FLASH_FONT_SIZE,
    strokeWidth,
  });
  const entry = { canvas, x: -halfW, y: top, width, height, label };
  storeFlashBitmap(key, entry);
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
  sizeLabel = label,
): { targetScale: number; textScale: number } {
  const measuredWidth = measureLabel(ctx, label);
  const targetScale = (viewportWidth * 0.8) / measureLabel(ctx, sizeLabel);
  const textScale =
    label === "Skip" ? measuredWidth / measureLabel(ctx, "Heavenly") : 1;
  return { targetScale, textScale };
}

// the last frame's draw scale, so a new label's bitmap can be built before
// its flash starts instead of stalling the reveal's first frame
let lastDrawScale = 1;
let lastViewportWidth = 0;

function warmFlashBitmap(
  label: string,
  color: string,
  strokeWidth: number,
): void {
  if (label && lastViewportWidth > 0)
    getFlashBitmap(label, color, strokeWidth, lastViewportWidth);
}

// builds these flashes' bitmaps at idle, once the canvas has a size and the
// font has loaded, and keeps them for the session
export function warmCritFlashes(
  flashes: { label: string; color: string; strokeWidth: number }[],
): void {
  for (const { label } of flashes) pinnedFlashLabels.add(label);
  const warm = (): void => {
    if (
      lastViewportWidth === 0 ||
      !document.fonts.check(FLASH_FONT) ||
      isCritFlashActive(Date.now())
    ) {
      runWhenIdle(warm, 1000);
      return;
    }
    for (const { label, color, strokeWidth } of flashes)
      warmFlashBitmap(label, color, strokeWidth);
  };
  runWhenIdle(warm, 1000);
}

export function drawCritFlash(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  viewportWidth: number,
  now: number,
): void {
  syncCritFlashPause(now);
  if (flashPausedAt !== null) return;
  drawFlashLayers(ctx, centerX, centerY, viewportWidth, now);
  drawCritSpin(ctx, centerX, centerY, viewportWidth, now);
  drawCritSparks(ctx, centerX, centerY, viewportWidth, now);
}

// a random crit counting up to its number like the total income readout,
// at the size its own flash slams in at; drawn from baked glyphs
interface SpinGlyphs {
  // "x" then 0-9
  sprites: HTMLCanvasElement[];
  advances: number[];
  pad: number;
  font: number;
}
interface CritSpin {
  glyphs: SpinGlyphs;
  low: number;
  range: number;
  start: number;
  steps: number;
  // its widest number, which sets its size and its slam's
  sizeLabel: string;
  // on-screen font size, as a share of the viewport's width
  sizeShare: number;
  startedAt: number;
  spinMs: number;
}
let spin: CritSpin | null = null;
const spinGlyphCache = new Map<string, SpinGlyphs>();
const SPIN_CHARS = "x0123456789";

function getSpinGlyphs(
  color: string,
  strokeWidth: number,
  res: number,
): SpinGlyphs {
  const key = `${color}|${strokeWidth}|${res}`;
  const cached = spinGlyphCache.get(key);
  if (cached) return cached;
  const font = FLASH_FONT_SIZE * res;
  const pad = Math.ceil(strokeWidth * res);
  const scratch = getScratchCtx();
  scratch.font = critFont(font);
  const advances = [...SPIN_CHARS].map((c) => scratch.measureText(c).width);
  const sprites = [...SPIN_CHARS].map((c, i) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(advances[i] + pad * 2);
    canvas.height = Math.ceil(font * 1.25 + pad * 2);
    drawCritText(
      canvas.getContext("2d")!,
      c,
      canvas.width / 2,
      canvas.height / 2,
      color,
      { fontSize: font, strokeWidth: strokeWidth * res },
    );
    return canvas;
  });
  const glyphs = { sprites, advances, pad, font };
  spinGlyphCache.set(key, glyphs);
  return glyphs;
}

// numbers the count runs through a second
const SPIN_RATE = 120;

export function playCritSpin(
  [low, high]: [number, number],
  to: number,
  color: string,
  strokeWidth: number,
  spinMs: number,
): void {
  const scratch = getScratchCtx();
  let sizeLabel = `x${to}`;
  for (let n = low; n <= high; n++)
    if (measureLabel(scratch, `x${n}`) > measureLabel(scratch, sizeLabel))
      sizeLabel = `x${n}`;
  // the same share of the screen its own flash fills
  const sizeShare = 0.8 / measureLabel(scratch, sizeLabel);
  const onScreen =
    FLASH_FONT_SIZE * sizeShare * lastViewportWidth * lastDrawScale;
  const res = Math.min(3, Math.max(1, Math.ceil(onScreen / FLASH_FONT_SIZE)));
  const range = high - low + 1;
  const steps = Math.round((spinMs / 1000) * SPIN_RATE);
  spin = {
    glyphs: getSpinGlyphs(color, strokeWidth, res),
    low,
    range,
    // so the count wraps round the range and ends on its number
    start: (((to - low - steps) % range) + range) % range,
    steps,
    sizeLabel,
    sizeShare: sizeShare * FLASH_FONT_SIZE,
    startedAt: Date.now(),
    spinMs,
  };
}

function drawCritSpin(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  viewportWidth: number,
  now: number,
): void {
  if (!spin) return;
  const t = (now - spin.startedAt) / spin.spinMs;
  // held on its number until the slam replaces it (startFlash)
  if (t >= 2) {
    spin = null;
    return;
  }
  const { glyphs, low, range, start, steps } = spin;
  const step = Math.floor(Math.min(1, Math.max(0, t)) * steps);
  const text = `x${low + ((start + step) % range)}`;
  const scale = (spin.sizeShare * viewportWidth) / glyphs.font;
  let width = 0;
  for (const c of text) width += glyphs.advances[SPIN_CHARS.indexOf(c)];
  let x = centerX - (width * scale) / 2;
  for (const c of text) {
    const i = SPIN_CHARS.indexOf(c);
    const sprite = glyphs.sprites[i];
    ctx.drawImage(
      sprite,
      x - glyphs.pad * scale,
      centerY - (sprite.height * scale) / 2,
      sprite.width * scale,
      sprite.height * scale,
    );
    x += glyphs.advances[i] * scale;
  }
}

function drawFlashLayers(
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
    drawFlashLayer(
      ctx,
      centerX,
      centerY,
      viewportWidth,
      bgFlashLabel,
      bgFlashColor,
      bgFlashStrokeWidth,
      1,
      1,
      0,
      1,
      now,
    );
  }
  if (flashStartedAt === null || flashEndsAt === null) {
    // no foreground flash left to eventually clear it — never leave an
    // orphaned frozen background on screen forever
    bgFlashLabel = null;
    coveredFlashes = [];
    return;
  }
  if (now >= flashEndsAt) {
    flashStartedAt = null;
    flashEndsAt = null;
    activeFlashPriority = -1;
    bgFlashLabel = null;
    coveredFlashes = [];
    return;
  }

  const elapsed = now - flashStartedAt;
  const holdEndsAt = GROWTH_DURATION_MS + flashHoldMs;
  const totalLifetimeMs = flashEndsAt - flashStartedAt;

  const settle = settlePose(elapsed);
  let growthScale = settle.scale;
  let rotation = settle.rotation;
  let alpha = 1;
  let raysScale = 1;
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

  // fading out with the number covering them, never blinking with it; each
  // newer number sits at its own offset from the one under it, like stacked
  // paper
  const fade = elapsed >= holdEndsAt ? alpha : 1;
  // in CSS px, whatever the canvas's world scale
  const px = (window.devicePixelRatio || 1) / lastDrawScale;
  // the whole stack centred on the screen
  let minX = flashX,
    maxX = flashX,
    minY = flashY,
    maxY = flashY;
  for (const c of coveredFlashes) {
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x);
    minY = Math.min(minY, c.y);
    maxY = Math.max(maxY, c.y);
  }
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  for (const covered of coveredFlashes)
    drawFlashLayer(
      ctx,
      centerX + (covered.x - midX) * px,
      centerY + (covered.y - midY) * px,
      viewportWidth,
      covered.label,
      covered.color,
      covered.strokeWidth,
      fade,
      1,
      0,
      1,
      now,
      covered.sizeLabel,
    );

  // the reveal plays over the start of the timeline without moving it, so
  // holds, blinks and their sound sync stay exactly where they were
  if (flashPopsIn) {
    if (elapsed < POP_IN_MS)
      growthScale *=
        1 + POP_IN_SCALE * Math.sin((Math.PI * elapsed) / POP_IN_MS);
  } else if (elapsed < ENTRY_LAND_MS) {
    const entry = entryPose(elapsed / ENTRY_LAND_MS);
    growthScale *= entry.scale;
    raysScale = entry.scale;
    rotation += entry.rotation;
    // the blink keeps its own beat under the reveal (x125's tones follow it)
    alpha *= entry.alpha;
  }

  drawFlashLayer(
    ctx,
    centerX + (flashX - midX) * px,
    centerY + (flashY - midY) * px,
    viewportWidth,
    flashLabel,
    flashColor,
    flashStrokeWidth,
    alpha,
    growthScale,
    rotation,
    raysScale,
    elapsed,
    flashSizeLabel,
  );
}

// one full sway of the rays behind a crit image, a few to a reveal, and how
// far they turn each way
const RAY_SWAY_MS = 900;
const RAY_SWAY_RAD = 0.12;
// one full sway of the badge over its rays, and how far it turns each way
const BADGE_SWAY_MS = 1100;
const BADGE_SWAY_RAD = 0.05;

// -1..1 over each periodMs; wrapped so a long-running clock keeps its precision
function wave(now: number, periodMs: number): number {
  return Math.sin(((now % periodMs) / periodMs) * Math.PI * 2);
}

// one flash layer, its rays behind its baked bitmap, at a given alpha, scale
// and rotation: the animated foreground and the frozen background share it.
// motionMs drives the sways: ms into the flash, so every reveal starts mid-swing
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
  raysScale: number,
  motionMs: number,
  sizeLabel = label,
): void {
  // an empty label is a shake with no text at all
  if (!label) return;
  const scratch = getScratchCtx();
  const { targetScale } = flashLayerScales(
    scratch,
    label,
    viewportWidth,
    sizeLabel,
  );
  const bitmap = getFlashBitmap(
    label,
    color,
    strokeWidth,
    viewportWidth,
    sizeLabel,
  );
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(centerX, centerY);
  const config = CRIT_ICON_BY_LABEL[label];
  const icon = config ? getCritIcon(config.name) : null;
  const now = performance.now();
  if (icon) {
    const { w, h } = fitIconSize(icon, measureLabel(scratch, label) * 0.85);
    // the rays sway gently back and forth, like searchlights at a gala
    const sway = RAY_SWAY_RAD * wave(motionMs, RAY_SWAY_MS);
    ctx.rotate(sway);
    drawGoldShimmer(
      ctx,
      0,
      0,
      Math.max(w, h) * 0.75 * targetScale * raysScale,
      1,
      0,
      now,
    );
    ctx.rotate(-sway);
  }
  ctx.rotate(rotation);
  // the badge sways a little back and forth
  if (icon) ctx.rotate(BADGE_SWAY_RAD * wave(motionMs, BADGE_SWAY_MS));
  const scale = growthScale * targetScale;
  ctx.scale(scale, scale);
  ctx.drawImage(bitmap.canvas, bitmap.x, bitmap.y, bitmap.width, bitmap.height);
  ctx.restore();
}
