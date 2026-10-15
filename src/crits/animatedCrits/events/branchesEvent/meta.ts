import type { EventMeta } from "../../eventMeta";

// a wisp splits and splits, branching the cash
export default {
  label: "Branches",
  chance: 0.01,
  values: {
    streamMs: 800, // the tree pouring
    travelMs: 1_100, // each coin's trip up the longest branch
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
