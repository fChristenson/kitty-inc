import type { EventMeta } from "../../eventMeta";

// bolts bring new workers to life
export default {
  label: "Spark of Life",
  style: "lightning",
  reward: "hires",
  chance: 0.01,
  values: {
    chargeMs: 450, // sparks crackling before the first bolt
    gapsMs: [360, 180] as [number, number], // between bolts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
