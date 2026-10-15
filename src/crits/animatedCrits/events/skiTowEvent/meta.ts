import type { EventMeta } from "../../eventMeta";

// a cable of cash up the workers
export default {
  label: "Ski Tow",
  style: "mix",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    towMs: 1500, // the tow from the button up into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
