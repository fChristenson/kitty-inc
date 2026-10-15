import type { EventMeta } from "../../eventMeta";

// a spinning top grinds over the bars
export default {
  label: "Spinning Top",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    launchMs: 300, // the top flung in
    spinMs: 1_700, // spinning and wandering
    levelShare: 0.06, // of the bar's levels, per grind
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
