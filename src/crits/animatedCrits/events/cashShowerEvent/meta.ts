import type { EventMeta } from "../../eventMeta";

// a column of cash showers down onto worker after worker
export default {
  label: "Cash Shower",
  style: "money",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    gapsMs: [300, 140] as [number, number], // between showers, quickening
    streamMs: 280, // each shower pouring
    travelMs: 220, // each coin's fall
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
