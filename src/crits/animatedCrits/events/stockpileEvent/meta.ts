import type { EventMeta } from "../../eventMeta";

// cash heaps on bars
export default {
  label: "Stockpile",
  style: "money",
  reward: "cash + levels + tier",
  chance: 0.01,
  values: {
    rainMs: 800, // the cash raining down onto the bars
    soakMs: 160, // each heap sinking into its bar
    gapMs: 140, // between heaps sinking
    eruptMs: 300, // the cash bursting back out of each bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
