import type { EventMeta } from "../../eventMeta";

// a bomb rocket drops its stages
export default {
  label: "Multistage",
  style: "explosion",
  reward: "a free floor",
  chance: 0.01,
  values: {
    flightMs: 1600,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
