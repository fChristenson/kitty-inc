import type { EventMeta } from "../../eventMeta";

// the screen melts like wax
export default {
  label: "Melt",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    meltMs: 1_700, // sagging, before it snaps back
    drips: 5, // cash dripping off the deepest sag
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
