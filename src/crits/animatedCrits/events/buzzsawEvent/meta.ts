import type { EventMeta } from "../../eventMeta";

// a buzzsaw of beams grinds into the bars
export default {
  label: "Buzzsaw",
  style: "beam",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    rollMs: 250, // each roll to a bar
    grindsMs: [450, 250] as [number, number], // each grind, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
