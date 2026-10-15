import type { EventMeta } from "../../eventMeta";

// a loop of light lassoes the workers
export default {
  label: "Laser Lasso",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    riseMs: 250, // the roper rising
    throwsMs: [600, 360] as [number, number], // each throw, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
