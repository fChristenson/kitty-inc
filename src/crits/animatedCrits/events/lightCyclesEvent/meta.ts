import type { EventMeta } from "../../eventMeta";

// two light cycles race walls of light through the bars
export default {
  label: "Light Cycles",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    raceMs: 1_600, // the race
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
