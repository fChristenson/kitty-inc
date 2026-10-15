import type { EventMeta } from "../../eventMeta";

// sparks race along circuit traces to the bars
export default {
  label: "Circuit Board",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    tracesMs: [450, 260] as [number, number], // each trace, quickening
    levelShare: 0.05, // of the bar's levels, per trace
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
