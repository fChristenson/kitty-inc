import type { EventMeta } from "../../eventMeta";

// mines scuttle to spots and blow
export default {
  label: "Spider Mines",
  style: "explosion",
  reward: "hires",
  chance: 0.01,
  values: {
    scuttleMs: 450, // each mine's scuttle
    chainMs: 130, // between mines blowing
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
