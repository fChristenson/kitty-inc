import type { EventMeta } from "../../eventMeta";

// wisp rings tossed onto empty spots
export default {
  label: "Ring Toss",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    gapsMs: [300, 160] as [number, number], // between tosses, quickening
    flightMs: 420, // each ring's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
