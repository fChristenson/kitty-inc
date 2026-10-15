import type { EventMeta } from "../../eventMeta";

// a river runs a loop-the-loop round each bar
export default {
  label: "Stunt Track",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    streamMs: 900,
    travelMs: 1500,
    levelShare: 0.04,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
