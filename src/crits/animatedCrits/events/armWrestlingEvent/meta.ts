import type { EventMeta } from "../../eventMeta";

// arm-wrestling bouts
export default {
  label: "Arm Wrestling",
  style: "experiment",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    strainMs: [320, 180] as [number, number], // each strain, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
