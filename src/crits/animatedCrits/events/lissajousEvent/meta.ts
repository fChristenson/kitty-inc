import type { EventMeta } from "../../eventMeta";

// a Lissajous figure over the bars
export default {
  label: "Lissajous",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    traceMs: 1700, // the figure, quickening
    levelShare: 0.03, // of a bar's levels, per crossing
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
