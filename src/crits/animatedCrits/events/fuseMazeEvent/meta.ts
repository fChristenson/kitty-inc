import type { EventMeta } from "../../eventMeta";

// a flame floods a maze of fuse cord, every dead end a bomb, the far corner's
// cord into the lock
export default {
  label: "Fuse Maze",
  style: "explosion",
  reward: "a free floor",
  chance: 0.01,
  values: {
    growMs: 300, // the maze snapping out
    stepMs: [28, 14] as [number, number], // the flame from cell to cell, quickening
    finalMs: 260, // the last cord out to the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
