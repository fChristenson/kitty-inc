import type { EventMeta } from "../../eventMeta";

// torpedoes streak in at the workers
export default {
  label: "Torpedoes",
  style: "explosion",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    gapsMs: [260, 120] as [number, number], // between launches, quickening
    runMs: 450, // each run
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
