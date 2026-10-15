import type { EventMeta } from "../../eventMeta";

// crosses of light win a game of noughts and crosses
export default {
  label: "Tic-Tac-Toe",
  style: "experiment",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    gridMs: 400, // the grid slashed in
    movesMs: [380, 240] as [number, number], // between moves, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
