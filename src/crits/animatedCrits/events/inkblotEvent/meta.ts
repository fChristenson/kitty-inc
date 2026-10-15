import type { EventMeta } from "../../eventMeta";

// mirrored blots of cash, folded shut
export default {
  label: "Inkblot",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    gapsMs: [220, 90] as [number, number], // between blots, quickening
    bloomMs: 300, // each blot blooming
    foldMs: 220, // the halves folding shut
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
