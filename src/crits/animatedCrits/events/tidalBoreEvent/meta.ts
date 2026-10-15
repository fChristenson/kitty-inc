import type { EventMeta } from "../../eventMeta";

// a wall of cash surges up the screen over the bars
export default {
  label: "Tidal Bore",
  style: "money",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    riseMs: 1300, // the bore racing up the screen
    breakMs: 500, // breaking into the total
    levelShare: 0.03, // per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
