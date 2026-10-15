import type { EventMeta } from "../../eventMeta";

// a superball bounces ever faster
export default {
  label: "Superball",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    bounceMs: 1700, // the bouncing
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
