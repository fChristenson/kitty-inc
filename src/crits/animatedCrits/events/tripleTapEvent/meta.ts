import type { EventMeta } from "../../eventMeta";

// three gunners fire on each empty spot
export default {
  label: "Triple Tap",
  style: "gunfire",
  reward: "hires",
  chance: 0.01,
  values: {
    aimsMs: [300, 140] as [number, number], // each aim, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
