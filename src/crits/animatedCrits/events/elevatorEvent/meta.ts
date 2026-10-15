import type { EventMeta } from "../../eventMeta";

// a column of cash climbs a shaft, branching into every bar
export default {
  label: "Elevator",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    riseMs: 1_300, // the column climbing to the top bar
    branchMs: 260, // each branch's run into its bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
