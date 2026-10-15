import type { EventMeta } from "../../eventMeta";

// cells open at random till an island spans the screen
export default {
  label: "Percolation",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    openMs: 1400, // till the spanning island links up
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
