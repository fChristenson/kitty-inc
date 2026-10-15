import type { EventMeta } from "../../eventMeta";

// barber-pole stripes of light spin along each bar
export default {
  label: "Barber Pole",
  style: "beam",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    staggerMs: 220, // between poles lighting up
    spinMs: 1000, // the first pole's spin
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
