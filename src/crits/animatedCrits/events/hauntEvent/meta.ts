import type { EventMeta } from "../../eventMeta";

// a ghost wisp swoops through the workers
export default {
  label: "Haunt",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    hauntMs: 1_700, // the haunting, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
