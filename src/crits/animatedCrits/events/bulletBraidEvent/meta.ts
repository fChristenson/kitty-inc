import type { EventMeta } from "../../eventMeta";

// braided bullet streams
export default {
  label: "Bullet Braid",
  style: "gunfire",
  reward: "tiers",
  chance: 0.01,
  values: {
    braidsMs: [560, 380] as [number, number], // each braid, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
