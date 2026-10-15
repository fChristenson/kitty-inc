import type { EventMeta } from "../../eventMeta";

// cash spills bar to bar
export default {
  label: "Terraces",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    pourMs: 500, // the column from the sky onto the top bar
    fallsMs: [380, 220] as [number, number], // each spill onto the next bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
