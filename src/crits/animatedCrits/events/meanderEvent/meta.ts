import type { EventMeta } from "../../eventMeta";

// a meandering river of cash loops through the bars
export default {
  label: "Meander",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    streamMs: 1_000, // the river pouring
    travelMs: 900, // each coin's trip down the river
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
