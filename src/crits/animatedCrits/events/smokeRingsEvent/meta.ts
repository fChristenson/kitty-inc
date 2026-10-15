import type { EventMeta } from "../../eventMeta";

// rolling rings of cash sail up through the bars
export default {
  label: "Smoke Rings",
  style: "money",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    puffsMs: [380, 220] as [number, number], // between puffs, quickening
    riseMs: 750,
    levelShare: 0.02, // per ring passing a bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
