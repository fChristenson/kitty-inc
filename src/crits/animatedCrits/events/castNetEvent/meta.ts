import type { EventMeta } from "../../eventMeta";

// nets of cash cast over the workers
export default {
  label: "Cast Net",
  style: "mix",
  reward: "worker perma tiers + cash",
  chance: 0.01,
  values: {
    formMs: 200,
    whirlsMs: [300, 160] as [number, number], // each whirl before a cast, quickening
    flightMs: 420,
    cinchMs: 120,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
