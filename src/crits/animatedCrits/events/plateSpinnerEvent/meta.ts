import type { EventMeta } from "../../eventMeta";

// plates of cash spin over the bars
export default {
  label: "Plate Spinner",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    hopsMs: [260, 160] as [number, number], // between plates, quickening
    spinMs: 350, // every plate spinning
    throwsMs: 120, // between plates flying off
    flightMs: 400, // each plate's flight into the total
    levelShare: 0.05, // of the bar's levels, per plate
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
