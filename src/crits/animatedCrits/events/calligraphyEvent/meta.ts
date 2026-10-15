import type { EventMeta } from "../../eventMeta";

// a brush wisp paints strokes of cash
export default {
  label: "Calligraphy",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    strokesMs: [420, 300] as [number, number], // each stroke, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
