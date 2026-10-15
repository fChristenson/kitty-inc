import type { EventMeta } from "../../eventMeta";

// electrodes weld along the bars
export default {
  label: "Arc Weld",
  style: "lightning",
  reward: "tiers",
  chance: 0.01,
  values: {
    weldsMs: [460, 300] as [number, number], // each weld, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
