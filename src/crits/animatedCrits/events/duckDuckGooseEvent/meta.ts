import type { EventMeta } from "../../eventMeta";

// duck, duck, goose!
export default {
  label: "Duck Duck Goose",
  style: "experiment",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    tapsMs: [260, 150] as [number, number], // between taps, quickening
    chaseMs: 420, // the goose's chase
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
