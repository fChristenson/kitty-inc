import type { EventMeta } from "../../eventMeta";

// a turret rakes a stream of bullets along each bar
export default {
  label: "Spray and Pray",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    firstMs: 200,
    shotsMs: [45, 25] as [number, number], // between shots, quickening
    wildGapMs: 150,
    levelShare: 0.02, // per sweep
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
