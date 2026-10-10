// the crit flash: the big spinning/slamming crit number or badge, its sparks
// and buzz, and the floor crit it hands the number to.

import { COLOR } from "../../palette";
import { loadImageByName, type ImageName } from "../../loadAssets";
import {
  CRIT_PROC_INFO,
  CRIT_PROC_KINDS,
  onCritProcsArmed,
  onFeaturedCatalog,
  type CritProcKind,
} from "../critTypes";
import { critFont, drawCritText } from "./critText";
import { runWhenIdle } from "../../shared/idle";
import { drawGoldShimmer } from "../../shared/goldShimmer";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { clamp01, lerp } from "../../shared/easing";
import { kickShake } from "../../shared/screenShake";
import {
  drawFloorCrit,
  isFloorCritRunning,
  launchFloorCrit,
  type FloorCritPlay,
} from "../floorCrits/critPlayer";

import { getExplosionDurationMs } from "../../sound";
import { MAX_VIBRATE_MS, setBuzz } from "../../shared/vibration";
import { drawCritSparks, startCritSparks, stopCritSparks } from "./critSparks";

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
// icon at all. The featured crits join once their catalog loads
const CRIT_ICON_BY_LABEL: Partial<
  Record<string, { name: ImageName; rotateDeg?: number }>
> = {};
function addCritIcons(): void {
  for (const kind of CRIT_PROC_KINDS) {
    const info = CRIT_PROC_INFO[kind];
    if (info)
      CRIT_ICON_BY_LABEL[info.label] = {
        name: info.icon,
        rotateDeg: CRIT_ICON_EXTRA_ROTATION[kind],
      };
  }
}
addCritIcons();
onFeaturedCatalog(addCritIcons);

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

// a special crit's flash outline width (see crits/critFlash playSpecialFlash)
export const SPECIAL_FLASH_STROKE_WIDTH = 14;

// Loading all ~1400 celebration icons up front stalled the first seconds of
// play, so each icon warms when its proc is armed, well before it can flash;
// getCritIcon still loads any icon on demand. Its flash bitmap is baked then
// too, at idle, instead of on the click that shows it.
let latestArmedLabel = "";
onCritProcsArmed((kinds) => {
  for (const kind of kinds) {
    const info = CRIT_PROC_INFO[kind];
    if (!info) continue;
    const { icon, label, color } = info;
    latestArmedLabel = label;
    void requestCritIcon(icon)
      .then(() =>
        runWhenIdle(() => {
          // a held button arms procs far faster than they flash: bake only the
          // newest, and never under a playing flash (it would stutter)
          if (label === latestArmedLabel && !isCritFlashActive(Date.now()))
            warmFlashBitmap(label, color, SPECIAL_FLASH_STROKE_WIDTH);
        }),
      )
      .catch(() => undefined);
  }
});
runWhenIdle(() => void requestCritIcon("cashRegister").catch(() => undefined));

function getCritIcon(name: ImageName): HTMLImageElement | null {
  const cached = loadedCritIcons.get(name);
  if (cached) return cached;
  if (!requestedCritIcons.has(name)) requestCritIcon(name);
  return null;
}
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
  setBuzz(pulseMs > 0 ? Math.min(buzz, pulseMs) : buzz);
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
  floorCrit: FloorCritPlay | null;
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
  const sizeLabel =
    stacking && req.label === flashLabel ? flashSizeLabel : req.label;
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
  // a merge's sum or a floor crit's number slams down from big
  flashEntry = merge !== null || (req.floorCrit && !stacking) ? "slam" : "spin";
  if (flashEntry === "slam")
    setTimeout(() => kickShake(SLAM_SHAKE, Date.now()), SLAM_MS);
  merge = null;
  flashStartedAt = now;
  flashLabel = req.label;
  flashSizeLabel = sizeLabel;
  flashColor = req.color;
  flashStrokeWidth = req.strokeWidth;
  flashBlinkHz = req.blinkHz;
  flashHoldMs = holdMs;
  flashFloorCrit = stacking ? null : req.floorCrit;
  if (flashFloorCrit) setTimeout(() => warmFloorCritGlyphs(req), 50);
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
  floorCrit?: FloorCritPlay | null;
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
    floorCrit: options?.floorCrit ?? null,
  };
  const now = Date.now();
  kickShake(req.intensity, now);
  // a counting or merging number owns the screen until its own slam lands
  const leadIn = pendingLeadInLabel(now);
  if (leadIn !== null && req.label !== leadIn) return;
  const idle = flashEndsAt === null || now >= flashEndsAt;
  const shouldStart =
    idle ||
    req.priority > activeFlashPriority ||
    req.stack !== null ||
    leadIn !== null;
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
let flashEntry: "spin" | "slam" = "spin";
// a slam drops from this much bigger, lands with a shake, then squishes
const SLAM_MS = 120;
const SLAM_FROM = 2.6;
const SLAM_SHAKE = 1.2;
const SLAM_SQUISH_MS = 240;
const SLAM_SQUISH = 0.16;
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
  if (pendingLeadInLabel(now) !== null) return true;
  if (isFloorCritRunning()) return true;
  return flashEndsAt !== null && (flashPausedAt ?? now) < flashEndsAt;
}

