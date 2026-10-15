import type { EventMeta } from "../../eventMeta";

// a showerhead sprays rivers of cash onto empty spots
export default {
  label: "Showerhead",
  style: "money",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    riseMs: 300, // the showerhead rising
    streamMs: 700, // each river pouring
    travelMs: 550, // each coin's trip down
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
