import type { EventMeta } from "../../eventMeta";

// pitches dunk wisps into bars
export default {
  label: "Dunk Tank",
  style: "experiment",
  reward: "tiers",
  chance: 0.01,
  values: {
    pitchesMs: [480, 330] as [number, number], // between pitches, quickening
    flightMs: 280, // each ball's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
