import { COLOR } from "../../palette";
import { drawCartoonText, formatPrice } from "../../utils";
import { getPriceWiggleTransform, PRICE_WIGGLE_PERIOD_MS } from "./priceWiggle";

// cat marker geometry/drawing/hit-testing for the city map's per-building
// markers — split out of cityMap/index.ts (which owns the actual canvas +
// redraw loop) since none of this needs any of that module's own mutable
// state beyond the current canvas size + loaded sprite, both passed in
// explicitly rather than closed over

export const MARKER_COUNT = 5; // buildings per city/map "page" — see cityMap/index.ts
export const MARKER_H = 75; // 25% smaller than the original 100
const MARKER_HIT_PADDING = 16; // generous click/hover target beyond the sprite's own bounds

export const CAT_FRAME_COUNT = 5;
export const CAT_STAND_FRAME = 0;
export const CAT_JUMP_FRAME = 4; // the sheet's "arms-up happy pose", reused as a little hop
export const CAT_POSE_SWAP_MS = 550; // how long each pose in the stand/jump cycle holds
// workerWalk.png's own frames are mostly empty transparent padding above the cat
// itself (measured via pixel-scanning the sheet: real content starts ~46% down
// each frame, not at the frame's own top edge) — anything positioned relative to
// "the cat's head" needs this, or it ends up floating far above the actual
// visible art with barely any visual change from a small px tweak
export const CAT_CONTENT_TOP_FRACTION = 0.462;

// fixed screen fractions (of the canvas's own CSS size) for each building's marker —
// this is a flat, non-scrolling static map, so these never move/recompute per building
// zigzags up the map as tier/star count increases, so higher-tier buildings read
// as literally "higher up": bottom-left, far right, middle-left, far left, far right.
// centerShiftPx pulls a marker that many pixels toward the horizontal center
export const MARKER_POSITIONS: {
  cxFrac: number;
  feetYFrac: number;
  cxFixed?: number;
  centerShiftPx?: number;
  cxNudgePx?: number; // extra fine-tune offset, positive = right
  feetYNudgePx?: number; // extra fine-tune offset, positive = down
}[] = [
  { cxFrac: 0, feetYFrac: 1, cxFixed: 70, feetYNudgePx: -80 }, // building 0 (1 star): fixed bottom-right dock (see markerCenter's own override below)
  { cxFrac: 0.88, feetYFrac: 0.78, centerShiftPx: 260 }, // building 1 (2 stars): far right
  {
    cxFrac: 0.28,
    feetYFrac: 0.58,
    centerShiftPx: 100,
    cxNudgePx: 60,
    feetYNudgePx: -10,
  }, // building 2 (3 stars): middle left
  { cxFrac: 0.06, feetYFrac: 0.36, centerShiftPx: 140, feetYNudgePx: 40 }, // building 3 (4 stars): far left
  {
    cxFrac: 0.88,
    feetYFrac: 0.16,
    centerShiftPx: 100,
    cxNudgePx: 80,
    feetYNudgePx: 100,
  }, // building 4 (5 stars): far right
];

export interface MarkerBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// building 0's marker always sits bottom-right (fixed) — swapped with the
// corporation name label, which sits bottom-left (see cityMap/index.ts's
// drawCorporationNames) — every other building's marker sits at its own fixed
// screen fraction, pulled toward center by its own centerShiftPx, see
// MARKER_POSITIONS above
export function markerCenter(
  cssW: number,
  cssH: number,
  buildingIndex: number,
): { cx: number; feetY: number } {
  const pos = MARKER_POSITIONS[buildingIndex];
  let cx = buildingIndex === 0 ? cssW - 70 : (pos.cxFixed ?? cssW * pos.cxFrac);
  if (pos.centerShiftPx) {
    const center = cssW / 2;
    cx += cx > center ? -pos.centerShiftPx : pos.centerShiftPx;
  }
  cx += pos.cxNudgePx ?? 0;
  return {
    cx,
    feetY:
      (buildingIndex === 0 ? cssH - 40 : cssH * pos.feetYFrac) +
      (pos.feetYNudgePx ?? 0),
  };
}

export function markerBounds(
  cssW: number,
  cssH: number,
  catSprite: HTMLImageElement | null,
  buildingIndex: number,
): MarkerBounds {
  const { cx, feetY } = markerCenter(cssW, cssH, buildingIndex);
  if (!catSprite) {
    return { left: cx, right: cx, top: feetY, bottom: feetY };
  }
  const frameW = catSprite.naturalWidth / CAT_FRAME_COUNT;
  const frameH = catSprite.naturalHeight;
  const renderW = (MARKER_H * frameW) / frameH;
  return {
    left: cx - renderW / 2 - MARKER_HIT_PADDING,
    right: cx + renderW / 2 + MARKER_HIT_PADDING,
    top: feetY - MARKER_H - MARKER_HIT_PADDING,
    bottom: feetY + MARKER_HIT_PADDING,
  };
}

