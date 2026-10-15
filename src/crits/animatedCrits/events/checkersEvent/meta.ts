import type { EventMeta } from "../../eventMeta";

// multi-jumps bar to bar, king me
export default {
  label: "Checkers",
  style: "experiment",
  reward: "tiers",
  chance: 0.01,
  values: {
    hopsMs: [170, 110] as [number, number], // each hop, quickening
    cascadeMs: 110, // between tiers after "KING ME!"
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
