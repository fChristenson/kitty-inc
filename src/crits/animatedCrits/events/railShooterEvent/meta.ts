import type { EventMeta } from "../../eventMeta";

// a gunner on a rail shoots up at the workers
export default {
  label: "Rail Shooter",
  style: "gunfire",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    dropMs: 300, // dropping onto the rail
    runMs: 1_400, // the run, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
