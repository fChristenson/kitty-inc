import type { EventMeta } from "../../eventMeta";

// a woodpecker drills the bars
export default {
  label: "Woodpecker",
  style: "wisp",
  reward: "tiers",
  chance: 0.01,
  values: {
    pecksMs: [70, 45] as [number, number], // each peck, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
