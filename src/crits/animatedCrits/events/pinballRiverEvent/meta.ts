import type { EventMeta } from "../../eventMeta";

// a river of cash pinballs off bumpers
export default {
  label: "Pinball River",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    travelMs: 1400,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
