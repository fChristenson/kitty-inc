import type { EventMeta } from "../../eventMeta";

// a tape of light measures the bars
export default {
  label: "Tape Measure",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    pullsMs: [300, 160] as [number, number], // each pull, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
