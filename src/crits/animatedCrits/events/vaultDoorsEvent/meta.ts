import type { EventMeta } from "../../eventMeta";

// the screen opens like vault doors
export default {
  label: "Vault Doors",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    clunkMs: 500, // the bolts clunking back
    openMs: 350,
    floodMs: 600, // cash flooding out
    slamMs: 220,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
