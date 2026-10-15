import type { EventMeta } from "../../eventMeta";

// a gantry of nozzles sprays a curtain down the screen
export default {
  label: "Car Wash",
  style: "spray",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    sweepMs: 1600, // the gantry rolling down the screen
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
