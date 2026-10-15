import type { EventMeta } from "../../eventMeta";

// a spiral of charges chains out
export default {
  label: "Spiral Charge",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    setupMs: 300, // the charges flying into place
    chainMs: 110, // between blasts round the spiral
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
