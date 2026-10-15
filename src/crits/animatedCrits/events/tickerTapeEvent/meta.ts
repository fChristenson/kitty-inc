import type { EventMeta } from "../../eventMeta";

// bands of cash race across the screen
export default {
  label: "Ticker Tape",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    bandsMs: [300, 180] as [number, number], // between bands, quickening
    crossMs: 420, // each band crossing
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
