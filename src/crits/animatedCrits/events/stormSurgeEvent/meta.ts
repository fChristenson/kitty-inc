import type { EventMeta } from "../../eventMeta";

// bolts strike a river of cash
export default {
  label: "Storm Surge",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 1_100, // the river pouring
    travelMs: 1_400, // each coin's run along the river
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
