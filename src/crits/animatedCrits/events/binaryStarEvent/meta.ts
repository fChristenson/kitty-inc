import type { EventMeta } from "../../eventMeta";

// two wisps spiral in, merge and jet into the bars
export default {
  label: "Binary Star",
  style: "wisp",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    spiralMs: 1_300, // the spiral in, quickening
    jetMs: 250, // each jet's flight to its bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
