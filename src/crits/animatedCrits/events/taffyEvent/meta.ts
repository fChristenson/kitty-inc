import type { EventMeta } from "../../eventMeta";

// a rope of cash pulled like taffy
export default {
  label: "Taffy",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    lumpMs: 350, // the lump bulging out
    pullsMs: [500, 420, 360, 300], // each pull and fold
    flingMs: 450, // the fling into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
