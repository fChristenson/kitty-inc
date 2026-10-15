import type { EventMeta } from "../../eventMeta";

// hail of cash bounces off the bars
export default {
  label: "Tin Roof",
  style: "bounce",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    barGapMs: 200,
    rainMs: 350, // each bar's hail
    levelShare: 0.04,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
