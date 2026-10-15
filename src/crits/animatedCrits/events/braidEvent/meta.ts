import type { EventMeta } from "../../eventMeta";

// three rivers braid up into the total
export default {
  label: "Braid",
  style: "money",
  chance: 0.01,
  values: {
    streamMs: 1_100, // the strands pouring
    travelMs: 900, // each coin's climb
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
