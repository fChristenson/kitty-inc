import type { EventMeta } from "../../eventMeta";

// a loading bar fills with cash
export default {
  label: "Loading Bar",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    frameMs: 350, // the frame drawing itself
    stallsMs: [200, 60] as [number, number], // each stall, shortening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
