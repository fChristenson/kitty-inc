import type { EventMeta } from "../../eventMeta";

// a beam of cash splits into a fan of rivers
export default {
  label: "Prism",
  style: "money",
  chance: 0.01,
  values: {
    streamMs: 900, // the beam pouring
    travelMs: 1_100, // each coin's trip up the beam and round the longest ray
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
