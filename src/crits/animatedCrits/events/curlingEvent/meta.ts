import type { EventMeta } from "../../eventMeta";

// curling stones glide onto the bars
export default {
  label: "Curling",
  style: "wisp",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    slidesMs: [800, 550] as [number, number], // each slide, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
