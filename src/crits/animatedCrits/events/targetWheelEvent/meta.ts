import type { EventMeta } from "../../eventMeta";

// shots spin a wheel of targets till it flies apart onto the bars
export default {
  label: "Target Wheel",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    shotsMs: [110, 45] as [number, number], // between hits, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
