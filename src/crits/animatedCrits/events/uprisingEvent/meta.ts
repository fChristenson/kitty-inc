import type { EventMeta } from "../../eventMeta";

// walls of cash climb the screen's sides and crash together at the top
export default {
  label: "Uprising",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    riseMs: 1_000, // the walls climbing, ever faster
    curlMs: 300, // curling over to meet in the middle
    flightMs: 380, // each coin's pour into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
