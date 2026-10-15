import type { EventMeta } from "../../eventMeta";

// a spark leaps spot to spot
export default {
  label: "Spark Jump",
  style: "lightning",
  reward: "hires",
  chance: 0.01,
  values: {
    jumpsMs: [320, 160] as [number, number], // between leaps, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
