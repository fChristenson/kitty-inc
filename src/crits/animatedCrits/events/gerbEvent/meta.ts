import type { EventMeta } from "../../eventMeta";

// a bomb fountain on each bar spurts bomblets, then blows
export default {
  label: "Gerb",
  style: "explosion",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    dropMs: 160,
    spurtsMs: [90, 60] as [number, number], // between spurts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
