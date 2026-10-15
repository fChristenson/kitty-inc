import type { EventMeta } from "../../eventMeta";

// a wisp blasts itself up the bars
export default {
  label: "Rocket Jump",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    fusesMs: [350, 150] as [number, number], // each fuse, shortening
    flyMs: 300, // each launch
    levelShare: 0.05, // of the bar's levels, per landing
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
