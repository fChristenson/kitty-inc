import type { EventMeta } from "../../eventMeta";

// wisp notes play a tune on a staff
export default {
  label: "Sheet Music",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    staffMs: 300, // the staff drawn in
    tuneMs: 1_300, // the tune, ever faster
    chordMs: 300, // the closing chord
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
