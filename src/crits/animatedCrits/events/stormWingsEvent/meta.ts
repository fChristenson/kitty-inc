import type { EventMeta } from "../../eventMeta";

// a wisp on wings of lightning beats bolts down onto the bars
export default {
  label: "Storm Wings",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    flyMs: 1_400, // flying over the bars
    diveMs: 260, // diving into the clicked bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
