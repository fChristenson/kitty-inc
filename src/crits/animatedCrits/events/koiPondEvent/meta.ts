import type { EventMeta } from "../../eventMeta";

// koi leap out of a pond of cash onto the workers
export default {
  label: "Koi Pond",
  style: "mix",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    floodMs: 450, // the pond flooding
    gapsMs: [280, 130] as [number, number], // between leaps, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
