import type { EventMeta } from "../../eventMeta";

// cash drizzled in loopy curls
export default {
  label: "Funnel Cake",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 1_000, // the drizzle pouring
    travelMs: 1_700, // each coin's trip along the curls
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
