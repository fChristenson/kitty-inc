import type { EventMeta } from "../../eventMeta";

// a gun shoots down a grid of invaders
export default {
  label: "Invaders",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    formMs: 700, // the grid forming up
    killsMs: [100, 45] as [number, number], // between kills, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
