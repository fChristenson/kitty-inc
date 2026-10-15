import type { EventMeta } from "../../eventMeta";

// archers rain volleys onto bars
export default {
  label: "Arrow Volley",
  style: "wisp",
  reward: "tiers",
  chance: 0.01,
  values: {
    volleysMs: [480, 360] as [number, number], // between volleys, quickening
    flightMs: 420, // each arrow's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
