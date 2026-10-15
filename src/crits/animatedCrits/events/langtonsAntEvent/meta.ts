import type { EventMeta } from "../../eventMeta";

// Langton's ant scrawls chaos, then its highway
export default {
  label: "Langton's Ant",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    runMs: 1800, // all its steps, accelerating
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
