import type { EventMeta } from "../../eventMeta";

// Conway's Game of Life in gold cells, bursting into cash
export default {
  label: "Game of Life",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    gensMs: [170, 70] as [number, number], // between generations, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
