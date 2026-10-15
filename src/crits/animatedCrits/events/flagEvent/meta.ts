import type { EventMeta } from "../../eventMeta";

// the screen ripples like a flag
export default {
  label: "Flag",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    waveMs: 1_900, // the ripple growing, then snapping straight
    gusts: 5, // crests flinging cash
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
