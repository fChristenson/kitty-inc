import type { EventMeta } from "../../eventMeta";

// cash pours into a well and wishes leap onto workers
export default {
  label: "Make a Wish",
  style: "mix",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    pourMs: 600, // the river pouring into the well
    travelMs: 420, // each coin's trip down it
    wishesMs: [240, 140] as [number, number], // between wishes, quickening
    flightMs: 340, // each wish's leap
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
