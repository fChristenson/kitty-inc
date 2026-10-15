import type { EventMeta } from "../../eventMeta";

// charges blow geysers out of a pool of cash
export default {
  label: "Depth Charges",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    dropsMs: [300, 180] as [number, number], // between drops, quickening
    fallMs: 380, // each charge's fall
    sinkMs: 220, // sinking before it blows
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
