import type { EventMeta } from "../../eventMeta";

// a runner trips mines along the bars
export default {
  label: "Minefield",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    layMs: 500, // the mines laid
    runMs: 1_300, // the run, ever faster
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
