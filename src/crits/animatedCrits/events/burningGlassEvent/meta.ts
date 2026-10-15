import type { EventMeta } from "../../eventMeta";

// focused light scorches the bars and ignites the clicked one
export default {
  label: "Burning Glass",
  style: "beam",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    focusMs: 350, // the shaft narrowing to a point
    legsMs: [340, 200] as [number, number], // hunting to each bar, quickening
    igniteMs: 450, // focusing down on the clicked bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
