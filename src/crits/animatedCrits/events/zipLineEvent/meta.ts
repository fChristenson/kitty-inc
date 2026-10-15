import type { EventMeta } from "../../eventMeta";

// wisps zip down lines of cash from the total onto the bars
export default {
  label: "Zip Line",
  style: "mix",
  reward: "cash + levels",
  chance: 0.01,
  values: {
    zipsMs: [480, 260] as [number, number], // each zip, quickening
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
