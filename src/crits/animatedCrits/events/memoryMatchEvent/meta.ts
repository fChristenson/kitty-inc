import type { EventMeta } from "../../eventMeta";

// matched card pairs fire wisps at the workers
export default {
  label: "Memory Match",
  style: "experiment",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    dealMs: 400, // the cards dealt
    turnsMs: [400, 220] as [number, number], // between turns, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
