import type { EventMeta } from "../../eventMeta";

// rallies off the top and side walls onto the bars
export default {
  label: "Squash",
  style: "bounce",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    firstMs: 200,
    ralliesMs: [380, 220] as [number, number], // between rallies, quickening
    legMs: [240, 160] as [number, number], // each leg, from the first rally to the last
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
