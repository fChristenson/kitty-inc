import type { EventMeta } from "../../eventMeta";

// a tank of cash pumped up high bursts onto the bars
export default {
  label: "Water Tower",
  style: "mix",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    fillMs: 700, // pumping up into the tank
    swellMs: 350, // shuddering full
    levelShare: 0.03, // per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
