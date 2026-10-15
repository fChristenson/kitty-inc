import type { EventMeta } from "../../eventMeta";

// a board solves the eight queens by backtracking; they dive onto the bar
export default {
  label: "Eight Queens",
  style: "experiment",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    boardMs: 250, // the board popping in
    stepMs: [50, 16] as [number, number], // each solver step, quickening
    flyGapMs: 45, // between queens diving
    flyMs: 240, // each queen's dive
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
