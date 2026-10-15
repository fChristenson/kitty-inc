import type { EventMeta } from "../../eventMeta";

// bomb wisps on the locked floor's corners blow it open
export default {
  label: "Demolition",
  style: "explosion",
  reward: "an unlock",
  chance: 0.01,
  values: {
    flyMs: 300, // each charge flying to its corner
    fuseMs: 700, // the fuses burning down
    gapMs: 110, // between the corner blasts
    finalGapMs: 220, // the last corner to the colossal middle charge
    holdMs: 300,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
