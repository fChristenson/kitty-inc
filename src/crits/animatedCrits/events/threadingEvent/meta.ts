import type { EventMeta } from "../../eventMeta";

// a river of coins coils round each bar like a spiral binding, down the
// building, every front pass a blast, then into the total
export default {
  label: "Threading",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 400, // the coins pouring onto the path
    pathMs: 1500, // each coin's run from the top bar to the total
    levelShare: 0.006, // levels each time the head passes over a bar's front
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
