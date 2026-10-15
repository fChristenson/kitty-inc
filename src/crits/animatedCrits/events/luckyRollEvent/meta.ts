import type { EventMeta } from "../../eventMeta";

// dice rolls and ladders up the bars
export default {
  label: "Lucky Roll",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    rollMs: 180, // the dice call before hopping
    hopMs: 60, // each hop
    climbMs: 200, // each ladder climb
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
