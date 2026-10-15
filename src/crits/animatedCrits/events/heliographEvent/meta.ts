import type { EventMeta } from "../../eventMeta";

// a mirror flashes sunlight onto the workers
export default {
  label: "Heliograph",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    swingsMs: [220, 120] as [number, number], // each swing, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
