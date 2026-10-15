import type { EventMeta } from "../../eventMeta";

// a river loops round each bar
export default {
  label: "Oxbow",
  style: "money",
  reward: "tiers + cash",
  chance: 0.01,
  values: {
    loopsMs: [700, 480] as [number, number], // each river's run, quickening
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
