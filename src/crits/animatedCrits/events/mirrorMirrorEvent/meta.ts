import type { EventMeta } from "../../eventMeta";

// the screen folds into a mirrored kaleidoscope
export default {
  label: "Mirror Mirror",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    foldMs: 260, // each half unfolding
    gapMs: 250, // between the folds
    showMs: 350, // the four-way mirror held
    snapMs: 140,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
