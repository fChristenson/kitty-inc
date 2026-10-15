import type { EventMeta } from "../../eventMeta";

// guns along the top rain volleys down onto the bars
export default {
  label: "Bullet Rain",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    firstMs: 150,
    volleysMs: [360, 220] as [number, number], // between volleys, quickening
    downpourGapMs: 180,
    levelShare: 0.02, // per volley
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
