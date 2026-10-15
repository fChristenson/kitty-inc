import type { EventMeta } from "../../eventMeta";

// a V of wisps loops trailing contrails of cash
export default {
  label: "Air Show",
  chance: 0.01,
  values: {
    streamMs: 900, // each contrail pouring
    travelMs: 1_250, // each coin's (and wisp's) trip round the loop
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
