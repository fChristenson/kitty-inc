import type { EventMeta } from "../../eventMeta";

// cash pours over a spinning wheel of wisps
export default {
  label: "Waterwheel",
  chance: 0.01,
  values: {
    streamMs: 1_300, // the falls pouring
    travelMs: 1_000, // each coin's trip over the wheel and into the total
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
