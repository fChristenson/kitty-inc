import type { EventMeta } from "../../eventMeta";

// a meteor wisp lands in a crown splash of cash
export default {
  label: "Splashdown",
  chance: 0.01,
  values: {
    fallMs: 380, // the meteor falling
    splashMs: 600, // the crown pouring
    travelMs: 650, // each coin's arc out of the impact
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
