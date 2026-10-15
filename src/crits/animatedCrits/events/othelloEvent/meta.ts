import type { EventMeta } from "../../eventMeta";

// a game of Othello plays itself out
export default {
  label: "Othello",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    movesMs: [90, 30] as [number, number], // between moves, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
