import type { EventMeta } from "../../eventMeta";

// a river of cash threads the bars
export default {
  label: "Stitch",
  style: "mix",
  reward: "cash + levels",
  chance: 0.01,
  values: {
    travelMs: 1_300, // the needle's run through every bar
    streamMs: 700, // the river pouring after it
    levelShare: 0.1, // of each bar's levels
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
