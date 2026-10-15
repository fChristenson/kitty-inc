import type { EventMeta } from "../../eventMeta";

// rows of kegs chain along the bars, clusters jumping row to row
export default {
  label: "Powder Kegs",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    chainsMs: [140, 80] as [number, number], // between kegs on a row, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
