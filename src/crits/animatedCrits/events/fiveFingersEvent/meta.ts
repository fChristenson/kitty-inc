import type { EventMeta } from "../../eventMeta";

// a hand of bolts reaches down onto the empty spots
export default {
  label: "Five Fingers",
  style: "lightning",
  reward: "hires",
  chance: 0.01,
  values: {
    reachMs: 520, // the first finger's crawl down
    fingerMs: [260, 140] as [number, number], // between fingers, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
