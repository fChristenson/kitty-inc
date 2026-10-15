import type { EventMeta } from "../../eventMeta";

// two rivers of cash smash head-on over each bar
export default {
  label: "Head-On",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    crashesMs: [420, 240] as [number, number], // between crashes, quickening
    travelMs: [420, 300] as [number, number], // each river's rush in, quickening
    levelShare: 0.04,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
