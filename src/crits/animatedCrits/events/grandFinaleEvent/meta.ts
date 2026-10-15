import type { EventMeta } from "../../eventMeta";

// chain, cluster shells, salvo
export default {
  label: "Grand Finale",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    riseMs: 300, // each shell's climb
    chainMs: 90, // between blasts along the row
    clusterMs: 170, // between cluster shells
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
