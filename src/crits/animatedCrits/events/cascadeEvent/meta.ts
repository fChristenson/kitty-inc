import type { EventMeta } from "../../eventMeta";

// blasts cascade down the screen
export default {
  label: "Cascade",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    chainMs: 130, // between blasts along the top row
    fallMs: 300, // each bomblet's fall
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
