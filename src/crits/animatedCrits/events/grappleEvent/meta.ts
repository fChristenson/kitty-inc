import type { EventMeta } from "../../eventMeta";

// a wisp swings bar to bar
export default {
  label: "Grapple",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    swingsMs: [520, 300] as [number, number], // each swing, quickening
    slamMs: 150, // after letting go of the last bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
