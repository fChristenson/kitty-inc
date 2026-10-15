import type { EventMeta } from "../../eventMeta";

// a stone skips down the bars
export default {
  label: "Skipping Stone",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    skipsMs: [340, 160] as [number, number], // each skip, shortening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
