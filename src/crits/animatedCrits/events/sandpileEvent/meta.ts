import type { EventMeta } from "../../eventMeta";

// an Abelian sandpile toppling into a fractal
export default {
  label: "Sandpile",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    stagesMs: [160, 70] as [number, number], // between stages, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
