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

// decorative strip beneath the ground floor (grass top edge + dirt below)
export const GROUND_H = 310;
