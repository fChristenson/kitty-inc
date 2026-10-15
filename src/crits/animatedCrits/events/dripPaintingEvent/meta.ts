import type { EventMeta } from "../../eventMeta";

// cash flicked over the screen like a drip painting
export default {
  label: "Drip Painting",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    gapsMs: [260, 110] as [number, number], // between flicks, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
