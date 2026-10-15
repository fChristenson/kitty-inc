import type { EventMeta } from "../../eventMeta";

// droplets of cash merge into one blob
export default {
  label: "Mercury",
  style: "money",
  chance: 0.01,
  values: {
    spillMs: 380, // the droplets splashing out
    mergeGapMs: 110, // between merges
    slideMs: 240, // each pair sliding together
    flightMs: 380, // the blob shooting into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
