import type { EventMeta } from "../../eventMeta";

// a river runs right-angle pipes to the total
export default {
  label: "Pipeline",
  style: "money",
  chance: 0.01,
  values: {
    streamMs: 900, // the river pouring
    travelMs: 1_200, // each coin's trip through the pipes
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
