import type { EventMeta } from "../../eventMeta";

// cash blooms into a sand mandala
export default {
  label: "Mandala",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    gapsMs: [180, 80] as [number, number], // between rings, quickening
    bloomMs: 300, // each ring blooming out
    sweepMs: 350, // the mandala swept inward
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
