import type { EventMeta } from "../../eventMeta";

// wheels of beam spokes roll along the bars
export default {
  label: "Spokes",
  style: "beam",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    staggerMs: 200, // between wheels dropping
    rollMs: [900, 650] as [number, number], // each roll, the first to the last
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
