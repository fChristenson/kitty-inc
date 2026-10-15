import type { EventMeta } from "../../eventMeta";

// a ball of cash bounds round the screen with a wisp inside
export default {
  label: "Zorb",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    gatherMs: 260,
    bounceMs: 1400,
    flightMs: 380, // up into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
