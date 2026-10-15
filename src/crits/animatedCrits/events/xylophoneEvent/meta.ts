import type { EventMeta } from "../../eventMeta";

// a mallet plays the bars
export default {
  label: "Xylophone",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    downMs: 230, // each hop down the bars
    upMs: 130, // each hop back up
    levelShare: 0.05, // of a bar's levels, per strike
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
