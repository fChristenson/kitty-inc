import type { EventMeta } from "../../eventMeta";

// a minesweeper board floods open
export default {
  label: "Sweeper",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    spreadMs: 400, // the board dealt
    floodMs: 1_300, // the reveal flooding out
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
