import type { EventMeta } from "../../eventMeta";

// a can kept hopping by gunfire is knocked onto the bars
export default {
  label: "Tin Can",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    hopsMs: [320, 200] as [number, number], // each hop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
