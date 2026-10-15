import type { EventMeta } from "../../eventMeta";

// bolts crack down on a fleeing wisp's heels
export default {
  label: "Storm Chaser",
  style: "lightning",
  reward: "worker tiers + levels + a crit tier",
  chance: 0.01,
  values: {
    runMs: 1_700, // the wisp's run, picking up speed
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
