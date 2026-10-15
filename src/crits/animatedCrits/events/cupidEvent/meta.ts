import type { EventMeta } from "../../eventMeta";

// a cupid shoots arrows at workers
export default {
  label: "Cupid",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    shotsMs: [300, 160] as [number, number], // between arrows, quickening
    flightMs: 380, // each arrow's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
