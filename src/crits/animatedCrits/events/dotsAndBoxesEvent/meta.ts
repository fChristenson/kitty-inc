import type { EventMeta } from "../../eventMeta";

// a self-playing game of dots and boxes, every box bursting into cash
export default {
  label: "Dots and Boxes",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    movesMs: [75, 30] as [number, number], // between moves, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