export function hitTestMarker(
  cssW: number,
  cssH: number,
  catSprite: HTMLImageElement | null,
  buildingIndex: number,
  x: number,
  y: number,
): boolean {
  const b = markerBounds(cssW, cssH, catSprite, buildingIndex);
  return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
}

// any building beyond MARKER_COUNT has no marker here yet
export function hitTestAnyMarker(
  cssW: number,
  cssH: number,
  catSprite: HTMLImageElement | null,
  x: number,
  y: number,
): number | null {
  for (let i = 0; i < MARKER_COUNT; i++) {
    if (hitTestMarker(cssW, cssH, catSprite, i, x, y)) return i;
  }
  return null;
}

export function drawCatMarker(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  catSprite: HTMLImageElement | null,
  buildingIndex: number,
  frame: number,
  grayedOut: boolean,
  jumpOffsetY = 0,
): void {
  if (!catSprite) return;
  const { cx, feetY } = markerCenter(cssW, cssH, buildingIndex);
  const frameW = catSprite.naturalWidth / CAT_FRAME_COUNT;
  const frameH = catSprite.naturalHeight;
  const renderW = (MARKER_H * frameW) / frameH;
  ctx.save();
  if (grayedOut) {
    ctx.filter = "grayscale(1) brightness(0.85)";
    ctx.globalAlpha = 0.75;
  }
  ctx.drawImage(
    catSprite,
    frame * frameW,
    0,
    frameW,
    frameH,
    cx - renderW / 2,
    feetY - MARKER_H + jumpOffsetY,
    renderW,
    MARKER_H,
  );
  ctx.restore();
}

// one-shot hop played the instant a building's marker actually unlocks — same
// shape (sin(t*pi)) and CAT_JUMP_FRAME/CLICK_FRAME swap as floors/worker's own
// click-reaction bounce, but slower/lower (worker's 300ms/14px reads as too
// fast/too high at this marker's much smaller MARKER_H=75 scale) — keyed by
// globalIndex so it survives a city-page round trip; getMarkerJumpOffset
// self-prunes expired entries so this map never grows past however many unlocks
// are mid-animation
const MARKER_JUMP_DURATION_MS = 500;
const MARKER_JUMP_HEIGHT_PX = 8;
const markerJumpStartedAt = new Map<number, number>();

export function triggerMarkerJump(globalIndex: number): void {
  markerJumpStartedAt.set(globalIndex, Date.now());
}

export function getMarkerJumpOffset(globalIndex: number, now: number): number {
  const startedAt = markerJumpStartedAt.get(globalIndex);
  if (startedAt === undefined) return 0;
  const elapsed = now - startedAt;
  if (elapsed >= MARKER_JUMP_DURATION_MS) {
    markerJumpStartedAt.delete(globalIndex);
    return 0;
  }
  const t = elapsed / MARKER_JUMP_DURATION_MS;
  return -MARKER_JUMP_HEIGHT_PX * Math.sin(Math.PI * t);
}

// spawnCoinBurstAt's default scale (1) is tuned for a full building-width
// canvas; these markers are tiny by comparison, so shrink it the same way
// pressConferenceGame's own COIN_BURST_SCALE does for its smaller canvas
export const MARKER_COIN_BURST_SCALE = 0.3;

// draws a still-locked marker's grayed-out cat + its unlock price (wiggling
// once affordable, same bounce+squash transform the map's prev/next CSS
// arrows play) — cityMap/index.ts calls this once per locked marker in its
// own redraw loop, then reports back whether it wiggled (see hasWigglingMarker)
export function drawLockedMarkerPrice(
  ctx: CanvasRenderingContext2D,
  cx: number,
  feetY: number,
  price: number,
  affordable: boolean,
): void {
  // 25% smaller than the original 22px, matching the scaled-down cat marker
  ctx.font = '900 16.5px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  // 8px above the cat's own actual visible head (not the sprite frame's own
  // top edge, which is mostly transparent padding — see CAT_CONTENT_TOP_FRACTION)
  const priceY = feetY - MARKER_H * (1 - CAT_CONTENT_TOP_FRACTION) - 8;
  if (!affordable) {
    drawCartoonText(ctx, formatPrice(price), cx, priceY, COLOR.white);
    return;
  }
  const phase = (Date.now() % PRICE_WIGGLE_PERIOD_MS) / PRICE_WIGGLE_PERIOD_MS;
  const { translateY, scaleX, scaleY } = getPriceWiggleTransform(phase);
  ctx.save();
  ctx.translate(cx, priceY + translateY);
  ctx.scale(scaleX, scaleY);
  drawCartoonText(ctx, formatPrice(price), 0, 0, COLOR.white);
  ctx.restore();
}
