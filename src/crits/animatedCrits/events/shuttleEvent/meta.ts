import type { EventMeta } from "../../eventMeta";

// a ball shuttles up and down between each pair of bars
export default {
  label: "Shuttle",
  style: "bounce",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    legMs: [200, 90] as [number, number], // each leg, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
