import type { EventMeta } from "../../eventMeta";

// a tumbling gun fires at every bar it swings past
export default {
  label: "Tumble Fire",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    fallMs: 1600,
    levelShare: 0.02, // per burst
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
