import type { EventMeta } from "../../eventMeta";

// a plunger sends sparks up wires to charges on the bars
export default {
  label: "Detonator",
  style: "explosion",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    plungeMs: 350, // the plunger's first slam
    againMs: 300, // the last charge to the second slam
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
