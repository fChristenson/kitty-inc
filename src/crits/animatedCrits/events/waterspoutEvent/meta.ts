import type { EventMeta } from "../../eventMeta";

// a spout of cash climbs into the lock
export default {
  label: "Waterspout",
  style: "money",
  reward: "a free floor",
  chance: 0.01,
  values: {
    climbMs: 1300,
    holdMs: 500,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
