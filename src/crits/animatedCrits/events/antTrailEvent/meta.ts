import type { EventMeta } from "../../eventMeta";

// ants carry crumbs of cash to the total
export default {
  label: "Ant Trail",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    marchMs: 1_300, // ants setting off, ever thicker
    travelMs: 700, // each ant's march
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
