import type { EventMeta } from "../../eventMeta";

// breathe in coins, puff out cash
export default {
  label: "Bellows",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    pumpsMs: [480, 320] as [number, number], // each pump, quickening
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
