import type { EventMeta } from "../../eventMeta";

// a pyramid of bombs blows from the bottom up
export default {
  label: "Bomb Stack",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    stackMs: 600, // the stack piling up
    blowsMs: [350, 250] as [number, number], // between rows, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
