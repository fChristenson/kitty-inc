import type { EventMeta } from "../../eventMeta";

// the dragon fractal folds itself out
export default {
  label: "Dragon Curve",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    foldsMs: [240, 90] as [number, number], // each fold, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
