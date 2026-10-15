import type { EventMeta } from "../../eventMeta";

// rows of shells creep up the bars
export default {
  label: "Creeping Barrage",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    firstMs: 380,
    rowsMs: [260, 140] as [number, number], // between rows, quickening
    rippleMs: 45, // between blasts across a row
    fallMs: 380,
    levelShare: 0.04,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
