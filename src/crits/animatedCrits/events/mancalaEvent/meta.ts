import type { EventMeta } from "../../eventMeta";

// a game of mancala plays itself out
export default {
  label: "Mancala",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    movesMs: [120, 40] as [number, number], // between moves, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
