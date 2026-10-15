import type { EventMeta } from "../../eventMeta";

// a river coils in loops into the total
export default {
  label: "Slinky",
  style: "money",
  chance: 0.01,
  values: {
    streamMs: 1_000, // the river pouring
    travelMs: 1_100, // each coin's trip round every coil
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
