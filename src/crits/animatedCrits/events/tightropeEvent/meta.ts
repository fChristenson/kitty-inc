import type { EventMeta } from "../../eventMeta";

// a wisp walks a rope of light over each bar
export default {
  label: "Tightrope",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    crossingsMs: [600, 380] as [number, number], // each crossing, quickening
    levelShare: 0.05, // of the bar's levels, per crossing
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
