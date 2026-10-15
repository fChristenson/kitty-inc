import type { EventMeta } from "../../eventMeta";

// a compass of beams rings each worker
export default {
  label: "Compass",
  style: "beam",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    sweepsMs: [340, 160] as [number, number], // each circle, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
