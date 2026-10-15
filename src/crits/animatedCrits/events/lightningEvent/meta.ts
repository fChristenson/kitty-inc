import type { EventMeta } from "../../eventMeta";

// bolts crack down onto the button
export default {
  label: "Lightning",
  chance: 0.01,
  values: {
    strikeMs: 110, // each bolt streaking down
    gapMs: [380, 220] as [number, number], // between bolts, quickening
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
