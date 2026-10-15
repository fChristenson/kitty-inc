import type { EventMeta } from "../../eventMeta";

// a nozzle sprays seed-mist on each empty spot till a worker sprouts
export default {
  label: "Hydroseeder",
  style: "spray",
  reward: "free hires",
  chance: 0.01,
  values: {
    passesMs: [170, 100] as [number, number], // each pass of a spot, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
