import type { EventMeta } from "../../eventMeta";

// squares flood open, mines blow
export default {
  label: "Minesweeper",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    waveMs: 46, // per ring of squares opening
    chainMs: 110, // between mines
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
