import type { EventMeta } from "../../eventMeta";

// a wisp rides a bucking river of cash
export default {
  label: "Rodeo",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 1_200, // the river bucking
    travelMs: 700, // each coin's trip
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
