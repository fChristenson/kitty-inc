import type { EventMeta } from "../../eventMeta";

// the screen gilds bar by bar
export default {
  label: "Gold Leaf",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    dartsMs: [360, 200] as [number, number], // each bar, quickening
    levelShare: 0.04,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
