import type { EventMeta } from "../../eventMeta";

// comic-book sound effects slam over every reward
export default {
  label: "Comic Book",
  style: "experiment",
  reward: "mixed rewards",
  chance: 0.01,
  values: {
    gapsMs: [330, 160] as [number, number], // between hits, quickening
    levelShare: 0.1, // of a bar's levels
    holdMs: 800,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
