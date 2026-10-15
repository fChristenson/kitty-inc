import type { EventMeta } from "../../eventMeta";

// a sun wisp rises and its rays blaze across the bars
export default {
  label: "Sunrise",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    riseMs: 700, // the sun rising
    blazeMs: 900, // the rays blazing
    levelShare: 0.06, // of the bar's levels, per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
