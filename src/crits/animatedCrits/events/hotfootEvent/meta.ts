import type { EventMeta } from "../../eventMeta";

// bullets stitch up to the workers' feet
export default {
  label: "Hotfoot",
  style: "gunfire",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    stitchesMs: [320, 180] as [number, number], // between stitches, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
