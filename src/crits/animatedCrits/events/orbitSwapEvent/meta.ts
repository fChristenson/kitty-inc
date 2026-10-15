import type { EventMeta } from "../../eventMeta";

// two wisps circle each bar and collide
export default {
  label: "Orbit Swap",
  style: "wisp",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    orbitsMs: [620, 360] as [number, number], // on each bar, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
