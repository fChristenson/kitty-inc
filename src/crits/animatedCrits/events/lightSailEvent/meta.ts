import type { EventMeta } from "../../eventMeta";

// beams from below push a sail up into the lock
export default {
  label: "Light Sail",
  style: "beam",
  reward: "a free floor",
  chance: 0.01,
  values: {
    chargeMs: 220,
    riseMs: 1000, // from the first beam to the smash
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
