import type { EventMeta } from "../../eventMeta";

// the screen's tiles rattle like crockery on a shaking table
export default {
  label: "Rattle",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    hopsMs: [240, 300] as [number, number], // the first and last hop, each higher
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
