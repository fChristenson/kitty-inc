import type { EventMeta } from "../../eventMeta";

// a thrown spinning blade of light slices the bars
export default {
  label: "Saber Throw",
  style: "beam",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    throwMs: 1_300, // the throw, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
