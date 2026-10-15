import type { EventMeta } from "../../eventMeta";

// a wisp winds up and sneezes clouds of gold mist onto the bars
export default {
  label: "Sneeze",
  style: "spray",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    windupMs: 560, // the first wind-up
    gapMs: 560, // between sneezes
    burstMs: 200, // each sneeze
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
