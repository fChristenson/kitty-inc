import type { EventMeta } from "../../eventMeta";

// cash runs through channels down the screen
export default {
  label: "Irrigation",
  style: "money",
  reward: "free hires and cash",
  chance: 0.01,
  values: {
    speed: 1.4, // px per ms
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
