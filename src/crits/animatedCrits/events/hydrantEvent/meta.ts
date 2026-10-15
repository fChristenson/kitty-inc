import type { EventMeta } from "../../eventMeta";

// jets of cash burst out every way
export default {
  label: "Hydrant",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 700, // each jet pouring
    travelMs: 600, // each coin's trip to the edge
    secondMs: 450, // the second ring of jets bursting
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
