import type { EventMeta } from "../../eventMeta";

// tossed wisps sliced into coins
export default {
  label: "Ninja",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    tossesMs: [200, 90] as [number, number], // between tosses, quickening
    flightMs: 800, // each toss's flight
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
