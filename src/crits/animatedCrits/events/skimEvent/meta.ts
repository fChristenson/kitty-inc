import type { EventMeta } from "../../eventMeta";

// a river skips across the screen like a stone
export default {
  label: "Skim",
  style: "money",
  chance: 0.01,
  values: {
    streamMs: 700, // the river pouring
    travelMs: 1_300, // each coin's trip, every skip and up into the total
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
