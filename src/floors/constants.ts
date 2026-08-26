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
// GROUND_TILE_W keeps the art's own aspect ratio instead of stretching it
export const GROUND_H = 800;
export const GROUND_TILE_W = Math.round(GROUND_H * (1248 / 318));
