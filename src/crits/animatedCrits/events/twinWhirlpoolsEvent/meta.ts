import type { EventMeta } from "../../eventMeta";

// two whirlpools of cash orbit and merge
export default {
  label: "Twin Whirlpools",
  style: "money",
  reward: "crit tiers and cash",
  chance: 0.01,
  values: {
    formMs: 500, // pouring in and spinning up over the bars
    orbitMs: 1100, // wheeling round each other into one
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
