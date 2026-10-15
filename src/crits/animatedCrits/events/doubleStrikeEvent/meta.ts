import type { EventMeta } from "../../eventMeta";

// lightning strikes each worker twice
export default {
  label: "Double Strike",
  style: "lightning",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    gapsMs: [300, 150] as [number, number], // between workers, quickening
    waitMs: 260, // from the leader to the strike
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
