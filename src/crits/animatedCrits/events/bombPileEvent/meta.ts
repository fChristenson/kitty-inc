import type { EventMeta } from "../../eventMeta";

// towers of bombs blow top down
export default {
  label: "Bomb Pile",
  style: "explosion",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    dropsMs: [110, 60] as [number, number], // between drops, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
