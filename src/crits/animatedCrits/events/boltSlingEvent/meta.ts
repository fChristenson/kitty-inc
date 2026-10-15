import type { EventMeta } from "../../eventMeta";

// a slingshot of lightning fires wisps into the bars
export default {
  label: "Bolt Sling",
  style: "lightning",
  reward: "tiers",
  chance: 0.01,
  values: {
    pullMs: [440, 300] as [number, number], // each draw back, quickening
    flyMs: [150, 100] as [number, number], // each shot's flight, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
