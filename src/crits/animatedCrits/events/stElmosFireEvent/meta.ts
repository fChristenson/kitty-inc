import type { EventMeta } from "../../eventMeta";

// crackling coronas build round the workers until bolts strike
export default {
  label: "St. Elmo's Fire",
  style: "lightning",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    coronaMs: 500, // each corona building
    gapsMs: [300, 150] as [number, number], // between workers, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
