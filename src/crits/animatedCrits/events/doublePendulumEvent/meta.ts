import type { EventMeta } from "../../eventMeta";

// a chaotic double pendulum whips the workers
export default {
  label: "Double Pendulum",
  style: "wisp",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    flailMs: 1800,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
