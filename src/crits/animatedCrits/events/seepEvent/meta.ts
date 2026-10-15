import type { EventMeta } from "../../eventMeta";

// cash seeps down the walls and pools under the workers
export default {
  label: "Seep",
  style: "money",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    gapsMs: [280, 140] as [number, number], // between seeps, quickening
    streamMs: 500, // each seep trickling
    travelMs: 700, // each coin's trip down the wall
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