// the slam a merge crit's numbers are still building up to, until it lands
// (or, if it never does, well past its due time)
function pendingLeadInLabel(now: number): string | null {
  if (merge && now - merge.startedAt < merge.mergeMs * 2) return merge.label;
  return null;
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
  sizeLabel = label,
): void {
  if (label && lastViewportWidth > 0)
    getFlashBitmap(label, color, strokeWidth, lastViewportWidth, sizeLabel);
}

// bakes a lead-in's slam a frame after it starts, so the slam doesn't stall
function warmSlamSoon(label: string, color: string, strokeWidth: number): void {
  setTimeout(() => warmFlashBitmap(label, color, strokeWidth), 20);
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
      runWhenIdle(warm);
      return;
    }
    for (const { label, color, strokeWidth } of flashes) {
      warmFlashBitmap(label, color, strokeWidth);
      // the number a floor crit riding this flash plays out onto the bars
      getSpinGlyphs(
        color,
        strokeWidth,
        spinGlyphRes(floorCritSizeShare(label)),
      );
    }
  };
  runWhenIdle(warm);
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
  drawCritMerge(ctx, centerX, centerY, viewportWidth, now);
  drawFloorCrit(ctx, centerX, centerY, now);
  drawCritSparks(ctx, centerX, centerY, viewportWidth, now);
}

// a crit's number baked character by character, so a merge or floor crit can
// draw any number at the size its own flash slams in at
interface SpinGlyphs {
  // "x" then 0-9
  sprites: HTMLCanvasElement[];
  advances: number[];
  pad: number;
  font: number;
}
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

// glyphs baked near their on-screen size, so they stay sharp
function spinGlyphRes(sizeShare: number): number {
  const onScreen = sizeShare * lastViewportWidth * lastDrawScale;
  return Math.min(3, Math.max(1, Math.ceil(onScreen / FLASH_FONT_SIZE)));
}

function glyphTextWidth(glyphs: SpinGlyphs, text: string): number {
  let width = 0;
  for (const c of text) width += glyphs.advances[SPIN_CHARS.indexOf(c)];
  return width;
}

