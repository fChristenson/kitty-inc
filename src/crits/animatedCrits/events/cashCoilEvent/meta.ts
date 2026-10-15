import type { EventMeta } from "../../eventMeta";

// a river of coins spirals up round the outside of the building, hidden
// behind it, crashing through each bar it crosses in front, then into the
// total
export default {
  label: "Cash Coil",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 500, // the coins pouring in at the bottom
    climbMs: 1100, // each coin's climb up the coil
    levelShare: 0.01, // levels each time the head crashes through a bar
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
