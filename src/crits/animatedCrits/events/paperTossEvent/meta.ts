import type { EventMeta } from "../../eventMeta";

// bank shots into bins
export default {
  label: "Paper Toss",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    tossesMs: [300, 180] as [number, number], // between tosses, quickening
    flightMs: 480, // each toss
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