// glyph text centred on (centerX, centerY)
function drawGlyphText(
  ctx: CanvasRenderingContext2D,
  glyphs: SpinGlyphs,
  text: string,
  centerX: number,
  centerY: number,
  scale: number,
): void {
  let x = centerX - (glyphTextWidth(glyphs, text) * scale) / 2;
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

// a merge crit: two crit numbers charge in from opposite sides or corners of
// the screen, stop facing each other, circle each other ever faster and
// spiral in, their sum slamming in the moment they smash together
export interface MergeNumber {
  label: string;
  color: string;
  strokeWidth: number;
}
interface CritMerge {
  // the sum that slams in
  label: string;
  first: { glyphs: SpinGlyphs; text: string };
  second: { glyphs: SpinGlyphs; text: string };
  // which way they charge: 0 sideways, 1 up and down, 2 and 3 corner to corner
  lane: number;
  // swaps which end the first one comes from
  flip: 1 | -1;
  // on-screen font size, as a share of the viewport's width
  sizeShare: number;
  startedAt: number;
  mergeMs: number;
}
let merge: CritMerge | null = null;
const MERGE_IMPACT_SHAKE = 0.6;
// of the merge's time: charging in and stopping on their orbit
const MERGE_ENTER = 0.25;
// turns they circle each other, speeding up, and how far apart (of the
// screen's width, from the middle)
const MERGE_TURNS = 1.5;
const MERGE_ORBIT = 0.24;
// of the circling: when they start spiralling in to smash
const MERGE_SPIRAL_AT = 0.4;
// a little overlap as they meet
const MERGE_TOUCH = 1.1;
const MERGE_LANES = 4;

export function playCritMerge(
  first: MergeNumber,
  second: MergeNumber,
  sum: MergeNumber,
  mergeMs: number,
): void {
  warmSlamSoon(sum.label, sum.color, sum.strokeWidth);
  // side by side they'd fill this share of the screen's width
  const scratch = getScratchCtx();
  const sizeShare =
    (FLASH_FONT_SIZE * 0.6) /
    (measureLabel(scratch, first.label) + measureLabel(scratch, second.label));
  const res = spinGlyphRes(sizeShare);
  const number = ({ label, color, strokeWidth }: MergeNumber) => ({
    glyphs: getSpinGlyphs(color, strokeWidth, res),
    text: label,
  });
  const started: CritMerge = {
    label: sum.label,
    first: number(first),
    second: number(second),
    lane: Math.floor(Math.random() * MERGE_LANES),
    flip: Math.random() < 0.5 ? 1 : -1,
    sizeShare,
    startedAt: Date.now(),
    mergeMs,
  };
  merge = started;
  setTimeout(() => {
    if (merge === started) kickShake(MERGE_IMPACT_SHAKE, Date.now());
  }, mergeMs);
}

// the unit direction from the middle to where the first number starts: a
// side, the top, or a real corner of the screen
function mergeLane(lane: number, halfW: number, halfH: number) {
  const [x, y] =
    lane === 0
      ? [1, 0]
      : lane === 1
        ? [0, 1]
        : [halfW, lane === 2 ? halfH : -halfH];
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}

function drawCritMerge(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  viewportWidth: number,
  now: number,
): void {
  if (!merge) return;
  const ms = now - merge.startedAt;
  const t = Math.max(0, ms / merge.mergeMs);
  if (t >= 2) {
    merge = null;
    return;
  }
  const scale = (merge.sizeShare * viewportWidth) / merge.first.glyphs.font;
  const dir = mergeLane(merge.lane, viewportWidth / 2, centerY);
  const lane = Math.atan2(dir.y, dir.x);
  // far enough out that each starts fully off screen
  const offScreen = Math.hypot(viewportWidth / 2, centerY);
  const enter = Math.min(1, t / MERGE_ENTER);
  const u = Math.max(0, (t - MERGE_ENTER) / (1 - MERGE_ENTER));
  // circling each other ever faster once they've stopped, then past the
  // smash ploughing on at the same speed until the slam replaces them
  const turn =
    u <= 1
      ? MERGE_TURNS * 2 * Math.PI * u * u
      : MERGE_TURNS * 2 * Math.PI * (2 * u - 1);
  for (const [side, { glyphs, text }] of [
    [merge.flip, merge.first],
    [-merge.flip, merge.second],
  ] as const) {
    const halfW = (glyphTextWidth(glyphs, text) * scale) / 2;
    const halfH = glyphs.font * scale * 0.4;
    const angle = lane + turn + (side < 0 ? Math.PI : 0);
    // how far its centre sits from the middle when it touches the other
    const touch =
      (Math.abs(Math.cos(angle)) * halfW + Math.abs(Math.sin(angle)) * halfH) *
      MERGE_TOUCH;
    const orbit = Math.max(viewportWidth * MERGE_ORBIT, touch * 1.4);
    let dist: number;
    let stretch: number;
    let along: number;
    if (t < MERGE_ENTER) {
      // charging in from off screen, braking to a stop on its orbit
      const e = 1 - (1 - enter) ** 3;
      dist = lerp([offScreen + touch * 2, orbit], e);
      stretch = 1 + 0.3 * (1 - enter);
      along = angle;
    } else {
      const spiral = clamp01((u - MERGE_SPIRAL_AT) / (1 - MERGE_SPIRAL_AT));
      dist =
        u <= 1
          ? lerp([orbit, touch], spiral * spiral)
          : Math.max(0, touch - (orbit - touch) * 2 * (u - 1));
      stretch = 1 + 0.35 * Math.min(1, u);
      along = angle + Math.PI / 2;
    }
    ctx.save();
    ctx.translate(
      centerX + Math.cos(angle) * dist,
      centerY + Math.sin(angle) * dist,
    );
    // stretched along its motion
    ctx.rotate(along);
    ctx.scale(stretch, 1 / stretch);
    ctx.rotate(-along);
    drawGlyphText(ctx, glyphs, text, 0, 0, scale);
    ctx.restore();
  }
}

// a floor crit (floorCrits/critPlayer) rides the flash it's handed to: once that
// has slammed in and sat, its number plays out onto the bars instead of fading
let flashFloorCrit: FloorCritPlay | null = null;
// how long a floor crit's flash shows before its number plays out
const FLOOR_CRIT_SIT_MS = 400;

function floorCritSizeShare(sizeLabel: string): number {
  return (FLASH_FONT_SIZE * 0.8) / measureLabel(getScratchCtx(), sizeLabel);
}

function warmFloorCritGlyphs(req: FlashRequest): void {
  const share = floorCritSizeShare(flashSizeLabel);
  getSpinGlyphs(req.color, req.strokeWidth, spinGlyphRes(share));
}

function startFloorCrit(
  play: FloorCritPlay,
  viewportWidth: number,
  now: number,
): void {
  const share = floorCritSizeShare(flashSizeLabel);
  const glyphs = getSpinGlyphs(
    flashColor,
    flashStrokeWidth,
    spinGlyphRes(share),
  );
  launchFloorCrit(
    play,
    { ...glyphs, index: (c) => SPIN_CHARS.indexOf(c), color: flashColor },
    flashLabel,
    share * viewportWidth,
    viewportWidth,
    now,
    (intensity) => kickShake(intensity, Date.now()),
  );
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
  if (flashStartedAt === null || flashEndsAt === null) {
    coveredFlashes = [];
    return;
  }
  if (now >= flashEndsAt) {
    flashStartedAt = null;
    flashEndsAt = null;
    activeFlashPriority = -1;
    coveredFlashes = [];
    return;
  }

  const elapsed = now - flashStartedAt;
  const holdEndsAt = GROWTH_DURATION_MS + flashHoldMs;
  // a floor crit's flash plays its number out onto the bars after a short sit
  if (flashFloorCrit && elapsed >= Math.min(holdEndsAt, FLOOR_CRIT_SIT_MS)) {
    startFloorCrit(flashFloorCrit, viewportWidth, now);
    flashFloorCrit = null;
    flashStartedAt = null;
    flashEndsAt = null;
    activeFlashPriority = -1;
    coveredFlashes = [];
    return;
  }
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
  if (flashEntry === "slam") {
    if (elapsed < SLAM_MS) {
      const p = elapsed / SLAM_MS;
      growthScale *= SLAM_FROM + (1 - SLAM_FROM) * p * p;
      alpha *= Math.min(1, 0.3 + p);
    } else if (elapsed < SLAM_MS + SLAM_SQUISH_MS) {
      const q = (elapsed - SLAM_MS) / SLAM_SQUISH_MS;
      growthScale *= 1 - SLAM_SQUISH * Math.sin(Math.PI * q) * (1 - q);
    }
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

export {
  createCritTextSprite,
  critFont,
  drawCritTextSprite,
  drawPoppingCritText,
  type CritTextSprite,
} from "./critText";
export { playSpecialFlash, playTierFlash, warmTierFlashes } from "./presets";
