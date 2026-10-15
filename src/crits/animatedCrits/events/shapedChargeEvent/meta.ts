import type { EventMeta } from "../../eventMeta";

// rings of charges blow inward onto the bars
export default {
  label: "Shaped Charge",
  style: "explosion",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    fusesMs: [500, 300] as [number, number], // each ring's fuse, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
