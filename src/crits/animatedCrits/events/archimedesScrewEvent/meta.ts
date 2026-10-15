import type { EventMeta } from "../../eventMeta";

// cash winds up a turning screw, jetting onto the bars
export default {
  label: "Archimedes Screw",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    streamMs: 800, // cash pouring onto the screw's foot
    climbMs: 1000, // each coin's climb up it
    levelShare: 0.05,
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
