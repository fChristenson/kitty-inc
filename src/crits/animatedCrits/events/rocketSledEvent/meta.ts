import type { EventMeta } from "../../eventMeta";

// a sled boosts along the bars
export default {
  label: "Rocket Sled",
  style: "explosion",
  reward: "tiers",
  chance: 0.01,
  values: {
    runsMs: [420, 280] as [number, number], // each run, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
