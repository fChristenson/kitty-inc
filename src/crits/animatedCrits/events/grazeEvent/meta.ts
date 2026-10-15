import type { EventMeta } from "../../eventMeta";

// a dodger threads a bullet storm onto the bars
export default {
  label: "Graze",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    runMs: 1_600, // the run through the storm
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
