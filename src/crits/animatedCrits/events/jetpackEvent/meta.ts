import type { EventMeta } from "../../eventMeta";

// a wisp rides a jet of cash up into the total
export default {
  label: "Jetpack",
  style: "mix",
  chance: 0.01,
  values: {
    flyMs: 1_500, // the climb to the total
    sweepMs: 250, // the pool erupting after it
    flightMs: 380, // each coin's flight up into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
