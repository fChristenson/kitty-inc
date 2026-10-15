import type { EventMeta } from "../../eventMeta";

// a wall of lightning marches across the screen
export default {
  label: "Storm Front",
  style: "lightning",
  reward: "worker tiers + levels",
  chance: 0.01,
  values: {
    sweepMs: 1_700, // the front crossing, speeding up
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
