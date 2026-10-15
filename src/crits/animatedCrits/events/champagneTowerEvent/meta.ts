import type { EventMeta } from "../../eventMeta";

// cash cascades down a tower of glasses
export default {
  label: "Champagne Tower",
  style: "money",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    pourMs: 500,
    fillMs: 260, // each tier filling
    levelShare: 0.04,
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
