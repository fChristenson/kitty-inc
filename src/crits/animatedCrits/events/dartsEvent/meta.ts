import type { EventMeta } from "../../eventMeta";

// darts thrown at a board of light
export default {
  label: "Darts",
  style: "experiment",
  reward: "tiers",
  chance: 0.01,
  values: {
    throwsMs: [480, 340] as [number, number], // between throws, quickening
    flightMs: 280, // each dart's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
