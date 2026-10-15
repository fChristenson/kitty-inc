import type { EventMeta } from "../../eventMeta";

// a radar sweep pings the workers
export default {
  label: "Radar",
  style: "experiment",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    dimMs: 250, // the screen dimming to a scope
    sweepMs: 1_800, // the sweep, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
