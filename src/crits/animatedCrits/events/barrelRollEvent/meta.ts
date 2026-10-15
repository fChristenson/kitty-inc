import type { EventMeta } from "../../eventMeta";

// bomb barrels roll down the rows onto the bars
export default {
  label: "Barrel Roll",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    gapsMs: [300, 180] as [number, number], // between barrels, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
