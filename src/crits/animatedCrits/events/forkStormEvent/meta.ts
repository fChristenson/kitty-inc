import type { EventMeta } from "../../eventMeta";

// a bolt strikes the top bar and forks 1-2-4-8 down the building, then a
// return stroke shoots up through every bar
export default {
  label: "Fork Storm",
  style: "lightning",
  reward: "levels + crit tier",
  chance: 0.01,
  values: {
    levelShare: 0.005, // levels per strike
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
