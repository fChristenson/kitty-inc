import type { EventMeta } from "../../eventMeta";

// a word game spells MONEY
export default {
  label: "Word Guess",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    showMs: 300, // the board appearing
    flipsMs: [110, 60] as [number, number], // between tile flips, quickening row by row
    rowGapMs: 150, // between rows
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
