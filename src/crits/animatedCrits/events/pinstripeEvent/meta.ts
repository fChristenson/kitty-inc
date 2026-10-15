import type { EventMeta } from "../../eventMeta";

// rivers of cash shoot across along the bars
export default {
  label: "Pinstripe",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    gapsMs: [260, 140] as [number, number], // between stripes, quickening
    streamMs: 500, // each stripe pouring
    travelMs: 600, // each coin's trip across
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
