import type { EventMeta } from "../../eventMeta";

// bands of light snap down on the bars
export default {
  label: "Rubber Band",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    pullsMs: [420, 220] as [number, number], // each draw back, quickening
    levelShare: 0.04,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
