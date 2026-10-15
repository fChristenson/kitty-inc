import type { EventMeta } from "../../eventMeta";

// a beam banks off the screen's edges into the bars
export default {
  label: "Bank Shot",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    legsMs: [220, 110] as [number, number], // each leg, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
