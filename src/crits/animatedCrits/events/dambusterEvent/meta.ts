import type { EventMeta } from "../../eventMeta";

// a bomb skips across the bottom
export default {
  label: "Dambuster",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    lobMs: 400, // the lob down
    skipsMs: 1_400, // every skip
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
