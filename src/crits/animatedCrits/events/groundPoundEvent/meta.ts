import type { EventMeta } from "../../eventMeta";

// a bomb leaps and pounds
export default {
  label: "Ground Pound",
  style: "explosion",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    leapsMs: [500, 300] as [number, number], // each leap, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
