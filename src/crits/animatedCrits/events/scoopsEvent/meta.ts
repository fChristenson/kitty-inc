import type { EventMeta } from "../../eventMeta";

// balls of cash scooped from a tub onto empty spots
export default {
  label: "Scoops",
  style: "mix",
  reward: "free hires and cash",
  chance: 0.01,
  values: {
    fillMs: 500, // filling the tub
    scoopsMs: [320, 180] as [number, number], // between scoops, quickening
    flightMs: 380, // a scoop's flight
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
