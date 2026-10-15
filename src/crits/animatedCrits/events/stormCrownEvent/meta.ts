import type { EventMeta } from "../../eventMeta";

// a crown of wisps hurls bolts into the bars
export default {
  label: "Storm Crown",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    volleysMs: [500, 300] as [number, number], // each bar's volley, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
