import type { EventMeta } from "../../eventMeta";

// the screen seen double
export default {
  label: "Double Vision",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    lurchesMs: [100, 420, 700, 940, 1_140], // each lurch apart
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
