import type { EventMeta } from "../../eventMeta";

// a wisp mows stripes of cash across the screen
export default {
  label: "Lawnmower",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    stripesMs: [280, 160] as [number, number], // each stripe, quickening
    turnMs: 90, // each turn down into the next stripe
    diveMs: 200, // the mower diving into the total
    flightMs: 340, // each coin's rake into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
