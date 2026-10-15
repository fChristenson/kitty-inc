import type { EventMeta } from "../../eventMeta";

// a roman candle pops bombs onto the bars
export default {
  label: "Roman Candle",
  style: "explosion",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    popsMs: [260, 140] as [number, number], // between pops, quickening
    flightMs: 450, // each bomb's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
