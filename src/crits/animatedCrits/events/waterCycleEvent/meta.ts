import type { EventMeta } from "../../eventMeta";

// a sun evaporates a pool into clouds that rain onto the bars
export default {
  label: "Water Cycle",
  style: "mix",
  reward: "crit tiers and cash",
  chance: 0.01,
  values: {
    riseMs: 500, // the cash evaporating up into clouds
    rainsMs: [300, 180] as [number, number], // between clouds bursting, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
