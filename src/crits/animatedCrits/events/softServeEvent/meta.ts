import type { EventMeta } from "../../eventMeta";

// cash piped into a soft-serve swirl
export default {
  label: "Soft Serve",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    pipeMs: 1_300, // the swirl piped, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
