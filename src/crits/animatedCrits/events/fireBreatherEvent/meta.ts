import type { EventMeta } from "../../eventMeta";

// a wisp breathes cash on the bars
export default {
  label: "Fire Breather",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    gulpsMs: [300, 200] as [number, number], // each gulp, quickening
    breathMs: 340, // each breath reaching the bars
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
