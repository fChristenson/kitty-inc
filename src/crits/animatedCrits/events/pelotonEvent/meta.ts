import type { EventMeta } from "../../eventMeta";

// a pack of wisps races end to end along the bars
export default {
  label: "Peloton",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    levelShare: 0.03, // per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
