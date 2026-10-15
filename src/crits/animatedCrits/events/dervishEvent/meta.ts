import type { EventMeta } from "../../eventMeta";

// a spinning gunner snaps shots at the workers
export default {
  label: "Dervish",
  style: "gunfire",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    whirlMs: 350, // the gunner whirling out
    spinMs: 1_400, // the spin, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
