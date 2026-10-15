import type { EventMeta } from "../../eventMeta";

// a runner tags the workers
export default {
  label: "Shuttle Run",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    runsMs: [300, 200] as [number, number], // each run out and back, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
