import type { EventMeta } from "../../eventMeta";

// a coral of light grows out of the button by diffusion-limited aggregation
export default {
  label: "Coral",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    growMs: 1500, // the coral growing
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
