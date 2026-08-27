// raw floor geometry — kept in its own dependency-free leaf file (not floors/index.ts
// itself) so sibling sub-modules re-exported from that barrel (incomePanel,
// upgradeButton, floorLock, ...) can import these for their own top-level const math
// without creating a circular import back through the barrel that re-exports them

// native size of bg.png
export const FLOOR_W = 1248;
export const FLOOR_H = 721;

// the floor plane band inside each bg.png slice (rest is ceiling/walls/windows) —
// used to keep the worker walking band clear of the room's side walls
export const FLOOR_X_MIN = 150;
export const FLOOR_X_MAX = 1100;

// decorative strip beneath the ground floor — rendered taller than the raw
// ground/street.png art's native 1248x318 (see scripts/process-street.mjs) so it
// reads at a scale proportionate to the multi-story buildings above it;
// GROUND_TILE_W keeps the art's own aspect ratio instead of stretching it. Divided
// down from the original 800 by the same ratio gameCanvas.ts's GUTTER_W shrank
// (280 -> 100, i.e. 1808/1448 old/new SLOT_W) so the street's own on-screen size
// stays put even though the resulting bigger camera scale (used for everything
// drawn in world space, ground included) makes the building itself bigger
export const GROUND_H = 641;
export const GROUND_TILE_W = Math.round(GROUND_H * (1248 / 318));

// height of the structural floor-divider band between stories (buildings/outerWall's
// bottom strip) — the tileable wall material stacked 5x (5 * the original 28px
// wall-edge mask) instead of just a thin masking edge. Only the bottom strip uses
// this (the top strip stays a thin 28px mask, see outerWall/index.ts): each floor's
// own bottom band is what's actually visible at every seam (drawn last, on top,
// thanks to FLOOR_OVERLAP). incomePanel/upgradeButton straddle this band (its own
// z-order is drawn first, so they render mounted on top of it), and the room's own
// bg art + worker are scaled down by ROOM_CONTENT_SCALE below so nothing the
// original ~28px-mask art assumed (including ceiling art like bg2.png's own roof
// beam) gets cropped off — it's compressed to fit instead. Changing this number
// alone is enough — every dependent (ROOM_CONTENT_SCALE, the divider draw, the
// worker's floor line) derives from it.
export const DIVIDER_H = 140;
// scales the room's own bg art + worker vertically so the whole image still fits
// (compressed, not cropped) above the divider band instead of losing its top edge
export const ROOM_CONTENT_SCALE = (FLOOR_H - (DIVIDER_H - 28)) / FLOOR_H;
