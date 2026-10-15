import type { EventMeta } from "../../eventMeta";

// a turning Möbius strip of cash
export default {
  label: "Mobius",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    formMs: 500, // the band forming
    spinMs: 1_100, // turning, ever faster
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
