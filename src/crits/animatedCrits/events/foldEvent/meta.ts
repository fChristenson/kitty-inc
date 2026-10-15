import type { EventMeta } from "../../eventMeta";

// the screen folds up like paper
export default {
  label: "Fold",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    foldMs: 320, // each fold
    gapMs: 180, // between the folds
    holdOpenMs: 220, // folded up, before springing open
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
