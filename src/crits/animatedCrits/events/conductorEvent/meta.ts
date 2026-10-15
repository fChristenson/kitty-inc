import type { EventMeta } from "../../eventMeta";

// a conductor's downbeats strike the bars
export default {
  label: "Conductor",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    barsMs: [600, 400] as [number, number], // each measure, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
