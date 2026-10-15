import type { EventMeta } from "../../eventMeta";

// a storm of cash blows across the screen, over the workers
export default {
  label: "Sandstorm",
  style: "money",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    streamMs: 800, // the storm blowing in
    crossMs: 650, // a coin's run across, at its base speed
    flightMs: 350, // whirling up into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
