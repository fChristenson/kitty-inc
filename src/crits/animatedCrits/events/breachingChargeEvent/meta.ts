import type { EventMeta } from "../../eventMeta";

// charges blow the lock
export default {
  label: "Breaching Charge",
  style: "explosion",
  reward: "unlock",
  chance: 0.01,
  values: {
    setupMs: 300, // the charges flying into place
    chainMs: 90, // between blasts round the ring
    coreMs: 220, // from the core cluster to the main charge
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
