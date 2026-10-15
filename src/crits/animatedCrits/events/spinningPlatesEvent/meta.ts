import type { EventMeta } from "../../eventMeta";

// a juggler keeps plates spinning over the bars, then they drop
export default {
  label: "Spinning Plates",
  style: "wisp",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    dashMs: [240, 120] as [number, number], // between flicks, quickening
    dropsMs: [200, 120] as [number, number], // between plates dropping
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
