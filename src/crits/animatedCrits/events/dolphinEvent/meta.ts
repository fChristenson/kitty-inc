import type { EventMeta } from "../../eventMeta";

// a dolphin leaps from a river of cash up to the bars
export default {
  label: "Dolphin",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    leapsMs: [400, 260] as [number, number], // each leap, quickening
    streamMs: 1_500, // the river pouring
    travelMs: 1_400, // each coin's trip along the bottom
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
