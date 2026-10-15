import type { EventMeta } from "../../eventMeta";

// notes stream down lanes in a rhythm game
export default {
  label: "Note Highway",
  style: "experiment",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    notesMs: [180, 90] as [number, number], // between notes, quickening
    fallMs: 500, // each note's fall
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
